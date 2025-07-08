
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, addLotToInventoryItem, Patient } from '@/lib/data';
import type { InventoryItem, LotDetail, LiorenProduct } from '@/lib/types';
import { PlusCircle, Search, Edit, Box, Trash2, MoreVertical, DollarSign, Package, PackageX, AlertTriangle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, Calendar as CalendarIcon, Download, Info } from 'lucide-react';
import { format, differenceInDays, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InventoryItemForm } from './inventory-item-form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '../ui/alert';

const EXPIRY_THRESHOLD_DAYS = 90;

type InventoryItemWithStats = InventoryItem & {
  status: 'OK' | 'Stock Bajo' | 'Agotado' | 'Próximo a Vencer' | 'Vencido';
  nextExpiryDate?: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
};

type FilterStatus = 'all' | 'OK' | 'Stock Bajo' | 'Agotado' | 'Próximo a Vencer' | 'Vencido';


const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{value}</div>
        </CardContent>
    </Card>
);

const InventoryActions = ({ 
    item, 
    onManageLots, 
    onEdit, 
    onDelete 
}: { 
    item: InventoryItemWithStats; 
    onManageLots: (item: InventoryItemWithStats) => void;
    onEdit: (item: InventoryItem) => void;
    onDelete: (item: InventoryItem) => void;
}) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onManageLots(item)}>
            <Box className="mr-2 h-4 w-4" />
            <span>Gestionar Lotes</span>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => onEdit(item)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar Producto</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-500 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar Producto</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
};

function LotManagementDialog({ 
  item, 
  isOpen, 
  onOpenChange, 
  onLotAdded 
}: { 
  item: InventoryItem | null; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onLotAdded: () => void;
}) {
  const { toast } = useToast();
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newLotQuantity, setNewLotQuantity] = useState('');
  const [newLotExpiry, setNewLotExpiry] = useState<Date | undefined>();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNewLot = async () => {
    if (!item || !newLotNumber || !newLotQuantity || !newLotExpiry) {
        toast({ title: 'Error', description: 'Todos los campos son requeridos para añadir un lote.', variant: 'destructive' });
        return;
    }
    setIsAdding(true);
    try {
        const newLot: LotDetail = {
            lotNumber: newLotNumber,
            quantity: parseInt(newLotQuantity, 10),
            expiryDate: newLotExpiry.toISOString(),
        };
        await addLotToInventoryItem(item.id, newLot);
        toast({ title: 'Lote Añadido', description: 'El nuevo lote se ha guardado y el stock ha sido actualizado.' });
        onLotAdded();
        setNewLotNumber('');
        setNewLotQuantity('');
        setNewLotExpiry(undefined);
    } catch (error) {
        toast({ title: 'Error al Añadir Lote', description: error instanceof Error ? error.message : 'Ocurrió un error.', variant: 'destructive' });
    } finally {
        setIsAdding(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
        setNewLotNumber('');
        setNewLotQuantity('');
        setNewLotExpiry(undefined);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lotes de: <span className="text-primary">{item?.name}</span></DialogTitle>
          <DialogDescription>Añada nuevos lotes al inventario o revise los existentes.</DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 max-h-60 overflow-y-auto pr-4 border-b pb-4">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>N° Lote</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {item?.lots && item.lots.length > 0 && item.lots.filter(l => l.quantity > 0).length > 0 ? (
                    item.lots.filter(l => l.quantity > 0).sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()).map(lot => (
                        <TableRow key={lot.lotNumber}>
                        <TableCell className="font-mono">{lot.lotNumber}</TableCell>
                        <TableCell>{lot.quantity}</TableCell>
                        <TableCell>{format(parseISO(lot.expiryDate), 'dd-MM-yyyy')}</TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">No hay lotes con stock para este producto.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

        <div className="space-y-4 pt-4">
            <h4 className="font-semibold">Añadir Nuevo Lote</h4>
            <div className="grid gap-4">
                <div className="space-y-1">
                    <Label htmlFor="new-lot-number">Número de Lote *</Label>
                    <Input id="new-lot-number" value={newLotNumber} onChange={(e) => setNewLotNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="new-lot-quantity">Cantidad *</Label>
                        <Input id="new-lot-quantity" type="number" value={newLotQuantity} onChange={(e) => setNewLotQuantity(e.target.value)} />
                    </div>
                     <div className="space-y-1">
                        <Label>Vencimiento *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newLotExpiry && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newLotExpiry ? format(newLotExpiry, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newLotExpiry} onSelect={setNewLotExpiry} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </div>
             </div>
             <DialogFooter className="pt-4">
                 <Button onClick={handleAddNewLot} disabled={isAdding || !newLotNumber || !newLotQuantity || !newLotExpiry} className="w-full">
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Añadir Lote
                </Button>
             </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function InventoryClient({ 
  initialInventory,
  liorenData,
  patients
}: { 
  initialInventory: InventoryItem[];
  liorenData: { products: LiorenProduct[], error: string | null };
  patients: Patient[];
}) {
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const { toast } = useToast();

    const [managingLotsFor, setManagingLotsFor] = useState<InventoryItemWithStats | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | Partial<InventoryItem> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

    const [liorenSearchTerm, setLiorenSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const refreshLocalData = async () => {
        setLoading(true);
        try {
            const data = await getInventory();
            setInventory(data);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar el inventario local.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (item: InventoryItem | Partial<InventoryItem> | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleImportFromLioren = (liorenProduct: LiorenProduct) => {
        const partialItem: Partial<InventoryItem> = {
            name: liorenProduct.nombre,
            sku: liorenProduct.codigo,
            inventoryType: 'Venta Directa',
            unit: liorenProduct.unidad,
            costPrice: liorenProduct.preciocompraneto,
            salePrice: liorenProduct.precioventabruto,
        };
        handleOpenForm(partialItem);
    }

    const handleFormFinished = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        refreshLocalData();
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await deleteInventoryItem(itemToDelete.id);
            toast({ title: "Producto Eliminado", description: "El producto ha sido eliminado del inventario local." });
            setItemToDelete(null);
            refreshLocalData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "destructive" });
        }
    };
    
    const inventoryWithStats = useMemo<InventoryItemWithStats[]>(() => {
        return inventory.map(item => {
            const now = new Date();
            const lots = item.lots || [];
            const sortedLots = [...lots].filter(lot => lot.quantity > 0 && lot.expiryDate).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
            const nextExpiryDate = sortedLots.length > 0 ? sortedLots[0].expiryDate : undefined;
            
            let isExpired = false;
            let isExpiringSoon = false;

            if (nextExpiryDate) {
                try {
                    const expiryDateObj = parseISO(nextExpiryDate);
                    isExpired = isBefore(expiryDateObj, now);
                    isExpiringSoon = differenceInDays(expiryDateObj, now) <= EXPIRY_THRESHOLD_DAYS && !isExpired;
                } catch {}
            }

            let status: InventoryItemWithStats['status'] = 'OK';
            if (isExpired) status = 'Vencido';
            else if (item.quantity <= 0) status = 'Agotado';
            else if (isExpiringSoon) status = 'Próximo a Vencer';
            else if (item.quantity < item.lowStockThreshold) status = 'Stock Bajo';
            
            return { ...item, status, nextExpiryDate, isExpiringSoon, isExpired };
        });
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        return inventoryWithStats.filter(item => {
            const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
            const matchesSearch = searchTerm === '' ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesFilter && matchesSearch;
        })
    }, [inventoryWithStats, activeFilter, searchTerm]);

    const filteredLiorenInventory = useMemo(() => {
        if (!liorenData.products) return [];
        return liorenData.products.filter(p => 
            p.nombre && p.nombre.toLowerCase().includes(liorenSearchTerm.toLowerCase())
        );
    }, [liorenData.products, liorenSearchTerm]);

    const globalStats = useMemo(() => {
        const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
        const lowStockCount = inventoryWithStats.filter(item => item.status === 'Stock Bajo').length;
        const outOfStockCount = inventoryWithStats.filter(item => item.status === 'Agotado').length;
        const expiringSoonCount = inventoryWithStats.filter(item => item.status === 'Próximo a Vencer').length;
        
        return {
            totalValue: `$${totalValue.toLocaleString('es-CL')}`,
            lowStockCount,
            outOfStockCount,
            expiringSoonCount
        }
    }, [inventory, inventoryWithStats]);

    const handleManageLots = (item: InventoryItemWithStats) => {
        setManagingLotsFor(item);
    };

    return (
        <>
            <LotManagementDialog 
                item={managingLotsFor}
                isOpen={!!managingLotsFor}
                onOpenChange={(open) => { if (!open) setManagingLotsFor(null); }}
                onLotAdded={refreshLocalData}
            />
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{(editingItem && 'id' in editingItem) ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                        { (editingItem && 'id' in editingItem) ? 'Modifique los detalles del producto en el inventario local.' : 'Añada un nuevo producto al inventario local.'}
                    </DialogDescription>
                </DialogHeader>
                <InventoryItemForm onFinished={handleFormFinished} itemToEdit={editingItem || undefined} patients={patients} />
              </DialogContent>
            </Dialog>

             <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el producto <span className="font-bold">{itemToDelete?.name}</span> del inventario local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Gestión de Inventario</h1>
                    <p className="text-sm text-muted-foreground">
                        Control logístico y trazabilidad de los insumos de la farmacia.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="local">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="local">Inventario Local (Skol)</TabsTrigger>
                <TabsTrigger value="external">Inventario Externo (Lioren)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="local" className="mt-6 space-y-6">
                <div className="flex justify-start">
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Crear Producto Local
                    </Button>
                </div>
                <div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                        <StatCard title="Valor Total del Inventario" value={globalStats.totalValue} icon={DollarSign} />
                        <StatCard title="Ítems con Stock Bajo" value={globalStats.lowStockCount} icon={Package} />
                        <StatCard title="Ítems Agotados" value={globalStats.outOfStockCount} icon={PackageX} />
                        <StatCard title="Ítems Próximos a Vencer" value={globalStats.expiringSoonCount} icon={AlertTriangle} />
                    </div>

                    <Card className="mb-6">
                        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Buscar por nombre o SKU..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {(['all', 'OK', 'Stock Bajo', 'Agotado', 'Próximo a Vencer', 'Vencido'] as FilterStatus[]).map(status => (
                                    <Button key={status} variant={activeFilter === status ? 'default' : 'outline'} onClick={() => setActiveFilter(status)} className="text-xs sm:text-sm whitespace-nowrap">{status === 'all' ? 'Todos' : status}</Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? ( <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : filteredInventory.length === 0 ? (
                        <Card className="text-center py-16 mt-8 shadow-none border-dashed"><div className="flex flex-col items-center justify-center"><Package className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold text-foreground">No se encontraron productos locales</h2><p className="text-muted-foreground mt-2 max-w-sm">Intenta ajustar tu búsqueda o crea un nuevo producto.</p></div></Card>
                    ) : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Tipo</TableHead><TableHead>Stock Total</TableHead><TableHead>Próximo Vto.</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => {
                                    const statusStyles: Record<InventoryItemWithStats['status'], string> = { 'OK': 'text-green-600', 'Stock Bajo': 'text-yellow-600', 'Agotado': 'text-red-600', 'Próximo a Vencer': 'text-orange-600', 'Vencido': 'text-red-700 font-bold' };
                                    return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</div>
                                            {item.inventoryType === 'Suministro Paciente' && <Badge variant="outline" className="mt-1">Paciente: {item.patientOwnerName}</Badge>}
                                        </TableCell>
                                        <TableCell><Badge variant={item.inventoryType === 'Fraccionamiento' ? 'default' : 'secondary'}>{item.inventoryType}</Badge></TableCell>
                                        <TableCell><div className="flex items-center gap-2"><span className="font-semibold text-lg text-foreground">{item.quantity}</span><span className="text-sm text-muted-foreground ml-1">{item.unit}</span></div></TableCell>
                                        <TableCell>{item.nextExpiryDate && !isNaN(parseISO(item.nextExpiryDate).getTime()) ? format(parseISO(item.nextExpiryDate), 'MMM yyyy', {locale: es}) : 'N/A'}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn("font-semibold", statusStyles[item.status])}>{item.status}</Badge></TableCell>
                                        <TableCell className="text-right"><InventoryActions item={item} onManageLots={handleManageLots} onEdit={() => handleOpenForm(item)} onDelete={() => setItemToDelete(item)} /></TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    )}
                </div>
              </TabsContent>

              <TabsContent value="external" className="mt-6 space-y-6">
                {liorenData.error ? (
                  <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><CardTitle>Error de Conexión</CardTitle><CardDescription>{liorenData.error}</CardDescription></Alert>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Catálogo de Productos Lioren</CardTitle>
                      <CardDescription>Visualice y busque en el catálogo completo de Lioren. Importe productos a su inventario local para gestionarlos.</CardDescription>
                      <div className="relative pt-4">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar en catálogo Lioren..." className="pl-8" value={liorenSearchTerm} onChange={e => setLiorenSearchTerm(e.target.value)} />
                      </div>
                    </CardHeader>
                    <CardContent>
                        {filteredLiorenInventory.length > 0 ? (
                             <Table>
                                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>SKU</TableHead><TableHead>Stock Total</TableHead><TableHead className="text-right">Precio Venta</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredLiorenInventory.slice(0, 100).map(product => ( // Limit display to 100 for performance
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.nombre || 'N/A'}</TableCell>
                                            <TableCell>{product.codigo || 'N/A'}</TableCell>
                                            <TableCell>{product.stocks?.reduce((acc, s) => acc + s.stock, 0) ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right">${(product.precioventabruto ?? 0).toLocaleString('es-CL')}</TableCell>
                                            <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleImportFromLioren(product)}><Download className="mr-2 h-4 w-4" />Importar</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">No se encontraron productos en Lioren para su búsqueda.</div>
                        )}
                        {filteredLiorenInventory.length > 100 && (
                            <p className="text-center text-sm text-muted-foreground mt-4">Mostrando los primeros 100 resultados. Afine su búsqueda para encontrar más productos.</p>
                        )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
        </>
    );
}

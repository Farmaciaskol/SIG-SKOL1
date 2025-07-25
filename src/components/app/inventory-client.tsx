
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, addLotToInventoryItem, type Patient } from '@/lib/data';
import type { InventoryItem, LotDetail, Bodega } from '@/lib/types';
import { searchLiorenProducts, type LiorenProduct, fetchLiorenWarehouses } from '@/lib/lioren-api';
import { runStockSync } from '@/lib/actions';
import { PlusCircle, Search, Edit, Box, Trash2, MoreVertical, DollarSign, Package, PackageX, AlertTriangle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, RefreshCw, Download } from 'lucide-react';
import { format, differenceInDays, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InventoryItemForm } from './inventory-item-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert } from '../ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
    onEdit, 
    onDelete 
}: { 
    item: InventoryItemWithStats; 
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

export function InventoryClient({ 
  initialInventory,
  patients,
}: { 
  initialInventory: InventoryItem[];
  patients: Patient[];
}) {
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | Partial<InventoryItem> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Lioren state
    const [liorenSearchTerm, setLiorenSearchTerm] = useState('');
    const [liorenResults, setLiorenResults] = useState<LiorenProduct[]>([]);
    const [isLiorenSearching, setIsLiorenSearching] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [liorenSearchError, setLiorenSearchError] = useState<string | undefined>(undefined);
    const [liorenWarehouses, setLiorenWarehouses] = useState<Bodega[]>([]);

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

    useEffect(() => {
        const loadWarehouses = async () => {
            const { bodegas, error } = await fetchLiorenWarehouses();
            if (error) {
                toast({ title: "Error al cargar bodegas", description: error, variant: "destructive" });
            } else {
                setLiorenWarehouses(bodegas);
            }
        };
        loadWarehouses();
    }, [toast]);

    const warehouseMap = useMemo(() => {
        return new Map(liorenWarehouses.map(w => [w.id, w.nombre]));
    }, [liorenWarehouses]);

    const getWarehouseName = (id?: number | null) => {
        if (id === null || id === undefined) return null;
        return warehouseMap.get(id);
    };

    const handleOpenForm = (item: InventoryItem | Partial<InventoryItem> | null) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

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
    
    const handleLiorenSearch = async () => {
        if (!liorenSearchTerm.trim()) {
            toast({ title: 'Búsqueda Vacía', description: 'Por favor, ingrese un término para buscar en Lioren.' });
            return;
        }
        setIsLiorenSearching(true);
        setLiorenSearchError(undefined);
        setLiorenResults([]);
        try {
            const result = await searchLiorenProducts(liorenSearchTerm);
            if (result.error) {
                setLiorenSearchError(result.error);
            } else {
                setLiorenResults(result.products);
                if(result.products.length === 0) {
                    toast({ title: 'Sin resultados', description: 'No se encontraron productos en Lioren para su búsqueda.' });
                }
            }
        } catch (error) {
            setLiorenSearchError('Ocurrió un error inesperado al realizar la búsqueda.');
        } finally {
            setIsLiorenSearching(false);
        }
    };

    const handleImportFromLioren = (liorenProduct: LiorenProduct) => {
      const productToImport: Partial<InventoryItem> = {
        name: liorenProduct.nombre,
        barcode: liorenProduct.codigo,
        salePrice: liorenProduct.precioventabruto,
        costPrice: liorenProduct.preciocompraneto,
        unit: liorenProduct.unidad,
        inventoryType: 'Venta Directa',
      };
      handleOpenForm(productToImport);
    };
    
    const handleSyncStock = async () => {
        setIsSyncing(true);
        try {
            const result = await runStockSync();
            if (result.success) {
                toast({ title: 'Sincronización Exitosa', description: result.message });
                refreshLocalData();
            } else {
                toast({ title: 'Error de Sincronización', description: result.message, variant: 'destructive' });
            }
        } catch(error) {
            toast({ title: 'Error Inesperado', description: 'Ocurrió un fallo al intentar sincronizar.', variant: 'destructive' });
        } finally {
            setIsSyncing(false);
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

    const filteredLocalInventory = useMemo(() => {
        return inventoryWithStats.filter(item => {
            const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
            const matchesSearch = searchTerm === '' ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesFilter && matchesSearch;
        })
    }, [inventoryWithStats, activeFilter, searchTerm]);

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

    return (
        <>
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
            
            <Tabs defaultValue="local" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="local">Inventario Local (Skol)</TabsTrigger>
                    <TabsTrigger value="external">Buscar en Lioren</TabsTrigger>
                </TabsList>
                <TabsContent value="local" className="mt-6">
                    <div className="space-y-6">
                         <div className="flex items-center gap-2">
                            <Button onClick={() => handleOpenForm(null)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Crear Producto Local
                            </Button>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button variant="outline" onClick={handleSyncStock} disabled={isSyncing}>
                                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                                        Sincronizar Stock
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>Actualiza el stock de los productos de "Fraccionamiento" con el total de Lioren.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
                            ) : filteredLocalInventory.length === 0 ? (
                                <Card className="text-center py-16 mt-8 shadow-none border-dashed"><div className="flex flex-col items-center justify-center"><Package className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold text-foreground">No se encontraron productos locales</h2><p className="text-muted-foreground mt-2 max-w-sm">Intenta ajustar tu búsqueda o crea un nuevo producto.</p></div></Card>
                            ) : (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Tipo</TableHead><TableHead>Stock Total</TableHead><TableHead>Próximo Vto.</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredLocalInventory.map(item => {
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
                                                <TableCell className="text-right"><InventoryActions item={item} onEdit={() => handleOpenForm(item)} onDelete={() => setItemToDelete(item)} /></TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="external" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catálogo de Productos de Lioren</CardTitle>
                            <CardDescription>Busque en el inventario de Lioren para importar productos a su inventario local.</CardDescription>
                            <div className="flex items-center gap-2 pt-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar por nombre o código en Lioren..." 
                                        className="pl-8" 
                                        value={liorenSearchTerm} 
                                        onChange={(e) => setLiorenSearchTerm(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleLiorenSearch() }}
                                    />
                                </div>
                                <Button onClick={handleLiorenSearch} disabled={isLiorenSearching}>
                                    {isLiorenSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                    Buscar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {liorenSearchError ? (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <CardTitle>Error de Conexión</CardTitle>
                                    <CardDescription>{liorenSearchError}</CardDescription>
                                </Alert>
                            ) : isLiorenSearching ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin"/>
                                </div>
                            ) : liorenResults.length > 0 ? (
                                <div className="max-h-[70vh] overflow-y-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Código</TableHead><TableHead>Precio</TableHead><TableHead>Stock por Bodega</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {liorenResults.map(product => {
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">{product.nombre || "N/A"}</TableCell>
                                                        <TableCell>{product.codigo || "N/A"}</TableCell>
                                                        <TableCell>${typeof product.precioventabruto === 'number' ? product.precioventabruto.toLocaleString('es-CL') : 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {Array.isArray(product.stocks) && product.stocks.length > 0 ? (
                                                                    product.stocks.map((stockItem, index) => {
                                                                        if (typeof stockItem !== 'object' || stockItem === null) {
                                                                            return ( <Badge key={`invalid-stock-${index}`} variant="destructive"> Dato Inválido </Badge> );
                                                                        }
                                                                        const warehouseId = stockItem.bodega_id;
                                                                        const warehouseName = stockItem.nombre || getWarehouseName(warehouseId);
                                                                        const stockValue = stockItem.stock ?? stockItem.cantidad;
                                                                        const key = `${product.id}-${warehouseId !== null && warehouseId !== undefined ? warehouseId : `idx-${index}`}`;

                                                                        let warehouseDisplay = "Bodega Desconocida";
                                                                        if (warehouseName) {
                                                                            warehouseDisplay = warehouseName;
                                                                        } else if (warehouseId !== undefined && warehouseId !== null) {
                                                                            warehouseDisplay = `ID Bodega: ${warehouseId}`;
                                                                        }

                                                                        const stockDisplay = (stockValue !== undefined && stockValue !== null) ? stockValue : 'N/D';

                                                                        return (
                                                                            <Badge key={key} variant="secondary" className="font-normal">
                                                                                {warehouseDisplay}: {stockDisplay}
                                                                            </Badge>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <Badge variant="outline">Sin Info de Stock</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button size="sm" onClick={() => handleImportFromLioren(product)}>
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Importar
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Ingrese un término de búsqueda para ver los productos de Lioren.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}

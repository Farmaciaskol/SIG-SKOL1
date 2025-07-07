
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, addLotToInventoryItem } from '@/lib/data';
import type { InventoryItem, LotDetail } from '@/lib/types';
import { PlusCircle, Search, Edit, History, PackagePlus, Trash2, MoreVertical, DollarSign, Package, PackageX, AlertTriangle, Star, Box, ChevronDown, Loader2, Calendar as CalendarIcon, Snowflake, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { format, differenceInDays, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InventoryItemForm } from './inventory-item-form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchRawInventoryFromLioren, type LiorenProduct } from '@/lib/lioren-api';
import { VADEMECUM_DATA } from '@/lib/constants';


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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
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

const ProductCard = ({ 
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
    const { toast } = useToast();
    const statusStyles: Record<InventoryItemWithStats['status'], { badge: string; border: string }> = {
      'OK': { badge: 'bg-green-100 text-green-800', border: 'border-transparent' },
      'Stock Bajo': { badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', border: 'border-yellow-400' },
      'Agotado': { badge: 'bg-red-100 text-red-800 border-red-300', border: 'border-red-500' },
      'Próximo a Vencer': { badge: 'bg-orange-100 text-orange-800 border-orange-300', border: 'border-orange-400' },
      'Vencido': { badge: 'bg-red-200 text-red-900 font-bold border-red-400', border: 'border-red-500' },
    };
    
    const { badge, border } = statusStyles[item.status] || statusStyles['OK'];

    return (
        <Card className={cn("flex flex-col transition-all hover:shadow-lg border-2", border)}>
            <CardHeader className="pb-4">
                 <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-primary truncate" title={item.name}>{item.name}</h3>
                    <Badge variant={item.inventoryType === 'Fraccionamiento' ? 'default' : 'secondary'}>{item.inventoryType}</Badge>
                 </div>
                 <p className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">{item.quantity}</span>
                        <span className="text-muted-foreground">{item.unit}</span>
                    </div>
                    <Badge className={cn("font-semibold", badge)}>{item.status}</Badge>
                </div>
                <div className="text-sm">
                    <p className="text-muted-foreground">Próximo Vencimiento:</p>
                    <p className="font-medium text-foreground">
                        {item.nextExpiryDate && !isNaN(parseISO(item.nextExpiryDate).getTime()) ? format(parseISO(item.nextExpiryDate), 'dd-MMMM-yyyy', {locale: es}) : 'N/A'}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3 flex flex-col items-stretch gap-2">
                <Button onClick={() => onManageLots(item)}>
                    <Box className="mr-2 h-4 w-4" />
                    Gestionar Lotes
                </Button>
                <InventoryActions item={item} onManageLots={onManageLots} onEdit={onEdit} onDelete={onDelete} />
            </CardFooter>
        </Card>
    )
}

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

export function InventoryClient({ initialInventory }: { 
  initialInventory: InventoryItem[];
}) {
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
    const [liorenInventory, setLiorenInventory] = useState<LiorenProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSearchingLioren, setIsSearchingLioren] = useState(false);
    const [liorenSearchTerm, setLiorenSearchTerm] = useState('');
    const [hasSearchedLioren, setHasSearchedLioren] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const { toast } = useToast();

    const [managingLotsFor, setManagingLotsFor] = useState<InventoryItemWithStats | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    
    const [liorenCurrentPage, setLiorenCurrentPage] = useState(1);
    const LIOREN_ITEMS_PER_PAGE = 15;

    const [openRows, setOpenRows] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => {
        setOpenRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
        });
    };

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
    
    const handleSearchLioren = async () => {
        if (!liorenSearchTerm.trim()) {
            toast({ title: 'Búsqueda vacía', description: 'Por favor, ingrese un término de búsqueda.'});
            return;
        }
        setIsSearchingLioren(true);
        setHasSearchedLioren(true);
        setLiorenCurrentPage(1);
        try {
            const results = await fetchRawInventoryFromLioren(liorenSearchTerm);
            setLiorenInventory(results);
             if(results.length === 0) {
              toast({ title: 'Sin resultados', description: 'La búsqueda en Lioren no arrojó resultados para su término.', variant: 'default' });
            }
        } catch (error) {
            toast({ title: 'Error de búsqueda en Lioren', description: `Hubo un problema al buscar en Lioren. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSearchingLioren(false);
        }
    };

    const handleOpenForm = (item: InventoryItem | null) => {
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
            toast({ title: "Producto Eliminado", description: "El producto ha sido eliminado de la base de datos local." });
            setItemToDelete(null);
            refreshLocalData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "destructive" });
        }
    };

    const toTitleCase = (str: string): string => {
        if (!str) return '';
        return str.toLowerCase().replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
    };

    const handleImportLiorenItem = (liorenItem: LiorenProduct) => {
        const liorenProductName = toTitleCase(liorenItem.nombre);
        const lowerLiorenName = liorenProductName.toLowerCase().trim();

        // Improved Vademecum lookup logic
        const vademecumMatch = VADEMECUM_DATA.find(drug => {
            // Check if the Lioren product name starts with a known base drug name from Vademecum
            const drugBaseName = drug.productName.split(' ')[0].toLowerCase();
            return lowerLiorenName.startsWith(drugBaseName);
        });

        const activePrinciple = vademecumMatch 
            ? vademecumMatch.activeIngredient 
            : liorenProductName;

        if (vademecumMatch) {
            toast({
                title: "Principio Activo Encontrado",
                description: `Se autocompletó "${vademecumMatch.activeIngredient}" desde el Vademecum.`,
            });
        }

        const formattedItem: Partial<InventoryItem> = {
            name: liorenProductName,
            sku: liorenItem.codigo,
            costPrice: liorenItem.preciocompraneto,
            salePrice: liorenItem.precioventabruto,
            unit: toTitleCase(liorenItem.unidad),
            inventoryType: 'Fraccionamiento',
            activePrinciple: activePrinciple,
            pharmaceuticalForm: '',
            doseValue: 0,
            doseUnit: 'mg',
            itemsPerBaseUnit: 1,
            lowStockThreshold: 5,
            isControlled: false,
            requiresRefrigeration: false,
            internalNotes: `Importado desde Lioren. ID: ${liorenItem.id}`,
        };
        setEditingItem(formattedItem as InventoryItem);
        setIsFormOpen(true);
    };


    const inventoryWithStats = useMemo<InventoryItemWithStats[]>(() => {
        return inventory.map(item => {
            const now = new Date();
            
            const lots = item.lots || [];
            const sortedLots = [...lots]
                .filter(lot => {
                    if (lot.quantity <= 0 || !lot.expiryDate) return false;
                    try {
                        return !isNaN(parseISO(lot.expiryDate).getTime());
                    } catch {
                        return false;
                    }
                })
                .sort((a, b) => parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime());
            
            const nextExpiryDate = sortedLots.length > 0 ? sortedLots[0].expiryDate : undefined;
            
            let isExpired = false;
            let isExpiringSoon = false;

            if (nextExpiryDate) {
                try {
                    const expiryDateObj = parseISO(nextExpiryDate);
                    isExpired = isBefore(expiryDateObj, now);
                    isExpiringSoon = differenceInDays(expiryDateObj, now) <= EXPIRY_THRESHOLD_DAYS && !isExpired;
                } catch {
                    // Ignore invalid dates
                }
            }

            let status: InventoryItemWithStats['status'] = 'OK';
            if (isExpired) status = 'Vencido';
            else if (item.quantity <= 0) status = 'Agotado';
            else if (isExpiringSoon) status = 'Próximo a Vencer';
            else if (item.quantity < item.lowStockThreshold) status = 'Stock Bajo';
            
            return {
                ...item,
                status,
                nextExpiryDate,
                isExpiringSoon,
                isExpired
            };
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

    const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);

    const paginatedInventory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredInventory, currentPage]);
    
    const totalLiorenPages = Math.ceil(liorenInventory.length / LIOREN_ITEMS_PER_PAGE);

    const paginatedLiorenInventory = useMemo(() => {
        const startIndex = (liorenCurrentPage - 1) * LIOREN_ITEMS_PER_PAGE;
        return liorenInventory.slice(startIndex, startIndex + LIOREN_ITEMS_PER_PAGE);
    }, [liorenInventory, liorenCurrentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter]);


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
                    <DialogTitle>{editingItem ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                        {editingItem ? 'Modifique los detalles del producto en la base de datos local.' : 'Añada un nuevo producto a la base de datos interna.'}
                    </DialogDescription>
                </DialogHeader>
                <InventoryItemForm onFinished={handleFormFinished} itemToEdit={editingItem || undefined} />
              </DialogContent>
            </Dialog>

             <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el producto <span className="font-bold">{itemToDelete?.name}</span> de la base de datos interna.
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
                <div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Crear Producto Local
                    </Button>
                </div>
            </div>
            
            <Tabs defaultValue="skol-inventory">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="skol-inventory">Inventario Skol (Local)</TabsTrigger>
                    <TabsTrigger value="lioren-api">Buscar en API Lioren</TabsTrigger>
                </TabsList>
                <TabsContent value="skol-inventory">
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
                                <Input
                                    placeholder="Buscar por nombre o SKU..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {(['all', 'OK', 'Stock Bajo', 'Agotado', 'Próximo a Vencer', 'Vencido'] as FilterStatus[]).map(status => (
                                    <Button 
                                        key={status}
                                        variant={activeFilter === status ? 'default' : 'outline'}
                                        onClick={() => setActiveFilter(status)}
                                        className="text-xs sm:text-sm whitespace-nowrap"
                                    >
                                    {status === 'all' ? 'Todos' : status}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : paginatedInventory.length === 0 ? (
                        <Card className="text-center py-16 mt-8 shadow-none border-dashed">
                            <div className="flex flex-col items-center justify-center">
                                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                                <h2 className="text-xl font-semibold text-foreground">No se encontraron productos</h2>
                                <p className="text-muted-foreground mt-2 max-w-sm">
                                    Intenta ajustar tu búsqueda o crea un nuevo producto.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <Card className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Stock Total</TableHead>
                                            <TableHead>Próximo Vto.</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedInventory.map(item => {
                                            const statusStyles: Record<InventoryItemWithStats['status'], string> = {
                                                'OK': 'text-green-600',
                                                'Stock Bajo': 'text-yellow-600',
                                                'Agotado': 'text-red-600',
                                                'Próximo a Vencer': 'text-orange-600',
                                                'Vencido': 'text-red-700 font-bold',
                                            };
                                            return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell><Badge variant={item.inventoryType === 'Fraccionamiento' ? 'default' : 'secondary'}>{item.inventoryType}</Badge></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-lg text-foreground">{item.quantity}</span>
                                                        <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.nextExpiryDate && !isNaN(parseISO(item.nextExpiryDate).getTime()) ? format(parseISO(item.nextExpiryDate), 'MMM yyyy', {locale: es}) : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("font-semibold", statusStyles[item.status])}>{item.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <InventoryActions item={item} onManageLots={handleManageLots} onEdit={() => handleOpenForm(item)} onDelete={() => setItemToDelete(item)} />
                                                </TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </Card>

                            {/* Mobile Card View */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:hidden">
                                {paginatedInventory.map(item => (
                                    <ProductCard key={item.id} item={item} onManageLots={handleManageLots} onEdit={() => handleOpenForm(item)} onDelete={() => setItemToDelete(item)} />
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6">
                                    <div className="text-xs text-muted-foreground">
                                        Página {currentPage} de {totalPages}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft /></Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight /></Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight /></Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>
                <TabsContent value="lioren-api">
                    <Card>
                        <CardHeader>
                            <CardTitle>Buscar en API de Lioren</CardTitle>
                            <CardDescription>Busque productos directamente en la API de Lioren para ver su información en tiempo real.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="flex gap-2 mb-4">
                                <Input 
                                    placeholder="Buscar por nombre o SKU en Lioren..."
                                    value={liorenSearchTerm}
                                    onChange={(e) => setLiorenSearchTerm(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchLioren() }}
                                />
                                <Button onClick={handleSearchLioren} disabled={isSearchingLioren}>
                                    {isSearchingLioren ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                    Buscar
                                </Button>
                            </div>

                            {isSearchingLioren ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="ml-2 text-muted-foreground">Buscando en Lioren...</p>
                                </div>
                            ) : !hasSearchedLioren ? (
                                <div className="text-center py-16">Realice una búsqueda para ver los datos de Lioren.</div>
                            ) : liorenInventory.length === 0 ? (
                                <div className="text-center py-16">La búsqueda no arrojó resultados.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"></TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>SKU/Código</TableHead>
                                                <TableHead>Stock Total</TableHead>
                                                <TableHead className="text-right">Precio Venta</TableHead>
                                                <TableHead className="text-right">Costo</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedLiorenInventory.map(item => {
                                                const totalStock = item.stocks?.reduce((sum, s) => sum + (Number(s.stock) || 0), 0) ?? 0;
                                                const hasBreakdown = item.stocks && item.stocks.length > 0;
                                                const isRowOpen = openRows.has(item.id.toString());
                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <TableRow>
                                                            <TableCell>
                                                                {hasBreakdown && (
                                                                    <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => toggleRow(item.id.toString())}>
                                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isRowOpen && "rotate-180")} />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-medium">{item.nombre}</TableCell>
                                                            <TableCell className="font-mono">{item.codigo}</TableCell>
                                                            <TableCell>{totalStock}</TableCell>
                                                            <TableCell className="text-right">${item.precioventabruto?.toLocaleString('es-CL') || '0'}</TableCell>
                                                            <TableCell className="text-right">${item.preciocompraneto?.toLocaleString('es-CL') || '0'}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleImportLiorenItem(item)}
                                                                >
                                                                    <PackagePlus className="mr-2 h-4 w-4" />
                                                                    Crear p/ Fracc.
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        {hasBreakdown && isRowOpen && (
                                                            <TableRow className="bg-muted/50 hover:bg-muted/80">
                                                                <TableCell />
                                                                <TableCell colSpan={6} className="p-0">
                                                                    <div className="p-4">
                                                                        <h4 className="font-semibold text-xs mb-2">Desglose de Stock por Bodega</h4>
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="border-b-0">
                                                                                    <TableHead className="h-8">Bodega</TableHead>
                                                                                    <TableHead className="h-8 text-right">Stock</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {item.stocks.map((stock, index) => (
                                                                                    <TableRow key={index} className="border-b-0 hover:bg-muted/90">
                                                                                        <TableCell className="py-1">{stock.nombre}</TableCell>
                                                                                        <TableCell className="py-1 text-right">{stock.stock}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                         {totalLiorenPages > 1 && (
                            <CardFooter className="flex items-center justify-between px-4 py-3 border-t">
                                <div className="text-xs text-muted-foreground">
                                    Página {liorenCurrentPage} de {totalLiorenPages}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => setLiorenCurrentPage(1)} disabled={liorenCurrentPage === 1}><ChevronsLeft /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setLiorenCurrentPage(prev => Math.max(prev - 1, 1))} disabled={liorenCurrentPage === 1}><ChevronLeft /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setLiorenCurrentPage(prev => Math.min(prev + 1, totalLiorenPages))} disabled={liorenCurrentPage === totalLiorenPages}><ChevronRight /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setLiorenCurrentPage(totalLiorenPages)} disabled={liorenCurrentPage === totalLiorenPages}><ChevronsRight /></Button>
                                </div>
                            </CardFooter>
                         )}
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}

    
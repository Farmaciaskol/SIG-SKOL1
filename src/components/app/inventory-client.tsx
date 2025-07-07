
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const InventoryActions = ({ item, onManageLots }: { item: InventoryItemWithStats; onManageLots: (item: InventoryItemWithStats) => void; }) => {
    const { toast } = useToast();
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
            <span>Ver Lotes</span>
          </DropdownMenuItem>
           <DropdownMenuItem onSelect={() => toast({ title: 'Gestión en Lioren', description: 'La edición y eliminación de productos se debe realizar directamente en Lioren.' })}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar en Lioren</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast({ title: 'Función no disponible', description: 'El historial de movimientos estará disponible próximamente.' })}>
            <History className="mr-2 h-4 w-4" />
            <span>Ver Historial</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
};

const ProductCard = ({ item, onManageLots }: { item: InventoryItemWithStats; onManageLots: (item: InventoryItemWithStats) => void; }) => {
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
                    <div className="flex items-center gap-2">
                        {item.requiresRefrigeration && <Snowflake className="h-5 w-5 text-blue-500" title="Requiere Cadena de Frío" />}
                        {item.isControlled && <Star className="h-5 w-5 text-amber-500" title="Sustancia Controlada" />}
                    </div>
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
                    Ver Lotes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Gestión en Lioren', description: 'La gestión de este producto se realiza en Lioren.' })}>
                    Más Acciones
                </Button>
            </CardFooter>
        </Card>
    )
}

function LotManagementDialog({ item, isOpen, onOpenChange }: { item: InventoryItem | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  
  useEffect(() => {
    if (!isOpen) {
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lotes para: <span className="text-primary">{item?.name}</span></DialogTitle>
          <DialogDescription>Listado de lotes y su stock actual desde Lioren.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-96 overflow-y-auto pr-4">
            <Table>
            <TableHeader className="sticky top-0 bg-muted/95">
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
                <TableRow><TableCell colSpan={3} className="text-center h-24">No hay lotes con stock.</TableCell></TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function InventoryClient({ initialInventory }: { initialInventory: InventoryItem[] }) {
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const { toast } = useToast();

    // Lot Management Dialog State
    const [managingLotsFor, setManagingLotsFor] = useState<InventoryItemWithStats | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setInventory(initialInventory);
    }, [initialInventory]);

    const inventoryWithStats = useMemo<InventoryItemWithStats[]>(() => {
        return inventory.map(item => {
            const now = new Date();
            
            const lots = item.lots || [];
            const sortedLots = [...lots]
                .filter(lot => {
                    if (lot.quantity <= 0 || !lot.expiryDate) return false;
                    return !isNaN(parseISO(lot.expiryDate).getTime());
                })
                .sort((a, b) => parseISO(a.expiryDate).getTime() - parseISO(b.expiryDate).getTime());
            
            const nextExpiryDate = sortedLots.length > 0 ? sortedLots[0].expiryDate : undefined;
            
            let isExpired = false;
            let isExpiringSoon = false;

            if (nextExpiryDate) {
                const expiryDateObj = parseISO(nextExpiryDate);
                isExpired = isBefore(expiryDateObj, now);
                isExpiringSoon = differenceInDays(expiryDateObj, now) <= EXPIRY_THRESHOLD_DAYS && !isExpired;
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
            />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Gestión de Inventario (Sincronizado con Lioren)</h1>
                    <p className="text-sm text-muted-foreground">
                        Control logístico y trazabilidad de los insumos de la farmacia.
                    </p>
                </div>
                <Button onClick={() => toast({ title: 'Gestión en Lioren', description: 'La creación de productos se realiza directamente en la plataforma de Lioren.' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Crear Producto en Lioren
                </Button>
            </div>

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

            {paginatedInventory.length === 0 ? (
                 <Card className="text-center py-16 mt-8 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold text-foreground">No se encontraron productos</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Intenta ajustar tu búsqueda o sincroniza con Lioren para ver tu inventario.
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
                                        <TableCell>
                                            <span className="font-semibold text-lg text-foreground">{item.quantity}</span>
                                            <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                                        </TableCell>
                                        <TableCell>
                                            {item.nextExpiryDate && !isNaN(parseISO(item.nextExpiryDate).getTime()) ? format(parseISO(item.nextExpiryDate), 'MMM yyyy', {locale: es}) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("font-semibold", statusStyles[item.status])}>{item.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <InventoryActions item={item} onManageLots={handleManageLots} />
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:hidden">
                        {paginatedInventory.map(item => (
                            <ProductCard key={item.id} item={item} onManageLots={handleManageLots} />
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
        </>
    );
}

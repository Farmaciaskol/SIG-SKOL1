
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getInventory, addInventoryItem, updateInventoryItem, InventoryItem, LotDetail } from '@/lib/data';
import { PlusCircle, Search, Edit, History, PackagePlus, Trash2, MoreVertical, DollarSign, Package, PackageX, AlertTriangle, Star, Box, ChevronDown, Loader2 } from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';


const EXPIRY_THRESHOLD_DAYS = 90;

type InventoryItemWithStats = InventoryItem & {
  status: 'OK' | 'Stock Bajo' | 'Agotado' | 'Próximo a Vencer' | 'Vencido';
  nextExpiryDate?: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
};

type FilterStatus = 'all' | 'OK' | 'Stock Bajo' | 'Agotado' | 'Próximo a Vencer' | 'Vencido';

const lotSchema = z.object({
  lotNumber: z.string().min(1, "El N° de lote es requerido."),
  quantity: z.number().min(0, "La cantidad no puede ser negativa."),
  expiryDate: z.string().min(1, "La fecha de vencimiento es requerida."),
});

const inventoryFormSchema = z.object({
  name: z.string().min(1, "El nombre del producto es requerido."),
  unit: z.string().min(1, "La unidad es requerida."),
  lowStockThreshold: z.number().min(0, "El umbral no puede ser negativo."),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().optional(),
  isControlled: z.boolean().default(false),
  controlledType: z.string().optional(),
  activePrincipleContentValue: z.number().optional(),
  activePrincipleContentUnit: z.string().optional(),
  itemsPerBaseUnit: z.number().optional(),
}).refine(data => !data.isControlled || (data.isControlled && data.controlledType), {
    message: "El tipo de controlado es requerido.",
    path: ["controlledType"],
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

const InventoryItemForm = ({ item, onFinished }: { item?: InventoryItem; onFinished: () => void }) => {
    const { toast } = useToast();
    const isEditMode = !!item;

    const form = useForm<InventoryFormValues>({
        resolver: zodResolver(inventoryFormSchema),
        defaultValues: {
            name: item?.name || '',
            unit: item?.unit || '',
            lowStockThreshold: item?.lowStockThreshold || 0,
            sku: item?.sku || '',
            barcode: item?.barcode || '',
            costPrice: item?.costPrice || 0,
            isControlled: item?.isControlled || false,
            controlledType: item?.controlledType || '',
            activePrincipleContentValue: item?.activePrincipleContentValue || 0,
            activePrincipleContentUnit: item?.activePrincipleContentUnit || '',
            itemsPerBaseUnit: item?.itemsPerBaseUnit || 0,
        },
    });

    const onSubmit = async (data: InventoryFormValues) => {
        try {
            if (isEditMode) {
                // Update logic here
                await updateInventoryItem(item.id, data);
                 toast({ title: "Producto Actualizado", description: "El producto ha sido actualizado correctamente." });
            } else {
                // Create logic here
                await addInventoryItem(data);
                toast({ title: "Producto Creado", description: "El nuevo producto ha sido añadido al inventario." });
            }
            onFinished();
        } catch (error) {
            console.error("Failed to save inventory item:", error);
            toast({ title: "Error", description: "No se pudo guardar el producto.", variant: "destructive" });
        }
    }
    
    const isControlled = form.watch('isControlled');

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Producto *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Unidad de Medida *</FormLabel><FormControl><Input placeholder="Ej: g, mg, comprimidos" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                        <FormItem><FormLabel>Umbral Stock Bajo *</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="sku" render={({ field }) => (
                        <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem><FormLabel>Código de Barras</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="costPrice" render={({ field }) => (
                    <FormItem><FormLabel>Precio Costo</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                )}/>
                
                <FormField control={form.control} name="isControlled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Es Controlado</FormLabel></FormItem>
                )}/>

                {isControlled && (
                    <FormField control={form.control} name="controlledType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Controlado *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Psicotrópico">Psicotrópico</SelectItem>
                                    <SelectItem value="Estupefaciente">Estupefaciente</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                )}
                
                <Card className="bg-muted/50">
                    <CardHeader><CardTitle className="text-base">Para Fraccionamiento (Opcional)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormDescription>Rellene esta sección si este producto es un insumo que se enviará a recetarios para ser fraccionado.</FormDescription>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <FormField control={form.control} name="itemsPerBaseUnit" render={({ field }) => (
                                <FormItem><FormLabel>Sub-unidades por Unidad</FormLabel><FormControl><Input type="number" placeholder="Ej: 30" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="activePrincipleContentValue" render={({ field }) => (
                                <FormItem><FormLabel>Contenido P.A.</FormLabel><FormControl><Input type="number" placeholder="Ej: 100" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="activePrincipleContentUnit" render={({ field }) => (
                                <FormItem><FormLabel>Unidad P.A.</FormLabel><FormControl><Input placeholder="Ej: mg" {...field} /></FormControl></FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>

                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                    <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Producto
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}


const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const ProductCard = ({ item, onEdit }: { item: InventoryItemWithStats; onEdit: (item: InventoryItem) => void }) => {
    const statusStyles: Record<typeof item.status, { badge: string, border: string }> = {
      'OK': { badge: 'bg-green-100 text-green-800', border: 'border-transparent' },
      'Stock Bajo': { badge: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-400' },
      'Agotado': { badge: 'bg-red-100 text-red-800', border: 'border-red-500' },
      'Próximo a Vencer': { badge: 'bg-orange-100 text-orange-800', border: 'border-orange-400' },
      'Vencido': { badge: 'bg-red-100 text-red-800 font-bold', border: 'border-red-500' },
    };
    
    const { badge, border } = statusStyles[item.status] || statusStyles['OK'];

    return (
        <Card className={cn("flex flex-col transition-all hover:shadow-lg", border)}>
            <CardHeader className="pb-4">
                 <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                    {item.isControlled && <Star className="h-5 w-5 text-amber-500" />}
                 </div>
                 <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{item.quantity}</span>
                        <span className="text-muted-foreground">{item.unit}</span>
                    </div>
                    <Badge className={badge}>{item.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                    <p>Próximo Vencimiento:</p>
                    <p className="font-medium text-foreground">
                        {item.nextExpiryDate ? format(new Date(item.nextExpiryDate), 'dd-MMMM-yyyy', {locale: es}) : 'N/A'}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3 flex flex-col items-stretch gap-2">
                <Button>
                    <Box className="mr-2 h-4 w-4" />
                    Gestionar Lotes
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            Más Acciones <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar Definición</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            <span>Ver Historial</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem>
                            <PackagePlus className="mr-2 h-4 w-4" />
                            <span>Registrar Devolución</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar Producto</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    )
}

export default function InventoryPage() {
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const { toast } = useToast();

    // Form Dialog State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const inventoryData = await getInventory();
            setInventory(inventoryData);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            toast({ title: 'Error', description: 'No se pudo cargar el inventario.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const inventoryWithStats = useMemo<InventoryItemWithStats[]>(() => {
        return inventory.map(item => {
            const now = new Date();
            
            const lots = item.lots || [];
            const sortedLots = [...lots]
                .filter(lot => lot.quantity > 0)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
            
            const nextExpiryDate = sortedLots.length > 0 ? sortedLots[0].expiryDate : undefined;
            
            const isExpired = nextExpiryDate ? isBefore(new Date(nextExpiryDate), now) : false;
            const isExpiringSoon = nextExpiryDate ? differenceInDays(new Date(nextExpiryDate), now) <= EXPIRY_THRESHOLD_DAYS && !isExpired : false;

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

    const handleFormFinished = () => {
        setIsFormOpen(false);
        setEditingItem(undefined);
        fetchData();
    };

    const handleAddNew = () => {
        setEditingItem(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    }

    if (loading) {
      return <div className="p-8">Cargando inventario...</div>;
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <div className="space-y-6 p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Inventario</h2>
                        <p className="text-muted-foreground">
                            Control logístico y trazabilidad de los insumos de la farmacia.
                        </p>
                    </div>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Definir Producto
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Valor Total del Inventario" value={globalStats.totalValue} icon={DollarSign} />
                    <StatCard title="Ítems con Stock Bajo" value={globalStats.lowStockCount} icon={Package} />
                    <StatCard title="Ítems Agotados" value={globalStats.outOfStockCount} icon={PackageX} />
                    <StatCard title="Ítems Próximos a Vencer" value={globalStats.expiringSoonCount} icon={AlertTriangle} />
                </div>

                <Card>
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

                {filteredInventory.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredInventory.map(item => (
                            <ProductCard key={item.id} item={item} onEdit={handleEdit} />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-16 mt-8 shadow-none border-dashed">
                        <div className="flex flex-col items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold">No se encontraron productos</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm">
                                Intenta ajustar tu búsqueda o define un nuevo producto para empezar.
                            </p>
                            <Button className="mt-6" onClick={handleAddNew}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Definir Primer Producto
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
            <DialogContent className="sm:max-w-xl">
                 <DialogHeader>
                    <DialogTitle>{editingItem ? 'Editar' : 'Definir'} Producto</DialogTitle>
                    <DialogDescription>
                        {editingItem ? 'Actualice los detalles del producto.' : 'Complete el formulario para definir un nuevo producto en el inventario.'}
                    </DialogDescription>
                 </DialogHeader>
                 <InventoryItemForm item={editingItem} onFinished={handleFormFinished} />
            </DialogContent>
        </Dialog>
    );
}

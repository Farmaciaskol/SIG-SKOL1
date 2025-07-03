
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { addInventoryItem, updateInventoryItem, addLotToInventoryItem } from '@/lib/data';
import type { InventoryItem, LotDetail } from '@/lib/types';
import { PlusCircle, Search, Edit, History, PackagePlus, Trash2, MoreVertical, DollarSign, Package, PackageX, AlertTriangle, Star, Box, ChevronDown, Loader2, Calendar as CalendarIcon, Snowflake } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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


const inventoryFormSchema = z.object({
  name: z.string().min(1, "El nombre comercial es requerido."),
  activePrinciple: z.string().min(1, "El principio activo es requerido."),
  sku: z.string().optional(),
  manufacturer: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().min(1, "La unidad de compra/stock es requerida (ej: caja, frasco)."),
  itemsPerBaseUnit: z.coerce.number().min(1, "Debe indicar al menos 1 unidad por envase."),
  pharmaceuticalForm: z.string().min(1, "La forma farmacéutica es requerida."),
  doseValue: z.coerce.number().min(0, "La dosis debe ser un número positivo."),
  doseUnit: z.string().min(1, "La unidad de dosis es requerida."),
  administrationRoute: z.string().optional(),
  saleCondition: z.string().min(1, "La condición de venta es requerida."),
  isBioequivalent: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  isControlled: z.boolean().default(false),
  controlledType: z.string().optional(),
  atcCode: z.string().optional(),
  lowStockThreshold: z.coerce.number().min(0, "El stock mínimo no puede ser negativo."),
  maxStock: z.coerce.number().optional(),
  mainProvider: z.string().optional(),
  location: z.string().optional(),
  costPrice: z.coerce.number().min(0, "El costo neto es requerido."),
  salePrice: z.coerce.number().min(0, "El precio de venta es requerido."),
  mainIndications: z.string().optional(),
  internalNotes: z.string().optional(),
}).refine(data => !data.isControlled || (data.isControlled && data.controlledType), {
    message: "El tipo de controlado es requerido si el producto es controlado.",
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
            activePrinciple: item?.activePrinciple || '',
            sku: item?.sku || '',
            manufacturer: item?.manufacturer || '',
            barcode: item?.barcode || '',
            pharmaceuticalForm: item?.pharmaceuticalForm || '',
            doseValue: item?.doseValue || 0,
            doseUnit: item?.doseUnit || '',
            administrationRoute: item?.administrationRoute || '',
            saleCondition: item?.saleCondition || 'Receta Simple',
            isBioequivalent: item?.isBioequivalent || false,
            requiresRefrigeration: item?.requiresRefrigeration || false,
            isControlled: item?.isControlled || false,
            controlledType: item?.controlledType || '',
            atcCode: item?.atcCode || '',
            itemsPerBaseUnit: item?.itemsPerBaseUnit || 1,
            unit: item?.unit || 'caja',
            lowStockThreshold: item?.lowStockThreshold || 0,
            maxStock: item?.maxStock || undefined,
            mainProvider: item?.mainProvider || '',
            location: item?.location || '',
            costPrice: item?.costPrice || 0,
            salePrice: item?.salePrice || 0,
            mainIndications: item?.mainIndications || '',
            internalNotes: item?.internalNotes || '',
        },
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data: InventoryFormValues) => {
        setIsSubmitting(true);
        try {
            if (isEditMode && item) {
                await updateInventoryItem(item.id, data);
                 toast({ title: "Producto Actualizado", description: "El producto ha sido actualizado correctamente." });
            } else {
                await addInventoryItem(data);
                toast({ title: "Producto Creado", description: "El nuevo producto ha sido añadido al inventario." });
            }
            onFinished();
        } catch (error) {
            console.error("Failed to save inventory item:", error);
            toast({ title: "Error", description: "No se pudo guardar el producto.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const isControlled = form.watch('isControlled');

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto pr-4">
                <Card>
                    <CardHeader><CardTitle>1. Identificación del Producto</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nombre Comercial *</FormLabel><FormControl><Input placeholder="Ej: Tapsin, Aspirina" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="sku" render={({ field }) => (
                                <FormItem><FormLabel>Código Nacional / ISP</FormLabel><FormControl><Input placeholder="Ej: F-12345" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                <FormItem><FormLabel>Laboratorio / Fabricante</FormLabel><FormControl><Input placeholder="Ej: Bayer, Pfizer" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField control={form.control} name="unit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unidad de Compra/Stock *</FormLabel>
                                    <FormControl><Input placeholder="Ej: caja, frasco, kg" {...field} /></FormControl>
                                    <FormDescription className="text-xs">La unidad en la que se compra y gestiona el stock (ej: caja).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="itemsPerBaseUnit" render={({ field }) => (
                                <FormItem><FormLabel>Unidades por Ud. Compra *</FormLabel><FormControl><Input type="number" placeholder="Ej: 30" {...field} /></FormControl><FormDescription className="text-xs">Ej: 30 si la caja trae 30 comprimidos.</FormDescription><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>2. Detalles para Dispensación Fraccionada</CardTitle><CardDescription>Esta sección es opcional, pero crítica si este producto se usará como materia prima para preparados magistrales.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="activePrinciple" render={({ field }) => (
                            <FormItem><FormLabel>Principio Activo Principal *</FormLabel><FormControl><Input placeholder="Ej: Paracetamol, Ácido Acetilsalicílico" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="pharmaceuticalForm" render={({ field }) => (
                                <FormItem><FormLabel>Forma Farmacéutica *</FormLabel><FormControl><Input placeholder="Ej: Comprimido, Cápsula" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="administrationRoute" render={({ field }) => (
                                <FormItem><FormLabel>Vía de Administración</FormLabel><FormControl><Input placeholder="Ej: Oral, Tópica" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                             <FormField control={form.control} name="doseValue" render={({ field }) => (
                                <FormItem><FormLabel>Dosis por Unidad *</FormLabel><FormControl><Input type="number" placeholder="Ej: 500" {...field} /></FormControl><FormDescription className="text-xs">Cantidad de P.A. por unidad (ej: por comprimido).</FormDescription><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="doseUnit" render={({ field }) => (
                                <FormItem><FormLabel>Unidad Dosis *</FormLabel><FormControl><Input placeholder="Ej: mg, mcg, mg/5mL" {...field} /></FormControl><FormDescription className="text-xs">Unidad de la dosis de P.A.</FormDescription><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>3. Información Regulatoria y de Venta</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="saleCondition" render={({ field }) => (
                            <FormItem><FormLabel>Condición de Venta *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Venta Directa">Venta Directa (Libre)</SelectItem>
                                        <SelectItem value="Receta Simple">Receta Simple</SelectItem>
                                        <SelectItem value="Receta Retenida">Receta Retenida</SelectItem>
                                        <SelectItem value="Receta Cheque">Receta Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="flex items-center space-x-6 pt-2">
                             <FormField control={form.control} name="isBioequivalent" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Es Bioequivalente</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="requiresRefrigeration" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Requiere Refrigeración</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="isControlled" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Es Controlado</FormLabel></FormItem>
                            )}/>
                        </div>
                        {isControlled && (
                            <FormField control={form.control} name="controlledType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Controlado *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>4. Información de Inventario y Costos (Logística)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Mínimo *</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ej: 10" {...field} /></FormControl>
                                    <FormDescription className="text-xs">Cantidad en Unidades de Compra (ej: 10 cajas).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="maxStock" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock Máximo</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ej: 50" {...field} /></FormControl>
                                    <FormDescription className="text-xs">Opcional. Cantidad máxima en Unidades de Compra.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="costPrice" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Costo por Unidad de Compra (Neto) *</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ej: 1500" {...field} /></FormControl>
                                     <FormDescription className="text-xs">Ej: Costo de la caja completa sin IVA.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="salePrice" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio Venta Público (PVP) *</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ej: 2990" {...field} /></FormControl>
                                     <FormDescription className="text-xs">Precio final de venta de la caja completa.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="mainProvider" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor Principal</FormLabel>
                                    <FormControl><Input placeholder="Ej: CENABAST" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ubicación en Bodega</FormLabel>
                                    <FormControl><Input placeholder="Ej: Estante A-03" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </CardContent>
                </Card>

                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                    <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Guardar Cambios' : 'Crear Producto'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-700">{title}</h3>
            <Icon className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
        </CardContent>
    </Card>
);

const ProductCard = ({ item, onEdit, onManageLots }: { item: InventoryItemWithStats; onEdit: (item: InventoryItem) => void; onManageLots: (item: InventoryItemWithStats) => void; }) => {
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
                    <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
                    <div className="flex items-center gap-2">
                        {item.requiresRefrigeration && <Snowflake className="h-5 w-5 text-blue-500" title="Requiere Cadena de Frío" />}
                        {item.isControlled && <Star className="h-5 w-5 text-amber-500" title="Sustancia Controlada" />}
                    </div>
                 </div>
                 <p className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-800">{item.quantity}</span>
                        <span className="text-slate-500">{item.unit}</span>
                    </div>
                    <Badge className={cn("font-semibold", badge)}>{item.status}</Badge>
                </div>
                <div className="text-sm">
                    <p className="text-slate-500">Próximo Vencimiento:</p>
                    <p className="font-medium text-slate-700">
                        {item.nextExpiryDate && !isNaN(parseISO(item.nextExpiryDate).getTime()) ? format(parseISO(item.nextExpiryDate), 'dd-MMMM-yyyy', {locale: es}) : 'N/A'}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3 flex flex-col items-stretch gap-2">
                <Button onClick={() => onManageLots(item)}>
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

const lotFormSchema = z.object({
  lotNumber: z.string().min(1, 'El N° de lote es requerido.'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0.'),
  expiryDate: z.date({ required_error: 'La fecha es requerida.' }),
});
type LotFormValues = z.infer<typeof lotFormSchema>;

function LotManagementDialog({ item, isOpen, onOpenChange, onSuccess }: { item: InventoryItem | null; isOpen: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: { lotNumber: '', quantity: 1, expiryDate: undefined },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ lotNumber: '', quantity: 1, expiryDate: undefined });
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  const onSubmit = async (data: LotFormValues) => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await addLotToInventoryItem(item.id, {
        lotNumber: data.lotNumber,
        quantity: data.quantity,
        expiryDate: data.expiryDate.toISOString(),
      });
      toast({ title: 'Lote Añadido', description: `Se ha añadido el lote ${data.lotNumber} al producto ${item.name}.` });
      onSuccess();
    } catch (error) {
      toast({ title: 'Error', description: `No se pudo añadir el lote. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestionar Lotes para: <span className="text-primary">{item?.name}</span></DialogTitle>
          <DialogDescription>Añada nuevos lotes o visualice el stock existente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Lotes Actuales</h3>
            <Card>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
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
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Añadir Nuevo Lote</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <FormField control={form.control} name="lotNumber" render={({ field }) => (
                    <FormItem><FormLabel>N° de Lote *</FormLabel><FormControl><Input placeholder="Ej: ABE4568" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Cantidad a Ingresar *</FormLabel><FormControl><Input type="number" placeholder="Ej: 100" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha Vencimiento *</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}/>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                  Añadir Lote
                </Button>
              </form>
            </Form>
          </div>
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

    // Form Dialog State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
    
    // Lot Management Dialog State
    const [managingLotsFor, setManagingLotsFor] = useState<InventoryItemWithStats | null>(null);

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
        router.refresh();
    };

    const handleAddNew = () => {
        setEditingItem(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    }

    const handleManageLots = (item: InventoryItemWithStats) => {
        setManagingLotsFor(item);
    };

    return (
        <>
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) {
                    setEditingItem(undefined);
                }
                setIsFormOpen(open);
            }}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold">{editingItem ? 'Editar Producto de Inventario' : 'Crear Producto'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {editingItem ? 'Actualice la configuración del producto.' : 'Configure un nuevo producto para la gestión de stock, lotes y su uso en recetas.'}
                        </DialogDescription>
                    </DialogHeader>
                    <InventoryItemForm item={editingItem} onFinished={handleFormFinished} />
                </DialogContent>
            </Dialog>
            <LotManagementDialog 
                item={managingLotsFor}
                isOpen={!!managingLotsFor}
                onOpenChange={(open) => { if (!open) setManagingLotsFor(null); }}
                onSuccess={() => {
                    setManagingLotsFor(null);
                    router.refresh();
                }}
            />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-slate-800">Gestión de Inventario</h1>
                    <p className="text-sm text-muted-foreground">
                        Control logístico y trazabilidad de los insumos de la farmacia.
                    </p>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Crear Producto
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
                        <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-500" />
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
                        <ProductCard key={item.id} item={item} onEdit={handleEdit} onManageLots={handleManageLots} />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 mt-8 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <Package className="h-16 w-16 text-slate-400 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700">No se encontraron productos</h2>
                        <p className="text-slate-500 mt-2 max-w-sm">
                            Intenta ajustar tu búsqueda o define un nuevo producto para empezar.
                        </p>
                        <Button className="mt-6" onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Producto
                        </Button>
                    </div>
                </Card>
            )}
        </>
    );
}

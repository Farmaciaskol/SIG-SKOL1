
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '@/hooks/use-toast';
import { addInventoryItem, updateInventoryItem } from '@/lib/data';
import type { InventoryItem } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { DialogFooter } from '../ui/dialog';

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

export const InventoryItemForm = ({ item, onFinished }: { item?: InventoryItem; onFinished: () => void }) => {
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField control={form.control} name="sku" render={({ field }) => (
                                <FormItem><FormLabel>Código Nacional / ISP</FormLabel><FormControl><Input placeholder="Ej: F-12345" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                <FormItem><FormLabel>Laboratorio / Fabricante</FormLabel><FormControl><Input placeholder="Ej: Bayer, Pfizer" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="barcode" render={({ field }) => (
                                <FormItem><FormLabel>Código de Barras</FormLabel><FormControl><Input placeholder="Ej: 780000123456" {...field} /></FormControl><FormMessage /></FormItem>
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

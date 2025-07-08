
'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { addInventoryItem, updateInventoryItem, InventoryItem } from '@/lib/data';
import { VADEMECUM_DATA } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  inventoryType: z.enum(['Fraccionamiento', 'Venta Directa'], { required_error: 'Debe seleccionar un tipo de inventario.'}),
  sku: z.string().optional(),
  unit: z.string().min(1, 'La unidad de compra es requerida.'),
  lowStockThreshold: z.coerce.number().min(0, 'El umbral debe ser 0 o mayor.'),
  costPrice: z.coerce.number().optional(),
  salePrice: z.coerce.number().optional(),
  isControlled: z.boolean().default(false),
  controlledType: z.enum(['Psicotrópico', 'Estupefaciente', '']).optional(),
  requiresRefrigeration: z.boolean().default(false),
  internalNotes: z.string().optional(),
  
  // Fractionation-specific fields
  activePrinciple: z.string().optional(),
  pharmaceuticalForm: z.string().optional(),
  doseValue: z.coerce.number().optional(),
  doseUnit: z.string().optional(),
  itemsPerBaseUnit: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.inventoryType === 'Fraccionamiento') {
        if (!data.activePrinciple?.trim()) {
            ctx.addIssue({ code: "custom", message: "Principio activo es requerido.", path: ["activePrinciple"] });
        }
        if (!data.pharmaceuticalForm?.trim()) {
            ctx.addIssue({ code: "custom", message: "Forma farmacéutica es requerida.", path: ["pharmaceuticalForm"] });
        }
        if (data.itemsPerBaseUnit === undefined || data.itemsPerBaseUnit <= 0) {
            ctx.addIssue({ code: "custom", message: "Items por unidad debe ser mayor a 0.", path: ["itemsPerBaseUnit"] });
        }
    }
});


type InventoryFormValues = z.infer<typeof inventoryItemSchema>;

interface InventoryItemFormProps {
  itemToEdit?: InventoryItem | Partial<InventoryItem>;
  onFinished: () => void;
}

export function InventoryItemForm({ itemToEdit, onFinished }: InventoryItemFormProps) {
    const { toast } = useToast();
    const isEditMode = !!(itemToEdit && 'id' in itemToEdit);

    const form = useForm<InventoryFormValues>({
        resolver: zodResolver(inventoryItemSchema),
        defaultValues: {
            name: '',
            inventoryType: 'Fraccionamiento',
            activePrinciple: '',
            sku: '',
            pharmaceuticalForm: '',
            doseValue: 0,
            doseUnit: 'mg',
            itemsPerBaseUnit: 1,
            unit: 'Caja',
            lowStockThreshold: 5,
            costPrice: 0,
            salePrice: 0,
            isControlled: false,
            controlledType: '',
            requiresRefrigeration: false,
            internalNotes: '',
        },
    });

    const productName = useWatch({ control: form.control, name: 'name' });
    const inventoryType = useWatch({ control: form.control, name: 'inventoryType' });

    useEffect(() => {
        if (productName && inventoryType === 'Fraccionamiento' && !form.getValues('activePrinciple')) {
            const lowerProductName = productName.toLowerCase().trim();
            const drugInfo = VADEMECUM_DATA.find(
                drug => drug.productName.toLowerCase().trim() === lowerProductName
            );
            if (drugInfo) {
                form.setValue('activePrinciple', drugInfo.activeIngredient, { shouldValidate: true });
                toast({
                    title: "Principio Activo Sugerido",
                    description: `Se ha autocompletado el principio activo "${drugInfo.activeIngredient}" basado en el nombre del producto.`,
                });
            }
        }
    }, [productName, inventoryType, form, toast]);

    useEffect(() => {
        if (itemToEdit) {
            form.reset({
                ...itemToEdit,
                inventoryType: itemToEdit.inventoryType || 'Venta Directa',
                doseValue: itemToEdit.doseValue || 0,
                itemsPerBaseUnit: itemToEdit.itemsPerBaseUnit || 1,
                lowStockThreshold: itemToEdit.lowStockThreshold || 5,
                costPrice: itemToEdit.costPrice || 0,
                salePrice: itemToEdit.salePrice || 0,
                controlledType: itemToEdit.controlledType || '',
            });
        } else {
            form.reset({
                 name: '',
                inventoryType: 'Fraccionamiento',
                activePrinciple: '',
                sku: '',
                pharmaceuticalForm: '',
                doseValue: 0,
                doseUnit: 'mg',
                itemsPerBaseUnit: 1,
                unit: 'Caja',
                lowStockThreshold: 5,
                costPrice: 0,
                salePrice: 0,
                isControlled: false,
                controlledType: '',
                requiresRefrigeration: false,
                internalNotes: '',
            });
        }
    }, [itemToEdit, form]);

    const onSubmit = async (values: InventoryFormValues) => {
        try {
            const dataToSave: Partial<InventoryItem> = { ...values };
            if (values.inventoryType === 'Venta Directa') {
                delete dataToSave.activePrinciple;
                delete dataToSave.pharmaceuticalForm;
                delete dataToSave.doseValue;
                delete dataToSave.doseUnit;
                delete dataToSave.itemsPerBaseUnit;
            }

            if (isEditMode && itemToEdit && 'id' in itemToEdit) {
                await updateInventoryItem(itemToEdit.id, dataToSave);
                toast({ title: 'Producto Actualizado', description: 'Los cambios se han guardado en la base de datos local.' });
            } else {
                await addInventoryItem(dataToSave as any); 
                toast({ title: 'Producto Creado', description: 'El nuevo producto se ha guardado en la base de datos local.' });
            }
            onFinished();
        } catch (error) {
            console.error("Failed to save inventory item:", error);
            toast({ title: 'Error', description: `No se pudo guardar el producto. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        }
    };
    
    const { isSubmitting } = form.formState;
    const currentInventoryType = form.watch('inventoryType');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2 max-h-[70vh] overflow-y-auto pr-4">
                
                 <FormField
                    control={form.control}
                    name="inventoryType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Inventario *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Fraccionamiento">Para Fraccionamiento Magistral</SelectItem>
                                    <SelectItem value="Venta Directa">Para Venta Directa (Comercial)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                                Seleccione si el producto se usará para crear preparados o si es un producto final para venta.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Producto *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                {currentInventoryType === 'Fraccionamiento' && (
                    <Card className="p-4 bg-muted/30">
                        <CardHeader className="p-0 pb-4"><CardTitle className="text-base text-primary">Datos para Fraccionamiento</CardTitle></CardHeader>
                        <CardContent className="p-0 space-y-4">
                             <FormField control={form.control} name="activePrinciple" render={({ field }) => (
                                <FormItem><FormLabel>Principio Activo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="pharmaceuticalForm" render={({ field }) => (
                                    <FormItem><FormLabel>Forma Farmacéutica *</FormLabel><FormControl><Input {...field} placeholder="Ej: Comprimido, Crema..." /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="itemsPerBaseUnit" render={({ field }) => (
                                    <FormItem><FormLabel>Items por Unidad Compra *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="doseValue" render={({ field }) => (
                                    <FormItem><FormLabel>Valor Dosis</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="doseUnit" render={({ field }) => (
                                    <FormItem><FormLabel>Unidad Dosis</FormLabel><FormControl><Input {...field} placeholder="Ej: mg, %, UI..." /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Unidad de Compra *</FormLabel><FormControl><Input {...field} placeholder="Ej: Caja, Frasco..." /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                        <FormItem><FormLabel>Umbral Stock Bajo *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="sku" render={({ field }) => (
                        <FormItem><FormLabel>SKU (para Lioren)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="costPrice" render={({ field }) => (
                        <FormItem><FormLabel>Precio Costo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="salePrice" render={({ field }) => (
                        <FormItem><FormLabel>Precio Venta</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                 <Separator />

                <div className="flex items-center space-x-6 pt-2">
                     <FormField control={form.control} name="isControlled" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                           <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                           <FormLabel className="!mt-0">Es Controlado</FormLabel>
                        </FormItem>
                    )}/>
                    {form.watch('isControlled') && (
                        <FormField control={form.control} name="controlledType" render={({ field }) => (
                            <FormItem className="flex-1">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Tipo de Controlado..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Psicotrópico">Psicotrópico</SelectItem>
                                        <SelectItem value="Estupefaciente">Estupefaciente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                    )}
                </div>
                 <FormField control={form.control} name="requiresRefrigeration" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                       <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                       <FormLabel className="!mt-0">Requiere Refrigeración</FormLabel>
                    </FormItem>
                )}/>

                <FormField control={form.control} name="internalNotes" render={({ field }) => (
                    <FormItem><FormLabel>Notas Internas</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )}/>


                <div className="flex justify-end pt-4 gap-2">
                    <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Guardar Cambios' : 'Crear Producto'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

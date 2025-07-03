
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getInventory, getPatients, getDoctors, logDirectSaleDispensation, Patient, Doctor, InventoryItem } from '@/lib/data';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface DirectSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

const directSaleSchema = z.object({
  patientId: z.string().min(1, "Debe seleccionar un paciente."),
  inventoryItemId: z.string().min(1, "Debe seleccionar un medicamento."),
  lotNumber: z.string().min(1, "Debe seleccionar un lote."),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
  doctorId: z.string().min(1, "Debe seleccionar un médico."),
  prescriptionType: z.enum(['Receta Cheque', 'Receta Retenida']),
  prescriptionFormat: z.enum(['electronic', 'physical']),
  electronicFolio: z.string().optional(),
  physicalScan: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.prescriptionFormat === 'electronic' && (!data.electronicFolio || data.electronicFolio.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El folio de la receta electrónica es requerido.",
            path: ["electronicFolio"],
        });
    }
    if (data.prescriptionFormat === 'physical' && !data.physicalScan) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe subir una imagen de la receta física.",
            path: ["physicalScan"],
        });
    }
});

type DirectSaleFormValues = z.infer<typeof directSaleSchema>;

export function DirectSaleDialog({ isOpen, onOpenChange, onSuccess }: DirectSaleDialogProps) {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [controlledInventory, setControlledInventory] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedMedication, setSelectedMedication] = useState<InventoryItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<DirectSaleFormValues>({
    resolver: zodResolver(directSaleSchema),
    defaultValues: {
      patientId: '',
      inventoryItemId: '',
      lotNumber: '',
      quantity: 1,
      doctorId: '',
      prescriptionType: 'Receta Retenida',
      prescriptionFormat: 'electronic',
      electronicFolio: '',
    },
  });

  useEffect(() => {
    async function loadInitialData() {
      if (!isOpen) return;
      setLoadingData(true);
      try {
        const [patientsData, doctorsData, inventoryData] = await Promise.all([
            getPatients(),
            getDoctors(),
            getInventory(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setInventory(inventoryData);
        setControlledInventory(inventoryData.filter(item => item.isControlled));
      } catch (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos para el formulario.", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, [isOpen, toast]);

  useEffect(() => {
    if (!isOpen) {
        form.reset();
        setPreviewImage(null);
        setSelectedMedication(null);
    }
  }, [isOpen, form]);

  const handleMedicationChange = (itemId: string) => {
    const med = inventory.find(i => i.id === itemId);
    setSelectedMedication(med || null);
    form.setValue('lotNumber', '');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('physicalScan', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: DirectSaleFormValues) => {
    try {
        await logDirectSaleDispensation({
            patientId: data.patientId,
            doctorId: data.doctorId,
            inventoryItemId: data.inventoryItemId,
            lotNumber: data.lotNumber,
            quantity: data.quantity,
            prescriptionFolio: data.electronicFolio || `Fisica-${Date.now()}`,
            prescriptionType: data.prescriptionType,
            controlledRecipeFormat: data.prescriptionFormat,
            prescriptionImageFile: data.prescriptionFormat === 'physical' ? data.physicalScan : undefined,
        });

        toast({
            title: "Dispensación Exitosa",
            description: "El registro fue creado y el stock actualizado.",
        });
        onSuccess();
        onOpenChange(false);
    } catch (error) {
        console.error("Dispensation failed:", error);
        toast({
            title: "Error en la Dispensación",
            description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
            variant: "destructive",
        });
    }
  };
  
  const { isSubmitting } = form.formState;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Registrar Venta Directa Controlada</DialogTitle>
          <DialogDescription>
            Complete los detalles para registrar una dispensación que no proviene de una receta magistral.
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-4">
                    
                    <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Paciente *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar paciente..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="doctorId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Médico Prescriptor *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar médico..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {doctors.map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="inventoryItemId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Medicamento *</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); handleMedicationChange(value); }} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Buscar medicamento controlado..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {controlledInventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lotNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Lote / Envase *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMedication}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar lote..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {selectedMedication?.lots?.filter(l => l.quantity > 0).map(lot => <SelectItem key={lot.lotNumber} value={lot.lotNumber}>Lote: {lot.lotNumber} (Disp: {lot.quantity}, Vto: {format(new Date(lot.expiryDate), 'MM/yy')})</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cantidad de envases a dispensar *</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="prescriptionType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Receta *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Receta Retenida">Receta Retenida</SelectItem>
                                    <SelectItem value="Receta Cheque">Receta Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="md:col-span-2">
                        <Controller
                            control={form.control}
                            name="prescriptionFormat"
                            render={({ field }) => (
                                <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="electronic">Receta Electrónica</TabsTrigger>
                                        <TabsTrigger value="physical">Receta Física</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="electronic" className="mt-4">
                                        <FormField
                                            control={form.control}
                                            name="electronicFolio"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Folio Electrónico *</FormLabel>
                                                <FormControl><Input placeholder="Ej: 8ioh8-ufpdn-0mwdd-jkgsn" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                    <TabsContent value="physical" className="mt-4">
                                        <FormItem>
                                            <FormLabel>Escanear o subir receta física *</FormLabel>
                                            <FormControl>
                                                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary relative" onClick={() => fileInputRef.current?.click()}>
                                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                                    {previewImage ? (
                                                        <>
                                                            <Image src={previewImage} alt="Vista previa" width={150} height={100} className="rounded-md object-contain max-h-24"/>
                                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-background/50" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); form.setValue('physicalScan', null); }}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <div className="text-center">
                                                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
                                                            <p className="text-sm text-muted-foreground">Clic para subir imagen</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage className="mt-2" />
                                        </FormItem>
                                    </TabsContent>
                                </Tabs>
                            )}
                        />
                    </div>
                    <div className="md:col-span-2 pt-4">
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Dispensación
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

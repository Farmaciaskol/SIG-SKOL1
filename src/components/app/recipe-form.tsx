

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, PlusCircle, X, Image as ImageIcon, Loader2, Wand2, Bot, Calendar as CalendarIcon, Trash2, Snowflake } from 'lucide-react';
import { getPatients, getDoctors, getRecipe, getExternalPharmacies, Patient, Doctor, ExternalPharmacy, saveRecipe, RecipeStatus, getAppSettings, AppSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { extractRecipeDataFromImage } from '@/ai/flows/extract-recipe-data-from-image';
import { simplifyInstructions } from '@/ai/flows/simplify-instructions';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { addMonths } from 'date-fns';
import { PHARMACEUTICAL_FORM_DEFAULTS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Zod schema for form validation
const recipeItemSchema = z.object({
  principalActiveIngredient: z.string().min(1, "El Principio Activo Principal es requerido."),
  pharmaceuticalForm: z.string().min(1, "La Forma Farmacéutica es requerida."),
  concentrationValue: z.string().min(1, "El valor de la Concentración es requerido."),
  concentrationUnit: z.string().min(1, "La unidad de la Concentración es requerida."),
  dosageValue: z.string().min(1, "El valor de la Dosis es requerido."),
  dosageUnit: z.string().min(1, "La unidad de la Dosis es requerida."),
  frequency: z.string().min(1, "La Frecuencia es requerida."),
  treatmentDurationValue: z.string().min(1, "El valor de la Duración del Tratamiento es requerido."),
  treatmentDurationUnit: z.string().min(1, "La unidad de la Duración del Tratamiento es requerida."),
  totalQuantityValue: z.string().min(1, "El valor de la Cantidad Total es requerido."),
  totalQuantityUnit: z.string().min(1, "La unidad de la Cantidad Total es requerida."),
  usageInstructions: z.string().min(1, "Las Instrucciones de Uso son requeridas."),
  requiresFractionation: z.boolean().optional(),
  isRefrigerated: z.boolean().default(false).optional(),
});

const recipeFormSchema = z.object({
  prescriptionDate: z.date({ required_error: "La fecha de prescripción es requerida." }),
  dueDate: z.date().optional(),
  patientSelectionType: z.enum(['existing', 'new']).default('existing'),
  patientId: z.string().optional(),
  newPatientName: z.string().optional(),
  newPatientRut: z.string().optional(),
  dispatchAddress: z.string().optional(),
  doctorSelectionType: z.enum(['existing', 'new']).default('existing'),
  doctorId: z.string().optional(),
  newDoctorName: z.string().optional(),
  newDoctorLicense: z.string().optional(),
  newDoctorRut: z.string().optional(),
  newDoctorSpecialty: z.string().optional(),
  externalPharmacyId: z.string().min(1, 'Debe seleccionar un recetario.'),
  supplySource: z.string().min(1, 'Debe seleccionar un origen de insumos.'),
  preparationCost: z.coerce.number().min(0, 'El costo de preparación debe ser un número positivo.'),
  transportCost: z.coerce.number().min(0, 'El costo de despacho debe ser un número positivo.').optional(),
  isControlled: z.boolean().default(false).optional(),
  controlledRecipeType: z.string().optional(),
  controlledRecipeFolio: z.string().optional(),
  items: z.array(recipeItemSchema).min(1, 'Debe haber al menos un ítem en la receta.'),
}).refine(data => data.patientSelectionType === 'existing' ? !!data.patientId : !!data.newPatientName && !!data.newPatientRut, {
  message: 'Debe seleccionar un paciente existente o ingresar el nombre y RUT de uno nuevo.',
  path: ['patientId'],
}).refine(data => data.doctorSelectionType === 'existing' ? !!data.doctorId : !!data.newDoctorName && !!data.newDoctorLicense && !!data.newDoctorSpecialty, {
    message: 'Debe seleccionar un médico existente o ingresar nombre, N° colegiatura y especialidad de uno nuevo.',
    path: ['doctorId']
}).superRefine((data, ctx) => {
    if (data.isControlled) {
        if (!data.controlledRecipeType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El tipo de receta controlada es requerido.",
                path: ["controlledRecipeType"],
            });
        }
        if (!data.controlledRecipeFolio?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El folio de la receta es requerido.",
                path: ["controlledRecipeFolio"],
            });
        }
    }
});


type RecipeFormValues = z.infer<typeof recipeFormSchema>;

interface RecipeFormProps {
    recipeId?: string;
    copyFromId?: string;
}

const defaultItem = {
  principalActiveIngredient: '',
  pharmaceuticalForm: '',
  concentrationValue: '',
  concentrationUnit: '',
  dosageValue: '',
  dosageUnit: '',
  frequency: '',
  treatmentDurationValue: '30',
  treatmentDurationUnit: 'días',
  totalQuantityValue: '',
  totalQuantityUnit: '',
  usageInstructions: '',
  requiresFractionation: false,
  isRefrigerated: false,
};

export function RecipeForm({ recipeId, copyFromId }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!recipeId;

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      prescriptionDate: new Date(),
      dueDate: addMonths(new Date(), 6),
      patientSelectionType: 'existing',
      patientId: '',
      newPatientName: '',
      newPatientRut: '',
      dispatchAddress: '',
      doctorSelectionType: 'existing',
      doctorId: '',
      newDoctorName: '',
      newDoctorLicense: '',
      newDoctorRut: '',
      newDoctorSpecialty: '',
      externalPharmacyId: '',
      supplySource: '',
      preparationCost: 0,
      transportCost: 0,
      isControlled: false,
      controlledRecipeType: '',
      controlledRecipeFolio: '',
      items: [defaultItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const loadFormData = useCallback(async (recipeData: any) => {
    const valuesToSet = {
        ...recipeData,
        prescriptionDate: recipeData.prescriptionDate ? parseISO(recipeData.prescriptionDate) : new Date(),
        dueDate: recipeData.dueDate ? parseISO(recipeData.dueDate) : addMonths(new Date(), 6),
        patientSelectionType: recipeData.patientId ? 'existing' : 'new',
        doctorSelectionType: recipeData.doctorId ? 'existing' : 'new',
        patientId: recipeData.patientId ?? '',
        newPatientName: recipeData.newPatientName ?? '',
        newPatientRut: recipeData.newPatientRut ?? '',
        dispatchAddress: recipeData.dispatchAddress ?? '',
        doctorId: recipeData.doctorId ?? '',
        newDoctorName: recipeData.newDoctorName ?? '',
        newDoctorLicense: recipeData.newDoctorLicense ?? '',
        newDoctorRut: recipeData.newDoctorRut ?? '',
        newDoctorSpecialty: recipeData.newDoctorSpecialty ?? '',
        externalPharmacyId: recipeData.externalPharmacyId ?? '',
        supplySource: recipeData.supplySource ?? '',
        preparationCost: recipeData.preparationCost ?? 0,
        transportCost: recipeData.transportCost ?? 0,
        isControlled: recipeData.isControlled ?? false,
        controlledRecipeType: recipeData.controlledRecipeType ?? '',
        controlledRecipeFolio: recipeData.controlledRecipeFolio ?? '',
        items: recipeData.items && recipeData.items.length > 0 ? recipeData.items : [defaultItem],
    };
    form.reset(valuesToSet);

    if (recipeData.prescriptionImageUrl) {
      setPreviewImage(recipeData.prescriptionImageUrl);
    }
  }, [form]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsData, doctorsData, externalPharmaciesData, settingsData] = await Promise.all([
            getPatients(), 
            getDoctors(),
            getExternalPharmacies(),
            getAppSettings(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setExternalPharmacies(externalPharmaciesData);
        setAppSettings(settingsData);

        const recipeToLoad = copyFromId || recipeId;

        if (recipeToLoad) {
            const recipeData = await getRecipe(recipeToLoad);
            if (recipeData) {
                if (copyFromId) {
                    const today = new Date();
                    const expiry = addMonths(today, 6);
                    const newRecipeData = {
                        ...recipeData,
                        status: RecipeStatus.PendingValidation,
                        paymentStatus: 'Pendiente',
                        prescriptionDate: today,
                        dueDate: expiry,
                    };
                    delete (newRecipeData as any).id;
                    delete (newRecipeData as any).createdAt;
                    delete (newRecipeData as any).updatedAt;
                    delete (newRecipeData as any).auditTrail;

                    await loadFormData(newRecipeData);
                    toast({ title: 'Receta Duplicada', description: 'Revisa los datos y guarda la nueva receta.' });
                } else { // Editing
                    await loadFormData(recipeData);
                }
            } else {
                 toast({ title: 'Error', description: 'No se encontró la receta.', variant: 'destructive' });
                 router.push('/recipes');
            }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos necesarios.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [recipeId, copyFromId, toast, router, form, loadFormData]);

  const watchedItems = form.watch('items');
  const patientSelectionType = form.watch('patientSelectionType');
  const doctorSelectionType = form.watch('doctorSelectionType');
  const selectedPharmacyId = form.watch('externalPharmacyId');

  useEffect(() => {
    if (selectedPharmacyId) {
        const selectedPharmacy = externalPharmacies.find(p => p.id === selectedPharmacyId);
        if (selectedPharmacy && selectedPharmacy.transportCost) {
            form.setValue('transportCost', selectedPharmacy.transportCost);
        }
    }
  }, [selectedPharmacyId, externalPharmacies, form]);

  useEffect(() => {
    const calculateTotals = () => {
      watchedItems.forEach((item, index) => {
        const { dosageValue, frequency, treatmentDurationValue, treatmentDurationUnit } = item;
        
        const dose = parseFloat(dosageValue);
        const freq = parseInt(frequency, 10);
        const duration = parseInt(treatmentDurationValue, 10);

        if (!isNaN(dose) && !isNaN(freq) && freq > 0 && !isNaN(duration)) {
          let durationInDays = duration;
          if (treatmentDurationUnit === 'semanas') {
            durationInDays = duration * 7;
          } else if (treatmentDurationUnit === 'meses') {
            durationInDays = duration * 30; // Approximation
          }
          
          const administrationsPerDay = 24 / freq;
          const totalQuantity = Math.ceil(administrationsPerDay * durationInDays);

          const currentTotalVal = form.getValues(`items.${index}.totalQuantityValue`);
          if (String(totalQuantity) !== currentTotalVal) {
            form.setValue(`items.${index}.totalQuantityValue`, String(totalQuantity), { shouldValidate: true });
          }
        }
      });
    };
    calculateTotals();
  }, [watchedItems, form]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractWithAI = async () => {
    if (!previewImage) {
      toast({ title: 'Error', description: 'Por favor, selecciona un archivo primero.', variant: 'destructive' });
      return;
    }
    setIsAiExtracting(true);
    try {
      const result = await extractRecipeDataFromImage({ photoDataUri: previewImage });
      
      if (result.patientName) {
        form.setValue('newPatientName', result.patientName);
        form.setValue('patientSelectionType', 'new');
      }
      if (result.patientRut) form.setValue('newPatientRut', result.patientRut);
      if (result.doctorName) {
        form.setValue('newDoctorName', result.doctorName);
        form.setValue('doctorSelectionType', 'new');
      }
      if (result.doctorRut) form.setValue('newDoctorRut', result.doctorRut);
      if (result.doctorLicense) form.setValue('newDoctorLicense', result.doctorLicense);
      if (result.doctorSpecialty) form.setValue('newDoctorSpecialty', result.doctorSpecialty);
      if (result.prescriptionDate) form.setValue('prescriptionDate', parseISO(result.prescriptionDate));
      
      if (result.items && result.items.length > 0) {
        const filledItems = result.items.map(item => ({ ...defaultItem, ...item }));
        form.setValue('items', filledItems);
      }

      toast({ title: 'Extracción Exitosa', description: 'Los campos del formulario han sido pre-rellenados.' });
    } catch (error) {
      console.error('AI extraction failed:', error);
      toast({ title: 'Error de IA', description: 'No se pudo extraer la información de la imagen.', variant: 'destructive' });
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleSimplifyInstructions = async (index: number) => {
    const instructions = form.getValues(`items.${index}.usageInstructions`);
    if (!instructions) {
      toast({ title: 'Sin instrucciones', description: 'No hay texto para simplificar.', variant: 'default' });
      return;
    }
    setIsSimplifying(index);
    try {
      const simplified = await simplifyInstructions(instructions);
      form.setValue(`items.${index}.usageInstructions`, simplified);
      toast({ title: 'Instrucciones Simplificadas', description: 'El texto ha sido actualizado.' });
    } catch (error) {
      console.error('Simplification failed:', error);
      toast({ title: 'Error de IA', description: 'No se pudo simplificar el texto.', variant: 'destructive' });
    } finally {
      setIsSimplifying(null);
    }
  };
  
  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const finalRecipeId = isEditMode && !copyFromId ? recipeId : undefined;
      await saveRecipe(data, previewImage, finalRecipeId);
      toast({ title: isEditMode && !copyFromId ? 'Receta Actualizada' : 'Receta Creada', description: 'Los datos se han guardado correctamente.' });
      router.push('/recipes');
      router.refresh();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      toast({ title: 'Error al Guardar', description: 'No se pudo guardar la receta. Por favor, intente de nuevo.', variant: 'destructive' });
    }
  };

  const isControlled = form.watch('isControlled');
  const supplySource = form.watch('supplySource');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando formulario...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Imagen de la Receta</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                {previewImage ? (
                  <Image src={previewImage} alt="Vista previa de receta" width={200} height={150} className="rounded-md object-contain max-h-40"/>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500 mb-1">Arrastra o haz clic</p>
                    <p className="text-xs text-slate-500">Sube la imagen de la receta</p>
                  </>
                )}
              </div>
              <Button type="button" className="w-full mt-4" onClick={handleExtractWithAI} disabled={!previewImage || isAiExtracting}>
                {isAiExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                {isAiExtracting ? 'Extrayendo...' : 'Extraer con IA'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-8">
              {/* --- INFORMACIÓN GENERAL --- */}
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-slate-700">Información General</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormItem>
                    <FormLabel>ID Receta</FormLabel>
                    <FormControl>
                      <Input disabled value={isEditMode && !copyFromId ? recipeId : "Nuevo (se genera al guardar)"} />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="prescriptionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Prescripción *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-slate-500")}>
                                {field.value ? format(field.value, 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Vencimiento</FormLabel>
                         <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-slate-500")}>
                                {field.value ? format(field.value, 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                          </PopoverContent>
                        </Popover>
                        <FormDescription className="text-xs text-slate-500">(Por defecto 6 meses, editable.)</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* --- PACIENTE --- */}
              <div>
                 <h2 className="text-2xl font-semibold mb-4 text-slate-700">Paciente *</h2>
                 <FormField
                    control={form.control}
                    name="patientSelectionType"
                    render={({ field }) => (
                        <Tabs value={field.value} onValueChange={(value) => field.onChange(value as 'existing' | 'new')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="existing">Paciente Existente</TabsTrigger>
                                <TabsTrigger value="new">Paciente Nuevo</TabsTrigger>
                            </TabsList>
                            <TabsContent value="existing" className="mt-4">
                                <FormField control={form.control} name="patientId" render={({ field }) => (
                                    <FormItem><FormLabel>Buscar Paciente</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un paciente..." /></SelectTrigger></FormControl>
                                            <SelectContent><>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>)}</></SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </TabsContent>
                            <TabsContent value="new" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="newPatientName" render={({ field }) => (<FormItem><FormLabel>Nombre Paciente</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="newPatientRut" render={({ field }) => (<FormItem><FormLabel>RUT Paciente</FormLabel><FormControl><Input placeholder="12.345.678-9" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                />
                 <FormField control={form.control} name="dispatchAddress" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Dirección de Despacho</FormLabel><FormControl><Input placeholder="Ej: Calle Falsa 123, Comuna" {...field} /></FormControl><FormDescription className="text-xs text-slate-500">(Opcional. Por defecto, se retira en farmacia.)</FormDescription><FormMessage /></FormItem>)} />
              </div>

               <Separator />

              {/* --- MÉDICO --- */}
               <div>
                 <h2 className="text-2xl font-semibold mb-4 text-slate-700">Médico *</h2>
                 <FormField
                    control={form.control}
                    name="doctorSelectionType"
                    render={({ field }) => (
                        <Tabs value={field.value} onValueChange={(value) => field.onChange(value as 'existing' | 'new')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="existing">Médico Existente</TabsTrigger>
                                <TabsTrigger value="new">Médico Nuevo</TabsTrigger>
                            </TabsList>
                            <TabsContent value="existing" className="mt-4">
                                <FormField control={form.control} name="doctorId" render={({ field }) => (
                                    <FormItem><FormLabel>Buscar Médico</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un médico..." /></SelectTrigger></FormControl>
                                            <SelectContent><>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name} - {d.specialty}</SelectItem>)}</>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </TabsContent>
                            <TabsContent value="new" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="newDoctorName" render={({ field }) => (<FormItem><FormLabel>Nombre Médico</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="newDoctorLicense" render={({ field }) => (<FormItem><FormLabel>N° Colegiatura</FormLabel><FormControl><Input placeholder="Ej: 12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="newDoctorRut" render={({ field }) => (<FormItem><FormLabel>RUT Médico (Opcional)</FormLabel><FormControl><Input placeholder="12.345.678-K" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="newDoctorSpecialty" render={({ field }) => (<FormItem><FormLabel>Especialidad Médico</FormLabel><FormControl><Input placeholder="Ej: Cardiología" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6 text-slate-700">Recetario e Insumos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FormField
                    control={form.control}
                    name="externalPharmacyId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recetario Asignado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccione un recetario..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {externalPharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="supplySource"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Origen de Insumos *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccione un origen..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Stock del Recetario">Stock del Recetario</SelectItem>
                            <SelectItem value="Insumos de Skol">Insumos de Skol</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="md:col-span-1">
                    <FormField
                        control={form.control}
                        name="preparationCost"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Costo Preparación (CLP) *</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Ej: 15000" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">Costo que Skol pagará al recetario.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <div className="md:col-span-1">
                    <FormField
                        control={form.control}
                        name="transportCost"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Costo de Despacho (CLP)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Ej: 3500" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">Se llena por defecto al elegir el recetario.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-slate-700">Preparado Magistral</h2>
                    <Button type="button" variant="link" onClick={() => append(defaultItem)} className="text-primary hover:text-primary/80">
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                    </Button>
                </div>

                <div className="space-y-6">
                    {fields.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/30">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-primary">Ítem #{index + 1}</h3>
                             {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600 h-7 w-7" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar Ítem</span>
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name={`items.${index}.principalActiveIngredient`} render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                    <FormLabel>Principio Activo Principal *</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <FormField control={form.control} name={`items.${index}.pharmaceuticalForm`} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Forma Farmacéutica *</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            const defaults = PHARMACEUTICAL_FORM_DEFAULTS[value];
                                            if (defaults && appSettings) {
                                                form.setValue(`items.${index}.concentrationUnit`, defaults.concentrationUnit, { shouldValidate: true });
                                                form.setValue(`items.${index}.dosageUnit`, defaults.dosageUnit, { shouldValidate: true });
                                                form.setValue(`items.${index}.totalQuantityUnit`, defaults.totalQuantityUnit, { shouldValidate: true });
                                            }
                                        }}
                                        value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {appSettings?.pharmaceuticalForms.map(unit => <SelectItem key={unit} value={unit.toLowerCase()}>{unit}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name={`items.${index}.concentrationValue`} render={({ field }) => (
                                <FormItem><FormLabel>Concentración (Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name={`items.${index}.concentrationUnit`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Concentración (Unidad) *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {appSettings?.concentrationUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name={`items.${index}.dosageValue`} render={({ field }) => (
                                <FormItem><FormLabel>Dosis (Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name={`items.${index}.dosageUnit`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dosis (Unidad) *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {appSettings?.dosageUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <FormField control={form.control} name={`items.${index}.frequency`} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Frecuencia (horas) *</FormLabel>
                                    <FormControl><Input placeholder="Ej: 8, 12, 24" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name={`items.${index}.treatmentDurationValue`} render={({ field }) => (
                                <FormItem><FormLabel>Duración Trat. (Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name={`items.${index}.treatmentDurationUnit`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duración Trat. (Unidad) *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {appSettings?.treatmentDurationUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name={`items.${index}.totalQuantityValue`} render={({ field }) => (
                                <FormItem><FormLabel>Cant. Total (Valor) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name={`items.${index}.totalQuantityUnit`} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cant. Total (Unidad) *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Unidad..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {appSettings?.quantityToPrepareUnits.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <FormField control={form.control} name={`items.${index}.usageInstructions`} render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                    <FormLabel>Instrucciones de Uso *</FormLabel>
                                    <FormControl><Textarea placeholder="Instrucciones de uso para el paciente..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                         {supplySource === 'Insumos de Skol' && (
                            <FormField
                                control={form.control}
                                name={`items.${index}.requiresFractionation`}
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel className="!mt-0 font-normal text-sm text-slate-700">
                                        Insumo provisto por Skol (para fraccionamiento)
                                    </FormLabel>
                                </FormItem>
                                )}
                            />
                        )}
                        
                        <FormField
                            control={form.control}
                            name={`items.${index}.isRefrigerated`}
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal text-sm text-slate-700">
                                    El preparado final requiere refrigeración
                                </FormLabel>
                            </FormItem>
                            )}
                        />

                        <div className="flex justify-start">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSimplifyInstructions(index)} disabled={isSimplifying === index}>
                                {isSimplifying === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                {isSimplifying === index ? 'Simplificando...' : 'Simplificar (IA)'}
                            </Button>
                        </div>
                    </div>
                    ))}
                </div>

                <FormField
                    control={form.control}
                    name="items"
                    render={() => (
                        <FormItem>
                        <FormMessage className="mt-4" />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-700">Medicamento Controlado</h2>
                <FormField
                    control={form.control}
                    name="isControlled"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <FormLabel className="font-normal">Es Controlado</FormLabel>
                    </FormItem>
                    )}
                />
                </div>

                {isControlled && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="controlledRecipeType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Receta Controlada *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccione tipo..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Receta Cheque">Receta Cheque</SelectItem>
                                <SelectItem value="Receta Retenida">Receta Retenida</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="controlledRecipeFolio"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Folio Receta *</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej: F123456 o Folio Cheque" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormItem>
                            <FormLabel>Folio Interno Skol</FormLabel>
                            <FormControl>
                                <Input disabled placeholder="Se genera automáticamente" />
                            </FormControl>
                        </FormItem>
                        <FormItem>
                            <FormLabel>Adjuntar Imagen Receta Controlada (Opcional)</FormLabel>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline">Seleccionar archivo</Button>
                                <span className="text-xs text-slate-500">Sin archivos seleccionados</span>
                            </div>
                        </FormItem>
                    </div>
                </div>
                )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/recipes">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode && !copyFromId ? 'Guardar Cambios' : 'Guardar Receta'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

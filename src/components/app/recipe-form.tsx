
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Upload, PlusCircle, X, Image as ImageIcon, Loader2, Wand2, Bot, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { getPatients, getDoctors, getRecipe, getExternalPharmacies, Patient, Doctor, ExternalPharmacy, saveRecipe, RecipeStatus } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { extractRecipeDataFromImage } from '@/ai/flows/extract-recipe-data-from-image';
import { simplifyInstructions } from '@/ai/flows/simplify-instructions';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addMonths } from 'date-fns';
import { PHARMACEUTICAL_FORMS, CONCENTRATION_UNITS, DOSAGE_UNITS, TREATMENT_DURATION_UNITS, QUANTITY_TO_PREPARE_UNITS, PHARMACEUTICAL_FORM_DEFAULTS } from '@/lib/constants';

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
});

const recipeFormSchema = z.object({
  prescriptionDate: z.string({ required_error: "La fecha de prescripción es requerida." }),
  expiryDate: z.string().optional(),
  patientId: z.string().optional(),
  newPatientName: z.string().optional(),
  newPatientRut: z.string().optional(),
  dispatchAddress: z.string().optional(),
  doctorId: z.string().optional(),
  newDoctorName: z.string().optional(),
  newDoctorLicense: z.string().optional(),
  newDoctorRut: z.string().optional(),
  newDoctorSpecialty: z.string().optional(),
  externalPharmacyId: z.string().min(1, 'Debe seleccionar un recetario externo.'),
  supplySource: z.string().min(1, 'Debe seleccionar un origen de insumos.'),
  preparationCost: z.string().min(1, 'El costo de preparación es requerido.'),
  isControlled: z.boolean().default(false).optional(),
  controlledRecipeType: z.string().optional(),
  controlledRecipeFolio: z.string().optional(),
  items: z.array(recipeItemSchema).min(1, 'Debe haber al menos un ítem en la receta.'),
}).refine(data => data.patientId || (data.newPatientName && data.newPatientRut), {
  message: 'Debe seleccionar un paciente existente o ingresar los datos de uno nuevo (nombre y RUT).',
  path: ['patientId'],
}).refine(data => data.doctorId || (data.newDoctorName && data.newDoctorLicense && data.newDoctorSpecialty), {
    message: 'Debe seleccionar un médico existente o ingresar los datos de uno nuevo (nombre, N° colegiatura y especialidad).',
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
};

export function RecipeForm({ recipeId, copyFromId }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!recipeId;

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      items: [defaultItem],
      isControlled: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const loadFormData = useCallback(async (recipeData: any) => {
    form.reset({
      ...recipeData,
      prescriptionDate: recipeData.prescriptionDate ? format(new Date(recipeData.prescriptionDate), 'yyyy-MM-dd') : '',
      expiryDate: recipeData.dueDate ? format(new Date(recipeData.dueDate), 'yyyy-MM-dd') : '',
      preparationCost: recipeData.preparationCost?.toString(),
      patientId: recipeData.patientId,
      doctorId: recipeData.doctorId,
      isControlled: recipeData.isControlled || false,
      items: recipeData.items.length > 0 ? recipeData.items : [defaultItem],
    });
    if (recipeData.prescriptionImageUrl) {
      setPreviewImage(recipeData.prescriptionImageUrl);
    }
  }, [form]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsData, doctorsData, externalPharmaciesData] = await Promise.all([
            getPatients(), 
            getDoctors(),
            getExternalPharmacies(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setExternalPharmacies(externalPharmaciesData);

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
                        prescriptionDate: format(today, 'yyyy-MM-dd'),
                        expiryDate: format(expiry, 'yyyy-MM-dd'),
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
        } else {
            // Set default dates for new recipes
            const today = new Date();
            const expiry = addMonths(today, 6);
            form.setValue('prescriptionDate', format(today, 'yyyy-MM-dd'));
            form.setValue('expiryDate', format(expiry, 'yyyy-MM-dd'));
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
      
      if (result.patientName) form.setValue('newPatientName', result.patientName);
      if (result.patientRut) form.setValue('newPatientRut', result.patientRut);
      if (result.doctorName) form.setValue('newDoctorName', result.doctorName);
      if (result.doctorRut) form.setValue('newDoctorRut', result.doctorRut);
      if (result.doctorLicense) form.setValue('newDoctorLicense', result.doctorLicense);
      if (result.doctorSpecialty) form.setValue('newDoctorSpecialty', result.doctorSpecialty);
      if (result.prescriptionDate) form.setValue('prescriptionDate', result.prescriptionDate);
      
      if (result.items && result.items.length > 0) {
        // AI might not return all fields, so we merge with defaults
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
            <CardContent className="p-6">
              <div 
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                {previewImage ? (
                  <Image src={previewImage} alt="Vista previa de receta" width={200} height={150} className="rounded-md object-contain max-h-40"/>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Arrastra o haz clic</p>
                    <p className="text-xs text-muted-foreground">Sube la imagen de la receta</p>
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
                <h2 className="text-xl font-semibold mb-4 text-foreground">Información General</h2>
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
                              <Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(new Date(field.value), 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} initialFocus />
                          </PopoverContent>
                        </Popover>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Vencimiento</FormLabel>
                         <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full justify-between text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(new Date(field.value), 'dd-MM-yyyy') : <span>dd-mm-aaaa</span>}
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} />
                          </PopoverContent>
                        </Popover>
                        <FormDescription className="text-xs">(Por defecto 6 meses, editable.)</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* --- PACIENTE --- */}
              <div>
                 <h2 className="text-xl font-semibold mb-4 text-foreground">Paciente</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2">
                        <FormField
                            control={form.control}
                            name="patientId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Paciente *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Seleccione o ingrese nuevo abajo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField control={form.control} name="newPatientName" render={({ field }) => (<FormItem><FormLabel>Nombre Paciente (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newPatientRut" render={({ field }) => (<FormItem><FormLabel>RUT Paciente (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="12.345.678-9" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="md:col-span-2">
                         <FormField control={form.control} name="dispatchAddress" render={({ field }) => (<FormItem><FormLabel>Dirección de Despacho</FormLabel><FormControl><Input placeholder="Ej: Calle Falsa 123, Comuna" {...field} value={field.value ?? ''} /></FormControl><FormDescription className="text-xs">(Opcional. Por defecto, se retira en farmacia.)</FormDescription><FormMessage /></FormItem>)} />
                    </div>
                 </div>
              </div>

               <Separator />

              {/* --- MÉDICO --- */}
               <div>
                 <h2 className="text-xl font-semibold mb-4 text-foreground">Médico</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div className="md:col-span-2">
                        <FormField
                            control={form.control}
                            name="doctorId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Médico *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Seleccione o ingrese nuevo abajo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name} - {d.specialty}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField control={form.control} name="newDoctorName" render={({ field }) => (<FormItem><FormLabel>Nombre Médico (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorLicense" render={({ field }) => (<FormItem><FormLabel>N° Colegiatura (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Ej: 12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorRut" render={({ field }) => (<FormItem><FormLabel>RUT Médico (Opcional)</FormLabel><FormControl><Input placeholder="12.345.678-K" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorSpecialty" render={({ field }) => (<FormItem><FormLabel>Especialidad Médico (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Ej: Cardiología" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-foreground">Recetario e Insumos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="externalPharmacyId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recetario Externo Asignado *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccione un origen..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Stock del Recetario Externo">Stock del Recetario Externo</SelectItem>
                            <SelectItem value="Insumos de Skol">Insumos de Skol</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="md:col-span-2">
                    <FormField
                        control={form.control}
                        name="preparationCost"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Costo Preparación (CLP) *</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej: 15000" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription className="text-xs">Costo que Skol pagará al recetario.</FormDescription>
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
                    <h2 className="text-xl font-semibold text-foreground">Preparado Magistral</h2>
                    <Button type="button" variant="link" onClick={() => append(defaultItem)} className="text-primary hover:text-primary/80">
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                    </Button>
                </div>

                <div className="space-y-6">
                    {fields.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                        <div className="flex justify-end">
                             {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600 absolute top-2 right-2" onClick={() => remove(index)}>
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
                                            if (defaults) {
                                                form.setValue(`items.${index}.concentrationUnit`, defaults.concentrationUnit, { shouldValidate: true });
                                                form.setValue(`items.${index}.dosageUnit`, defaults.dosageUnit, { shouldValidate: true });
                                                form.setValue(`items.${index}.totalQuantityUnit`, defaults.totalQuantityUnit, { shouldValidate: true });
                                            }
                                        }}
                                        defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {PHARMACEUTICAL_FORMS.map(unit => <SelectItem key={unit} value={unit.toLowerCase()}>{unit}</SelectItem>)}
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
                                            {CONCENTRATION_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                                            {DOSAGE_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                                            {TREATMENT_DURATION_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                                            {QUANTITY_TO_PREPARE_UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                <h2 className="text-xl font-semibold text-foreground">Medicamento Controlado</h2>
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
                        <FormLabel className="font-normal text-sm">Es Controlado</FormLabel>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Input placeholder="Ej: F123456 o Folio Cheque" {...field} value={field.value ?? ''}/>
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
                                <span className="text-sm text-muted-foreground">Sin archivos seleccionados</span>
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

    
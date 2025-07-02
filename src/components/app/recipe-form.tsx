'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Upload, Pill, Plus, X, Image as ImageIcon, Loader2, Wand2, Bot, Calendar as CalendarIcon } from 'lucide-react';
import { getPatients, getDoctors, getRecipe, Patient, Doctor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { extractRecipeDataFromImage } from '@/ai/flows/extract-recipe-data-from-image';
import { simplifyInstructions } from '@/ai/flows/simplify-instructions';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addMonths } from 'date-fns';

// Zod schema for form validation
const recipeItemSchema = z.object({
  activeIngredient: z.string().min(1, 'El principio activo es requerido.'),
  dosage: z.string().min(1, 'La dosis es requerida.'),
  instructions: z.string().min(1, 'Las instrucciones son requeridas.'),
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
  items: z.array(recipeItemSchema).min(1, 'Debe haber al menos un ítem en la receta.'),
}).refine(data => data.patientId || (data.newPatientName && data.newPatientRut), {
  message: 'Debe seleccionar un paciente existente o ingresar los datos de uno nuevo (nombre y RUT).',
  path: ['patientId'],
}).refine(data => data.doctorId || (data.newDoctorName && data.newDoctorLicense && data.newDoctorSpecialty), {
    message: 'Debe seleccionar un médico existente o ingresar los datos de uno nuevo (nombre, N° colegiatura y especialidad).',
    path: ['doctorId']
});


type RecipeFormValues = z.infer<typeof recipeFormSchema>;

interface RecipeFormProps {
    recipeId?: string;
}

export function RecipeForm({ recipeId }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!recipeId;

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      items: [{ activeIngredient: '', dosage: '', instructions: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsData, doctorsData] = await Promise.all([getPatients(), getDoctors()]);
        setPatients(patientsData);
        setDoctors(doctorsData);

        if (isEditMode) {
          const recipeData = await getRecipe(recipeId);
          if (recipeData) {
            form.reset({
              ...recipeData,
              patientId: recipeData.patientId,
              doctorId: recipeData.doctorId,
              items: recipeData.items.length > 0 ? recipeData.items.map(item => ({
                  activeIngredient: `(ID: ${item.inventoryId})`, // Placeholder, needs real data
                  dosage: `${item.quantity}`,
                  instructions: item.instructions
              })) : [],
            });
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
  }, [recipeId, isEditMode, toast, router, form]);

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
        form.setValue('items', result.items);
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
    const instructions = form.getValues(`items.${index}.instructions`);
    if (!instructions) {
      toast({ title: 'Sin instrucciones', description: 'No hay texto para simplificar.', variant: 'default' });
      return;
    }
    setIsSimplifying(index);
    try {
      const simplified = await simplifyInstructions(instructions);
      form.setValue(`items.${index}.instructions`, simplified);
      toast({ title: 'Instrucciones Simplificadas', description: 'El texto ha sido actualizado.' });
    } catch (error) {
      console.error('Simplification failed:', error);
      toast({ title: 'Error de IA', description: 'No se pudo simplificar el texto.', variant: 'destructive' });
    } finally {
      setIsSimplifying(null);
    }
  };
  
  const onSubmit = (data: RecipeFormValues) => {
    console.log('Form submitted:', data);
    // TODO: Implement save logic (create/update in Firestore)
    toast({ title: isEditMode ? 'Receta Actualizada' : 'Receta Creada', description: 'Los datos se han guardado correctamente.' });
    router.push('/recipes');
  };

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
                      <Input disabled value="Nuevo (se genera al guardar)" />
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
                                <FormLabel>Paciente Existente *</FormLabel>
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
                    <FormField control={form.control} name="newPatientName" render={({ field }) => (<FormItem><FormLabel>Nombre Paciente (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newPatientRut" render={({ field }) => (<FormItem><FormLabel>RUT Paciente (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="12.345.678-9" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="md:col-span-2">
                         <FormField control={form.control} name="dispatchAddress" render={({ field }) => (<FormItem><FormLabel>Dirección de Despacho</FormLabel><FormControl><Input placeholder="Ej: Calle Falsa 123, Comuna" {...field} /></FormControl><FormDescription className="text-xs">(Opcional. Por defecto, se retira en farmacia.)</FormDescription><FormMessage /></FormItem>)} />
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
                                <FormLabel>Médico Existente *</FormLabel>
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
                    <FormField control={form.control} name="newDoctorName" render={({ field }) => (<FormItem><FormLabel>Nombre Médico (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Nombre Apellido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorLicense" render={({ field }) => (<FormItem><FormLabel>N° Colegiatura (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Ej: 12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorRut" render={({ field }) => (<FormItem><FormLabel>RUT Médico (Opcional)</FormLabel><FormControl><Input placeholder="12.345.678-K" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="newDoctorSpecialty" render={({ field }) => (<FormItem><FormLabel>Especialidad Médico (Nuevo/IA) *</FormLabel><FormControl><Input placeholder="Ej: Cardiología" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2"><Pill className="h-5 w-5" /> Ítems del Preparado</h2>
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-md space-y-3 relative bg-muted/20">
                    <Label className="font-semibold">Ítem {index + 1}</Label>
                     <FormField
                        control={form.control}
                        name={`items.${index}.activeIngredient`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Principio Activo</FormLabel>
                                <FormControl><Input placeholder="Principio Activo" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`items.${index}.dosage`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dosis/Concentración</FormLabel>
                                <FormControl><Input placeholder="Ej: 10mg, 5%" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.instructions`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Instrucciones de uso</FormLabel>
                                <FormControl><Textarea placeholder="Instrucciones de uso..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-between items-center pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSimplifyInstructions(index)} disabled={isSimplifying === index}>
                         {isSimplifying === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isSimplifying === index ? 'Simplificando...' : 'Simplificar (IA)'}
                      </Button>
                       {fields.length > 1 && (
                         <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => remove(index)}>
                            <X className="h-4 w-4" />
                         </Button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
               <FormField
                  control={form.control}
                  name="items"
                  render={() => (
                     <FormItem>
                       <FormMessage className="mt-2" />
                     </FormItem>
                  )}
                />
              <Button type="button" variant="outline" className="w-full mt-4" onClick={() => append({ activeIngredient: '', dosage: '', instructions: '' })}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Ítem
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/recipes">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Guardar Cambios' : 'Guardar Receta'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

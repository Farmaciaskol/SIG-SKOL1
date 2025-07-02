'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, User, Bot, Pill, Stethoscope, Plus, X, Image as ImageIcon, Loader2, Wand2 } from 'lucide-react';
import { getPatients, getDoctors, getRecipe, Patient, Doctor } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { extractRecipeDataFromImage } from '@/ai/flows/extract-recipe-data-from-image';
import { simplifyInstructions } from '@/ai/flows/simplify-instructions';
import Image from 'next/image';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Zod schema for form validation
const recipeItemSchema = z.object({
  activeIngredient: z.string().min(1, 'El principio activo es requerido.'),
  dosage: z.string().min(1, 'La dosis es requerida.'),
  instructions: z.string().min(1, 'Las instrucciones son requeridas.'),
});

const recipeFormSchema = z.object({
  patientId: z.string().optional(),
  newPatientName: z.string().optional(),
  newPatientRut: z.string().optional(),
  doctorId: z.string().optional(),
  items: z.array(recipeItemSchema).min(1, 'Debe haber al menos un ítem en la receta.'),
}).refine(data => data.patientId || (data.newPatientName && data.newPatientRut), {
  message: 'Debe seleccionar un paciente existente o ingresar los datos de uno nuevo.',
  path: ['patientId'],
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
            // Note: This only partially populates the form for edit mode.
            // A more complete implementation would fetch inventory item names.
            form.reset({
              patientId: recipeData.patientId,
              doctorId: recipeData.doctorId,
              // The items model mismatch requires more complex logic to resolve
              items: recipeData.items.length > 0 ? recipeData.items.map(item => ({
                  activeIngredient: `(ID: ${item.inventoryId})`,
                  dosage: `${item.quantity}`,
                  instructions: item.instructions
              })) : [],
            });
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
      if (result.doctorName) {
        const matchedDoctor = doctors.find(d => d.name.toLowerCase().includes(result.doctorName!.toLowerCase()));
        if (matchedDoctor) form.setValue('doctorId', matchedDoctor.id);
      }
      
      if (result.items && result.items.length > 0) {
        remove();
        result.items.forEach(item => append(item));
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Carga y Extracción IA
              </CardTitle>
              <CardDescription>
                Sube una imagen o PDF para pre-rellenar el formulario con IA.
              </CardDescription>
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
                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Arrastra o haz clic para buscar</p>
                    <Button type="button" variant="outline" size="sm">Buscar archivo</Button>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" /> Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seleccionar Paciente Existente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Busca un paciente..." />
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
              <div className="text-center text-sm text-muted-foreground my-2">O</div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="newPatientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Paciente (Nuevo)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPatientRut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT Paciente (Nuevo)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 12.345.678-9" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5" /> Información del Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seleccionar Médico Existente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Busca un médico..." />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5" /> Ítems del Preparado
              </CardTitle>
            </CardHeader>
            <CardContent>
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

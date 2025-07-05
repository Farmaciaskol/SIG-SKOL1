
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPatients, getRecipes, addPharmacovigilanceReport } from '@/lib/data';
import type { Patient, Recipe } from '@/lib/types';
import { PharmacovigilanceSeverity, PharmacovigilanceOutcome } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';


const reportSchema = z.object({
  reporterName: z.string().min(1, 'El nombre del reportador es requerido.'),
  patientId: z.string().min(1, 'Debe seleccionar un paciente.'),
  
  isMagistral: z.boolean().default(true),
  recipeId: z.string().optional(),
  suspectedMedicationName: z.string().min(1, 'Debe especificar el medicamento.'),
  dose: z.string().optional(),
  pharmaceuticalForm: z.string().optional(),
  lotNumber: z.string().optional(),

  reactionStartDate: z.date({ required_error: 'La fecha de inicio de la reacción es requerida.'}),
  severity: z.nativeEnum(PharmacovigilanceSeverity, { required_error: 'La gravedad es requerida.'}),
  outcome: z.nativeEnum(PharmacovigilanceOutcome, { required_error: 'El desenlace es requerido.'}),
  problemDescription: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  concomitantMedications: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function NewPharmacovigilanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reporterName: '',
      isMagistral: true,
      concomitantMedications: '',
      lotNumber: '',
      dose: '',
      pharmaceuticalForm: ''
    },
  });

  const selectedPatientId = form.watch('patientId');
  const isMagistral = form.watch('isMagistral');

  const filteredRecipes = useMemo(() => {
    if (!selectedPatientId) return [];
    return recipes.filter(r => r.patientId === selectedPatientId);
  }, [selectedPatientId, recipes]);
  
  useEffect(() => {
    const selectedRecipeId = form.getValues('recipeId');
    if(isMagistral && selectedRecipeId) {
        const recipe = recipes.find(r => r.id === selectedRecipeId);
        if (recipe && recipe.items.length > 0) {
            const item = recipe.items[0];
            form.setValue('suspectedMedicationName', item.principalActiveIngredient);
            form.setValue('dose', `${item.concentrationValue}${item.concentrationUnit}`);
            form.setValue('pharmaceuticalForm', item.pharmaceuticalForm);
            form.setValue('lotNumber', recipe.internalPreparationLot || '');
        }
    } else if (!isMagistral) {
        form.setValue('suspectedMedicationName', '');
        form.setValue('dose', '');
        form.setValue('pharmaceuticalForm', '');
        form.setValue('lotNumber', '');
    }
  }, [isMagistral, recipes, form]);


  useEffect(() => {
    if (user?.displayName) {
        form.setValue('reporterName', user.displayName);
    } else if (user?.email) {
        form.setValue('reporterName', user.email);
    }
  }, [user, form]);
  
  const initialPatientId = searchParams.get('patientId');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, recipesData] = await Promise.all([
        getPatients(),
        getRecipes(),
      ]);
      setPatients(patientsData);
      setRecipes(recipesData);
      
      if(initialPatientId) {
          form.setValue('patientId', initialPatientId);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, initialPatientId, form]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: ReportFormValues) => {
    const patient = patients.find(p => p.id === data.patientId);
    if (!patient) {
        toast({ title: "Error", description: "No se pudo encontrar al paciente seleccionado.", variant: "destructive" });
        return;
    }
    
    // Calculate age
    let age;
    if (patient.rut) {
        try {
            const rutYear = parseInt(patient.rut.split('-')[0].slice(-2));
            const currentYear = new Date().getFullYear() % 100;
            let birthYear = (rutYear > currentYear) ? 1900 + rutYear : 2000 + rutYear;
            age = new Date().getFullYear() - birthYear;
        } catch(e) { /* ignore */ }
    }


    try {
      const reportId = await addPharmacovigilanceReport({
          ...data,
          reporterName: user?.displayName || user?.email || 'Sistema',
          patientInfoSnapshot: {
              name: patient.name,
              rut: patient.rut,
              gender: patient.gender || 'Otro',
              age: age,
          },
          reactionStartDate: data.reactionStartDate.toISOString(),
      });
      toast({
        title: "Reporte de FV Creado",
        description: "El nuevo reporte ha sido registrado exitosamente.",
      });
      router.push(`/pharmacovigilance/${reportId}`);
    } catch (error) {
      console.error("Failed to create report:", error);
      toast({
        title: "Error al Crear Reporte",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    }
  };
  
  const { isSubmitting } = form.formState;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/pharmacovigilance">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Nuevo Reporte de Farmacovigilancia</h1>
          <p className="text-sm text-muted-foreground">
            Registre un nuevo evento adverso o problema de calidad para su seguimiento.
          </p>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>1. Información del Paciente y Notificador</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Paciente *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={loading ? "Cargando..." : "Seleccione un paciente"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {patients.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reporterName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Reportador *</FormLabel>
                            <FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>2. Medicamento Sospechoso</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="isMagistral"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-start gap-4 space-y-0">
                            <FormLabel>¿Es un Preparado Magistral?</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                        )}
                    />
                    {isMagistral ? (
                        <FormField
                            control={form.control}
                            name="recipeId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Receta Magistral Asociada</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPatientId}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={!selectedPatientId ? "Seleccione un paciente primero" : "Seleccione una receta..."} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {filteredRecipes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.items[0]?.principalActiveIngredient} - {format(new Date(r.createdAt), 'dd/MM/yy')}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    ) : (
                         <FormField
                            control={form.control}
                            name="suspectedMedicationName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre del Medicamento *</FormLabel>
                                <FormControl><Input placeholder="Ej: Losartan 50mg" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="dose" render={({ field }) => (<FormItem><FormLabel>Dosis</FormLabel><FormControl><Input placeholder="Ej: 50 mg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="pharmaceuticalForm" render={({ field }) => (<FormItem><FormLabel>Forma Farmacéutica</FormLabel><FormControl><Input placeholder="Ej: Comprimido" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="lotNumber" render={({ field }) => (<FormItem><FormLabel>Lote</FormLabel><FormControl><Input placeholder="Ej: F12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>3. Descripción de la Reacción Adversa</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <FormField control={form.control} name="reactionStartDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Fecha Inicio Reacción *</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="severity" render={({ field }) => (
                             <FormItem><FormLabel>Gravedad *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent>{Object.values(PharmacovigilanceSeverity).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                        <FormField control={form.control} name="outcome" render={({ field }) => (
                            <FormItem><FormLabel>Desenlace *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent>{Object.values(PharmacovigilanceOutcome).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                    </div>
                     <FormField
                        control={form.control}
                        name="problemDescription"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción Detallada de la Reacción *</FormLabel>
                            <FormControl><Textarea rows={5} placeholder="Describa la reacción, cuándo ocurrió, qué medidas se tomaron, etc." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="concomitantMedications"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Otros Medicamentos en Uso (Concomitantes)</FormLabel>
                            <FormControl><Textarea placeholder="Liste otros medicamentos que el paciente estaba tomando, separados por comas." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
                 <CardFooter>
                  <Button type="submit" disabled={isSubmitting || loading}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Reporte
                  </Button>
                </CardFooter>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}


'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getPatients,
  getRecipes,
  getExternalPharmacies,
  addPharmacovigilanceReport,
  Patient,
  Recipe,
  ExternalPharmacy,
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

const reportSchema = z.object({
  reporterName: z.string().min(1, 'El nombre del reportador es requerido.'),
  patientId: z.string().optional(),
  recipeId: z.string().optional(),
  externalPharmacyId: z.string().optional(),
  involvedMedications: z.string().min(1, 'Debe especificar al menos un medicamento.'),
  problemDescription: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function NewPharmacovigilanceReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reporterName: '',
      patientId: '',
      recipeId: '',
      externalPharmacyId: '',
      involvedMedications: '',
      problemDescription: '',
    },
  });

  useEffect(() => {
    if (user?.displayName) {
        form.setValue('reporterName', user.displayName);
    } else if (user?.email) {
        form.setValue('reporterName', user.email);
    }
  }, [user, form]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, recipesData, pharmaciesData] = await Promise.all([
        getPatients(),
        getRecipes(),
        getExternalPharmacies(),
      ]);
      setPatients(patientsData);
      setRecipes(recipesData);
      setExternalPharmacies(pharmaciesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para el formulario.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: ReportFormValues) => {
    try {
      const reportId = await addPharmacovigilanceReport(data);
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
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Reporte</CardTitle>
              <CardDescription>Complete la información relevante al evento. Los campos marcados con * son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="reporterName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre del Reportador *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="involvedMedications"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Medicamento(s) Involucrado(s) *</FormLabel>
                        <FormControl><Input placeholder="Ej: Minoxidil 5%, Aspirina 100mg" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               </div>
               
                <FormField
                    control={form.control}
                    name="problemDescription"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descripción del Problema / Evento Adverso *</FormLabel>
                        <FormControl><Textarea rows={5} placeholder="Describa detalladamente el problema detectado o el evento adverso reportado por el paciente..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <Card className="bg-muted/50">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Contexto (Opcional)</CardTitle>
                        <CardDescription>Asocie el reporte a entidades existentes para mejorar la trazabilidad.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <FormField
                            control={form.control}
                            name="patientId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Paciente</FormLabel>
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
                            name="recipeId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Receta</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={loading ? "Cargando..." : "Seleccione una receta"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {recipes.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.id} ({r.items[0]?.principalActiveIngredient || 'N/A'})</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="externalPharmacyId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Recetario</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={loading ? "Cargando..." : "Seleccione un recetario"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {externalPharmacies.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Creando Reporte...' : 'Crear Reporte'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

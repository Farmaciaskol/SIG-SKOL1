
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPatient, getRecipes, Patient, Recipe, RecipeStatus } from '@/lib/data';
import { analyzePatientHistory } from '@/ai/flows/analyze-patient-history';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, User, Mail, Phone, Heart, Bot, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { statusConfig } from '@/lib/constants';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [patientData, allRecipes] = await Promise.all([
        getPatient(id),
        getRecipes(),
      ]);

      if (patientData) {
        setPatient(patientData);
        setRecipes(allRecipes.filter(r => r.patientId === id));
      } else {
        toast({ title: 'Error', description: 'Paciente no encontrado.', variant: 'destructive' });
        router.push('/patients');
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del paciente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalyzeHistory = async () => {
    if (!patient) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const magistralMedications = recipes.flatMap(r => r.items.map(i => `${i.principalActiveIngredient} ${i.concentrationValue}${i.concentrationUnit}`));
      const commercialMedications = patient.commercialMedications || [];
      const allergies = patient.allergies || [];

      const result = await analyzePatientHistory({
        magistralMedications,
        commercialMedications,
        allergies,
      });
      setAnalysis(result.analysis);
      toast({ title: 'Análisis Completo', description: 'Se ha generado el análisis de interacciones y riesgos.' });
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast({ title: 'Error de IA', description: 'No se pudo completar el análisis.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos del paciente...</p>
      </div>
    );
  }

  if (!patient) {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">RUT: {patient.rut}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Información de Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.rut}</span></div>
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email}</span></div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Estado Crónico y Alergias</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {patient.isChronic ? <Heart className="h-5 w-5 text-pink-500" /> : <Heart className="h-5 w-5 text-slate-300" />}
                <p>{patient.isChronic ? 'Paciente Crónico' : 'Paciente No Crónico'}</p>
              </div>
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold">Alergias Conocidas:</h4>
                  <ul className="list-disc pl-5 text-sm text-destructive">
                    {patient.allergies.map((allergy, i) => <li key={i}>{allergy}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
           <Card>
            <CardHeader><CardTitle>Medicamentos Comerciales</CardTitle></CardHeader>
            <CardContent>
              {patient.commercialMedications && patient.commercialMedications.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {patient.commercialMedications.map((med, i) => <li key={i}>{med}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No hay medicamentos comerciales registrados.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-2">
           <Card>
            <CardHeader>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Análisis de Historial con IA</CardTitle>
                  <Button onClick={handleAnalyzeHistory} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                      {isAnalyzing ? 'Analizando...' : 'Analizar Historial'}
                  </Button>
              </div>
              <CardDescription>Evalúa posibles interacciones entre todas las medicaciones del paciente.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-32">
              {isAnalyzing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generando análisis...</span>
                </div>
              )}
              {analysis && (
                <div className="prose prose-sm max-w-none rounded-md border bg-muted/50 p-4">
                  <p>{analysis}</p>
                </div>
              )}
               {!isAnalyzing && !analysis && (
                 <div className="flex items-center justify-center gap-2 text-muted-foreground text-center p-4">
                    <p>Haga clic en el botón para generar un análisis de riesgos y recomendaciones.</p>
                </div>
               )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historial de Recetas Magistrales</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Receta</TableHead>
                    <TableHead>Preparado Principal</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.length > 0 ? recipes.map(recipe => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <Link href={`/recipes/${recipe.id}`} className="font-mono text-primary hover:underline">
                          {recipe.id}
                        </Link>
                      </TableCell>
                      <TableCell>{recipe.items[0]?.principalActiveIngredient || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(recipe.createdAt), 'dd-MM-yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={recipe.status === RecipeStatus.Dispensed ? 'default' : 'secondary'}>
                            {statusConfig[recipe.status]?.icon ? <statusConfig[recipe.status].icon className="mr-1 h-3 w-3" /> : null}
                            {recipe.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={4} className="text-center">No hay recetas magistrales para este paciente.</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

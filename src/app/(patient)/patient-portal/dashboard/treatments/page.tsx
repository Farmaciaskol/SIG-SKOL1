
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getRecipes } from '@/lib/data';
import { requestRepreparationFromPortal, getMedicationInfo, analyzePatientInteractions } from '@/lib/patient-actions';
import { Recipe, RecipeStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Pill, Info, Copy, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import type { CheckMedicationInteractionsOutput } from '@/ai/flows/check-medication-interactions';

const MagistralRecipeManager = ({ recipe }: { recipe: Recipe }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { patient } = usePatientAuth();
    const [user] = useAuthState(auth);

    const dispensationsCount = recipe.auditTrail?.filter(t => t.status === RecipeStatus.Dispensed).length || 0;
    const isExpired = new Date(recipe.dueDate) < new Date();
    const cycleLimitReached = dispensationsCount >= MAX_REPREPARATIONS;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    
    const handleRequest = async () => {
        if (!patient || !user) return;
        setIsSubmitting(true);
        try {
            await requestRepreparationFromPortal(recipe.id, patient.id, user.uid);
            toast({
                title: 'Solicitud Enviada',
                description: 'Hemos notificado a la farmacia. Procesaremos tu solicitud a la brevedad.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo enviar la solicitud.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <CardFooter className="flex-col items-start gap-4 pt-4">
             {canReprepare ? (
                 <div className="w-full">
                     <p className="text-sm text-muted-foreground mb-2">Este preparado está listo para solicitar un nuevo ciclo.</p>
                     <Button className="w-full" onClick={handleRequest} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Copy className="h-4 w-4" />}
                         Solicitar Re-preparación (Ciclo {dispensationsCount + 1}/{MAX_REPREPARATIONS})
                     </Button>
                 </div>
             ) : (
                <div className="w-full p-3 rounded-md bg-muted/50 text-sm">
                     <p className="font-semibold text-muted-foreground mb-1">No se puede solicitar una nueva preparación por el siguiente motivo:</p>
                    {recipe.status !== RecipeStatus.Dispensed && <p className="text-amber-700">- La preparación anterior aún no ha sido dispensada.</p>}
                    {isExpired && <p className="text-amber-700">- La receta original ha vencido.</p>}
                    {cycleLimitReached && <p className="text-amber-700">- Se ha alcanzado el límite de {MAX_REPREPARATIONS} preparaciones para esta receta.</p>}
                </div>
             )}
        </CardFooter>
    );
}

const InteractionDialog = ({ isOpen, onOpenChange, analysisResult }: { isOpen: boolean, onOpenChange: (open: boolean) => void, analysisResult: CheckMedicationInteractionsOutput | null }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Análisis de Interacciones (IA)</DialogTitle>
                    <DialogDescription>Posibles interacciones entre tus medicamentos y alergias. Consulta siempre a tu médico o farmacéutico.</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4">
                    {analysisResult?.drugInteractions && analysisResult.drugInteractions.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 text-destructive">Interacciones entre Medicamentos</h3>
                            {analysisResult.drugInteractions.map((interaction, index) => (
                                <div key={`drug-${index}`} className="p-3 mb-2 border-l-4 border-destructive bg-destructive/10 rounded-r-md">
                                    <p className="font-bold">{interaction.medicationsInvolved.join(' + ')}</p>
                                    <p><Badge variant="destructive">{interaction.severity}</Badge> {interaction.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                     {analysisResult?.allergyInteractions && analysisResult.allergyInteractions.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 text-orange-600">Posibles Reacciones Alérgicas</h3>
                             {analysisResult.allergyInteractions.map((interaction, index) => (
                                <div key={`allergy-${index}`} className="p-3 mb-2 border-l-4 border-orange-500 bg-orange-500/10 rounded-r-md">
                                    <p className="font-bold">{interaction.medication} y Alergia a {interaction.allergy}</p>
                                    <p>{interaction.explanation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                     {(!analysisResult?.drugInteractions || analysisResult.drugInteractions.length === 0) && (!analysisResult?.allergyInteractions || analysisResult.allergyInteractions.length === 0) && (
                        <div className="text-center py-8">
                            <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                            <p className="font-semibold">No se encontraron interacciones significativas.</p>
                        </div>
                     )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function TreatmentsPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<CheckMedicationInteractionsOutput | null>(null);
    const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
    const { toast } = useToast();

    const activeMagistralRecipes = useMemo(() => {
        return recipes.filter(r => ![RecipeStatus.Cancelled, RecipeStatus.Rejected, RecipeStatus.Archived].includes(r.status));
    }, [recipes]);
    
    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoadingData(true);
        const recipesData = await getRecipes(patient.id);
        setRecipes(recipesData);
        setLoadingData(false);
    }, [patient]);

    useEffect(() => {
        if (!patientLoading && patient) {
            fetchData();
        } else if (!patientLoading && !patient) {
            setLoadingData(false);
        }
    }, [patient, patientLoading, fetchData]);

    const handleAnalyzeInteractions = async () => {
        if (!patient) return;
        setIsAnalyzing(true);
        try {
            const magistralMeds = activeMagistralRecipes.map(r => `${r.items[0]?.principalActiveIngredient || ''} ${r.items[0]?.concentrationValue || ''}${r.items[0]?.concentrationUnit || ''}`);
            const commercialMeds = patient.commercialMedications || [];
            const allMeds = [...magistralMeds, ...commercialMeds].filter(Boolean);

            const result = await analyzePatientInteractions({
                medications: allMeds,
                allergies: patient.allergies || [],
            });
            setAnalysisResult(result);
            setIsInteractionDialogOpen(true);
        } catch (error) {
            toast({ title: "Error en Análisis", description: "No se pudo completar el análisis de interacciones.", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    }

    if (loadingData || patientLoading) {
        return <div className="flex items-center justify-center pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!patient) {
        return <p>No se pudo cargar la información del paciente.</p>
    }

    return (
        <>
        <InteractionDialog isOpen={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen} analysisResult={analysisResult} />
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Mis Tratamientos</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Análisis de Seguridad</CardTitle>
                    <CardDescription>Utiliza nuestra IA para revisar posibles interacciones entre tus medicamentos y alergias. Esta herramienta es una ayuda y no reemplaza el consejo médico.</CardDescription>
                </CardHeader>
                <CardFooter>
                     <Button onClick={handleAnalyzeInteractions} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <HeartPulse className="mr-2 h-4 w-4"/>}
                        Verificar Interacciones (IA)
                    </Button>
                </CardFooter>
            </Card>

            <section>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Preparados Magistrales</h2>
                 {activeMagistralRecipes.length > 0 ? (
                     <div className="space-y-4">
                        {activeMagistralRecipes.map(recipe => (
                            <Card key={recipe.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</CardTitle>
                                        <Badge variant={recipe.status === 'Dispensada' ? 'default' : 'secondary'}>{recipe.status}</Badge>
                                    </div>
                                    <CardDescription>Vence el: {format(parseISO(recipe.dueDate), 'dd MMMM, yyyy', {locale: es})}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{recipe.items[0]?.usageInstructions}</p>
                                </CardContent>
                                {recipe.status === RecipeStatus.Dispensed && (
                                     <MagistralRecipeManager recipe={recipe}/>
                                )}
                            </Card>
                        ))}
                     </div>
                 ) : (
                    <p className="text-muted-foreground">No tienes preparados magistrales activos en este momento.</p>
                 )}
            </section>
            
            <Separator />
            
             <section>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Medicamentos Comerciales</h2>
                {(patient.commercialMedications && patient.commercialMedications.length > 0) ? (
                     <div className="space-y-4">
                        {patient.commercialMedications.map(med => (
                            <Card key={med}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>{med}</CardTitle>
                                    {/* Link to external info or IA simple explainer could go here */}
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No tienes medicamentos comerciales registrados.</p>
                )}
            </section>

        </div>
        </>
    );
}

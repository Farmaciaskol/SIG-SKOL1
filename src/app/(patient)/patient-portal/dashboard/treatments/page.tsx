'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getRecipes } from '@/lib/data';
import { requestRepreparationFromPortal, getMedicationInfo } from '@/lib/patient-actions';
import { Recipe, RecipeStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Loader2, Pill, Info, Copy, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

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
                <div className="w-full">
                     <p className="font-semibold text-muted-foreground">No se puede solicitar una nueva preparación por el siguiente motivo:</p>
                    {recipe.status !== RecipeStatus.Dispensed && <p className="text-sm text-amber-700">- La preparación anterior aún no ha sido dispensada.</p>}
                    {isExpired && <p className="text-sm text-amber-700">- La receta original ha vencido.</p>}
                    {cycleLimitReached && <p className="text-sm text-amber-700">- Se ha alcanzado el límite de {MAX_REPREPARATIONS} preparaciones para esta receta.</p>}
                </div>
             )}
        </CardFooter>
    );
}

const CommercialMedInfo = ({ medName }: { medName: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [info, setInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleFetchInfo = async () => {
        if (info) {
            setIsOpen(true);
            return;
        }
        setIsLoading(true);
        setIsOpen(true);
        try {
            const result = await getMedicationInfo(medName);
            setInfo(result);
        } catch(e) {
            toast({ title: 'Error', description: 'No se pudo obtener la información del medicamento.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Button variant="outline" size="sm" onClick={handleFetchInfo}>
                <Info className="mr-2 h-4 w-4" /> Más Info (IA)
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{medName}</DialogTitle>
                        <DialogDescription>Información simplificada generada por IA.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <p className="whitespace-pre-wrap">{info}</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function TreatmentsPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const activeMagistralRecipes = useMemo(() => {
        return recipes.filter(r => r.status !== RecipeStatus.Cancelled && r.status !== RecipeStatus.Rejected && r.status !== RecipeStatus.Archived);
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

    if (loadingData || patientLoading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!patient) {
        return <p>No se pudo cargar la información del paciente.</p>
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/patient-portal/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Mis Tratamientos</h1>
            </div>

            <section>
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Preparados Magistrales</h2>
                 {activeMagistralRecipes.length > 0 ? (
                     <div className="space-y-4">
                        {activeMagistralRecipes.map(recipe => (
                            <Card key={recipe.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</CardTitle>
                                        <Badge variant="secondary">{recipe.status}</Badge>
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
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Medicamentos Comerciales</h2>
                {(patient.commercialMedications && patient.commercialMedications.length > 0) ? (
                     <div className="space-y-4">
                        {patient.commercialMedications.map(med => (
                            <Card key={med}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>{med}</CardTitle>
                                    <CommercialMedInfo medName={med} />
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No tienes medicamentos comerciales registrados.</p>
                )}
            </section>

        </div>
    );
}

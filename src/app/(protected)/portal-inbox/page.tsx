'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRecipes, getPatients, updateRecipe } from '@/lib/data';
import type { Recipe, Patient, AuditTrailEntry } from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Inbox, FileCheck2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function PortalInboxPage() {
    const [pendingRecipes, setPendingRecipes] = useState<Recipe[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [recipeToReject, setRecipeToReject] = useState<Recipe | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const allRecipes = await getRecipes();
            const portalRecipes = allRecipes.filter(r => r.status === RecipeStatus.PendingReviewPortal);
            setPendingRecipes(portalRecipes);

            const patientsData = await getPatients();
            setPatients(patientsData);
        } catch (error) {
            console.error('Failed to fetch portal inbox data:', error);
            toast({ title: "Error", description: "No se pudieron cargar las recetas del portal.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'Desconocido';

    const handleRejectRecipe = async () => {
        if (!recipeToReject || !rejectionReason.trim()) {
            toast({ title: 'Error', description: 'Debe ingresar un motivo para el rechazo.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const newAuditEntry: AuditTrailEntry = {
                status: RecipeStatus.Rejected,
                date: new Date().toISOString(),
                userId: 'system-user', // Replace with actual user ID
                notes: `Rechazado desde bandeja de entrada. Motivo: ${rejectionReason}`
            };
            const updates: Partial<Recipe> = { 
                status: RecipeStatus.Rejected,
                rejectionReason: rejectionReason,
                auditTrail: [...(recipeToReject.auditTrail || []), newAuditEntry],
            };
            await updateRecipe(recipeToReject.id, updates);
            toast({ title: 'Receta Rechazada', description: 'La receta ha sido movida a los registros rechazados.' });
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Failed to reject recipe:', error);
            toast({ title: 'Error', description: 'No se pudo rechazar la receta.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setRecipeToReject(null);
            setRejectionReason('');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-slate-600">Cargando bandeja de entrada...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-slate-800">Bandeja de Entrada del Portal</h1>
                    <p className="text-sm text-muted-foreground">
                        Revise, procese o rechace las recetas enviadas por los pacientes desde su portal.
                    </p>
                </div>

                {pendingRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingRecipes.map(recipe => (
                            <Card key={recipe.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">{getPatientName(recipe.patientId)}</CardTitle>
                                    <CardDescription>
                                        Enviada el {format(parseISO(recipe.createdAt), 'dd MMMM, yyyy', { locale: es })}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex items-center justify-center bg-muted/50 p-2">
                                    {recipe.prescriptionImageUrl ? (
                                        <Image
                                            src={recipe.prescriptionImageUrl}
                                            alt={`Receta de ${getPatientName(recipe.patientId)}`}
                                            width={300}
                                            height={200}
                                            className="rounded-md object-contain max-h-52"
                                        />
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            <p>No hay imagen disponible.</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-3 bg-muted/50 grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full" onClick={() => setRecipeToReject(recipe)}>
                                        <XCircle className="mr-2 h-4 w-4" /> Rechazar
                                    </Button>
                                    <Button className="w-full" asChild>
                                        <Link href={`/recipes/${recipe.id}`}>
                                            <FileCheck2 className="mr-2 h-4 w-4" /> Procesar
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-16 shadow-none border-dashed">
                        <div className="flex flex-col items-center justify-center">
                            <Inbox className="h-16 w-16 text-slate-400 mb-4" />
                            <h2 className="text-xl font-semibold text-slate-700">Bandeja de Entrada Vacía</h2>
                            <p className="text-muted-foreground mt-2 max-w-sm">
                                No hay nuevas recetas del portal pendientes de revisión.
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            <Dialog open={!!recipeToReject} onOpenChange={() => setRecipeToReject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar Receta del Portal</DialogTitle>
                        <DialogDescription>
                            Explique por qué esta receta no puede ser procesada. Esta información puede ser visible para el paciente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ej: La imagen no es legible, la receta no es para un preparado magistral, etc."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRecipeToReject(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleRejectRecipe} disabled={isSubmitting || !rejectionReason.trim()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Rechazo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

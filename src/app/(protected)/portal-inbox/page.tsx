
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRecipes, getPatients, updateRecipe, getUserRequests, approveUserRequest, rejectUserRequest } from '@/lib/data';
import type { Recipe, Patient, AuditTrailEntry, UserRequest } from '@/lib/types';
import { RecipeStatus, UserRequestStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, FileCheck2, XCircle, UserCheck, AlertTriangle } from 'lucide-react';
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
    const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [recipeToReject, setRecipeToReject] = useState<Recipe | null>(null);
    const [requestToReject, setRequestToReject] = useState<UserRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [user] = useAuthState(auth);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [allRecipes, allPatients, allRequests] = await Promise.all([
                getRecipes(),
                getPatients(),
                getUserRequests(),
            ]);
            
            setPendingRecipes(allRecipes.filter(r => r.status === RecipeStatus.PendingReviewPortal));
            setUserRequests(allRequests.filter(req => req.status === UserRequestStatus.Pending));
            setPatients(allPatients);

        } catch (error) {
            console.error('Failed to fetch portal inbox data:', error);
            toast({ title: "Error", description: "No se pudieron cargar los datos del portal.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const existingPatientsMap = useMemo(() => {
        const map = new Map<string, string>();
        patients.forEach(p => {
            map.set(p.rut, p.name);
            if (p.email) map.set(p.email.toLowerCase(), p.name);
        });
        return map;
    }, [patients]);

    const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'Desconocido';
    const handleRejectRecipe = async () => {
        if (!user) { toast({ title: 'Error de Autenticación', variant: 'destructive' }); return; }
        if (!recipeToReject || !rejectionReason.trim()) { toast({ title: 'Error', description: 'Debe ingresar un motivo.', variant: 'destructive' }); return; }
        
        setIsSubmitting(true);
        try {
            const newAuditEntry: AuditTrailEntry = { status: RecipeStatus.Rejected, date: new Date().toISOString(), userId: user.uid, notes: `Rechazado desde bandeja de entrada. Motivo: ${rejectionReason}` };
            await updateRecipe(recipeToReject.id, { status: RecipeStatus.Rejected, rejectionReason: rejectionReason, auditTrail: [...(recipeToReject.auditTrail || []), newAuditEntry] });
            toast({ title: 'Receta Rechazada' });
            fetchData();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo rechazar la receta.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setRecipeToReject(null);
            setRejectionReason('');
        }
    };

    const handleApproveRequest = async (request: UserRequest) => {
        setIsSubmitting(true);
        try {
            await approveUserRequest(request.id);
            toast({ title: "Usuario Aprobado", description: "El perfil del paciente ha sido creado/vinculado y se ha activado el acceso al portal." });
            fetchData();
        } catch (error) {
            toast({ title: "Error al Aprobar", description: error instanceof Error ? error.message : "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleRejectRequest = async () => {
        if (!requestToReject || !rejectionReason.trim()) { toast({ title: 'Error', description: 'Debe ingresar un motivo para el rechazo.', variant: 'destructive' }); return; }
        setIsSubmitting(true);
        try {
            await rejectUserRequest(requestToReject.id, rejectionReason);
            toast({ title: "Solicitud Rechazada", description: "La solicitud de cuenta ha sido rechazada." });
            fetchData();
        } catch (error) {
            toast({ title: "Error al Rechazar", description: error instanceof Error ? error.message : "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setRequestToReject(null);
            setRejectionReason('');
        }
    }


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando bandeja de entrada...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Bandeja de Entrada del Portal</h1>
                    <p className="text-sm text-muted-foreground">
                        Revise y gestione las solicitudes entrantes desde el portal de pacientes.
                    </p>
                </div>
                 <Tabs defaultValue="recipes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="recipes">Recetas Pendientes ({pendingRecipes.length})</TabsTrigger>
                        <TabsTrigger value="users">Nuevos Usuarios ({userRequests.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="recipes" className="mt-4">
                        {pendingRecipes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pendingRecipes.map(recipe => (
                                    <Card key={recipe.id} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-lg text-primary">{getPatientName(recipe.patientId)}</CardTitle>
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
                                                <div className="text-center text-muted-foreground"><p>No hay imagen disponible.</p></div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-3 bg-muted/50 grid grid-cols-2 gap-2">
                                            <Button variant="outline" className="w-full" onClick={() => setRecipeToReject(recipe)}><XCircle className="mr-2 h-4 w-4" /> Rechazar</Button>
                                            <Button className="w-full" asChild><Link href={`/recipes/${recipe.id}`}><FileCheck2 className="mr-2 h-4 w-4" /> Procesar</Link></Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="text-center py-16 shadow-none border-dashed">
                                <div className="flex flex-col items-center justify-center"><Inbox className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold text-foreground">Bandeja de Recetas Vacía</h2><p className="text-muted-foreground mt-2 max-w-sm">No hay nuevas recetas pendientes de revisión.</p></div>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="users" className="mt-4">
                         {userRequests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userRequests.map(req => {
                                    const isExistingPatient = existingPatientsMap.has(req.rut) || existingPatientsMap.has(req.email.toLowerCase());
                                    const existingPatientName = existingPatientsMap.get(req.rut) || existingPatientsMap.get(req.email.toLowerCase());

                                    return (
                                        <Card key={req.id} className="flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="text-lg text-primary">{req.name}</CardTitle>
                                                <CardDescription>RUT: {req.rut}</CardDescription>
                                                <CardDescription>{req.email}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                {isExistingPatient && (
                                                    <div className="p-3 rounded-md bg-amber-50 border-l-4 border-amber-400 flex items-start gap-3">
                                                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-amber-800">Paciente ya existe</p>
                                                            <p className="text-sm text-amber-700">Se vinculará esta nueva cuenta al perfil de <span className="font-bold">{existingPatientName}</span>.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                            <CardFooter className="p-3 bg-muted/50 grid grid-cols-2 gap-2">
                                                <Button variant="outline" className="w-full" onClick={() => setRequestToReject(req)}><XCircle className="mr-2 h-4 w-4" /> Rechazar</Button>
                                                <Button className="w-full" onClick={() => handleApproveRequest(req)} disabled={isSubmitting}><UserCheck className="mr-2 h-4 w-4" /> Aprobar</Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                         ) : (
                            <Card className="text-center py-16 shadow-none border-dashed">
                                <div className="flex flex-col items-center justify-center"><Inbox className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold text-foreground">Bandeja de Usuarios Vacía</h2><p className="text-muted-foreground mt-2 max-w-sm">No hay nuevas solicitudes de cuenta pendientes de aprobación.</p></div>
                            </Card>
                         )}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!recipeToReject || !!requestToReject} onOpenChange={() => { setRecipeToReject(null); setRequestToReject(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar Solicitud</DialogTitle>
                        <DialogDescription>
                            Explique por qué esta solicitud no puede ser procesada. Esta información puede ser comunicada al solicitante.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="rejection-reason">Motivo del rechazo *</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ej: La imagen no es legible, los datos no coinciden con nuestros registros, etc."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setRecipeToReject(null); setRequestToReject(null); }}>Cancelar</Button>
                        <Button variant="destructive" onClick={recipeToReject ? handleRejectRecipe : handleRejectRequest} disabled={isSubmitting || !rejectionReason.trim()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Rechazo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

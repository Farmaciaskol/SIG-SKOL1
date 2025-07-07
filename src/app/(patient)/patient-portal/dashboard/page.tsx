
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getDashboardData } from '@/lib/patient-actions';
import { Recipe, RecipeStatus, ProactivePatientStatus } from '@/lib/types';
import { Loader2, AlertTriangle, FileUp, FileText, History, DollarSign, Pill, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { statusConfig } from '@/lib/constants';

const QuickActionButton = ({ href, icon: Icon, title, description }: { href: string, icon: React.ElementType, title: string, description: string }) => (
    <Link href={href} className="w-full">
        <Card className="hover:bg-muted/50 transition-colors h-full text-center p-4 flex flex-col items-center justify-center">
            <Icon className="h-10 w-10 text-primary mb-2"/>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </Card>
    </Link>
)

export default function PatientPortalDashboardPage() {
    const { patient } = usePatientAuth();
    const { toast } = useToast();
    const [dashboardData, setDashboardData] = useState<{
        activeMagistralRecipes: Recipe[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const data = await getDashboardData(patient.id);
            setDashboardData({ activeMagistralRecipes: data.activeMagistralRecipes });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del portal.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [patient, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const latestRecipe = useMemo(() => {
        if (!dashboardData?.activeMagistralRecipes.length) return null;
        return dashboardData.activeMagistralRecipes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [dashboardData]);

    if (loading || !patient) {
        return (
            <div className="flex h-full items-center justify-center pt-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hola, {patient.name.split(' ')[0]}</h1>
                <p className="text-base text-muted-foreground">Bienvenido al círculo de cuidado y conveniencia.</p>
            </div>
            
            {patient.proactiveStatus === ProactivePatientStatus.URGENT && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>¡Atención Urgente!</AlertTitle>
                    <CardDescription>
                        {patient.proactiveMessage}
                    </CardDescription>
                </Alert>
            )}
             {patient.proactiveStatus === ProactivePatientStatus.ATTENTION && (
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atención Requerida</AlertTitle>
                     <CardDescription>
                        {patient.proactiveMessage}
                    </CardDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Estado de tu Última Receta Magistral</CardTitle>
                </CardHeader>
                <CardContent>
                    {latestRecipe ? (
                        <div>
                            <p className="font-semibold text-lg text-primary">{latestRecipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</p>
                            <p className="text-sm text-muted-foreground mb-2">ID: {latestRecipe.id}</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${statusConfig[latestRecipe.status]?.badge.includes('green') ? 'bg-green-500' : 'bg-yellow-500' }`}></div>
                                <p className="font-semibold">{statusConfig[latestRecipe.status]?.text || latestRecipe.status}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No tienes recetas magistrales activas en este momento.</p>
                    )}
                </CardContent>
            </Card>

             <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Accesos Directos</h2>
                 <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <QuickActionButton 
                        title="Hacer un Pedido"
                        description="Compra tus medicamentos."
                        icon={ShoppingBag}
                        href="/patient-portal/dashboard/new-order"
                    />
                    <QuickActionButton 
                        title="Mis Tratamientos"
                        description="Ver magistrales y comerciales."
                        icon={Pill}
                        href="/patient-portal/dashboard/treatments"
                    />
                     <QuickActionButton 
                        title="Historial de Pedidos"
                        description="Revisa tus pedidos anteriores."
                        icon={History}
                        href="/patient-portal/dashboard/orders"
                    />
                    <QuickActionButton 
                        title="Subir Receta Magistral"
                        description="Carga una nueva receta médica."
                        icon={FileUp}
                        href="/patient-portal/dashboard/new-prescription"
                    />
                </div>
            </div>
        </div>
    );
}

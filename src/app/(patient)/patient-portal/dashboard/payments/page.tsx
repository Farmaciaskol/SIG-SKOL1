'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getRecipes } from '@/lib/data';
import { type Recipe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Loader2, DollarSign, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function PaymentsPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoadingData(true);
        const allRecipes = await getRecipes(patient.id);
        const recipesWithCost = allRecipes.filter(r => r.preparationCost && r.preparationCost > 0);
        setRecipes(recipesWithCost);
        setLoadingData(false);
    }, [patient]);

    useEffect(() => {
        if (!patientLoading && patient) {
            fetchData();
        } else if (!patientLoading && !patient) {
            setLoadingData(false);
        }
    }, [patient, patientLoading, fetchData]);

    const financialSummary = useMemo(() => {
        const pendingRecipes = recipes.filter(r => r.paymentStatus === 'Pendiente');
        const totalPending = pendingRecipes.reduce((acc, r) => acc + (r.preparationCost || 0) + (r.transportCost || 0), 0);
        return { totalPending, pendingRecipes };
    }, [recipes]);

    if (loadingData || patientLoading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/patient-portal/dashboard">
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Precios y Pagos</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Resumen de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-red-600">${financialSummary.totalPending.toLocaleString('es-CL')}</div>
                    <p className="text-muted-foreground">Monto total pendiente de pago.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detalle de Preparados</CardTitle>
                     <CardDescription>
                        Esta sección muestra el detalle de los costos de tus preparados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Preparado</TableHead>
                                <TableHead>Costo</TableHead>
                                <TableHead className="text-right">Estado del Pago</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recipes.length > 0 ? (
                                recipes.map(recipe => (
                                    <TableRow key={recipe.id}>
                                        <TableCell>
                                            <p className="font-medium">{recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</p>
                                            <p className="text-xs text-muted-foreground">Receta ID: {recipe.id}</p>
                                        </TableCell>
                                        <TableCell>${((recipe.preparationCost || 0) + (recipe.transportCost || 0)).toLocaleString('es-CL')}</TableCell>
                                        <TableCell className="text-right">
                                            {recipe.paymentStatus === 'Pagado' ? (
                                                <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3"/> Pagado</Badge>
                                            ) : (
                                                <Badge variant="destructive"><Clock className="mr-1 h-3 w-3"/> Pendiente</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        No hay información de pagos disponible.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

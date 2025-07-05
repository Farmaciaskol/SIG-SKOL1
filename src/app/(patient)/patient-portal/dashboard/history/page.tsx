'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getRecipes } from '@/lib/data';
import { Recipe, RecipeStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HistoryPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [dispensedRecipes, setDispensedRecipes] = useState<Recipe[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoadingData(true);
        const allRecipes = await getRecipes(patient.id);
        const filtered = allRecipes
            .filter(r => r.status === RecipeStatus.Dispensed && r.dispensationDate)
            .sort((a, b) => new Date(b.dispensationDate!).getTime() - new Date(a.dispensationDate!).getTime());
        setDispensedRecipes(filtered);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/patient-portal/dashboard">
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Historial de Despachos</h1>
            </div>

            {dispensedRecipes.length > 0 ? (
                <div className="space-y-4">
                    {dispensedRecipes.map(recipe => (
                        <Card key={recipe.id}>
                            <CardHeader>
                                 <div className="flex justify-between items-start">
                                    <CardTitle>{recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</CardTitle>
                                    <Badge variant="secondary">Dispensado</Badge>
                                </div>
                                <CardDescription>Receta ID: {recipe.id}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">Dispensado el: <span className="font-semibold">{format(parseISO(recipe.dispensationDate!), 'dd MMMM, yyyy', {locale: es})}</span></p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <CardHeader>
                        <CardTitle>Sin Historial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Aún no se han registrado despachos en tu cuenta.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

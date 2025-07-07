
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getRecipes } from '@/lib/data';
import { Recipe, RecipeStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { statusConfig } from '@/lib/constants';

export default function RecipesHistoryPage() {
    const { patient, loading: patientLoading } = usePatientAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoadingData(true);
        try {
            const allRecipes = await getRecipes(patient.id);
            const sortedRecipes = allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRecipes(sortedRecipes);
        } catch (error) {
            console.error("Failed to fetch recipes", error);
        } finally {
            setLoadingData(false);
        }
    }, [patient]);

    useEffect(() => {
        if (!patientLoading && patient) {
            fetchData();
        } else if (!patientLoading && !patient) {
            setLoadingData(false);
        }
    }, [patient, patientLoading, fetchData]);

    if (loadingData || patientLoading) {
        return <div className="flex items-center justify-center pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold font-headline">Mis Recetas</h1>
                <Button asChild><Link href="/patient-portal/dashboard/new-prescription">Subir Receta</Link></Button>
            </div>

            {recipes.length > 0 ? (
                <div className="space-y-4">
                    {recipes.map(recipe => {
                        const config = statusConfig[recipe.status] || statusConfig.Archived;
                        const Icon = config.icon;
                        return (
                        <Card key={recipe.id}>
                            <CardHeader>
                                 <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}</CardTitle>
                                    <Badge className={config.badge}><Icon className="mr-1.5 h-3 w-3" />{config.text}</Badge>
                                </div>
                                <CardDescription>ID: {recipe.id}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Fecha de Emisión: <span className="font-semibold text-foreground">{format(parseISO(recipe.prescriptionDate), 'dd MMMM, yyyy', {locale: es})}</span></p>
                                <p className="text-sm text-muted-foreground mt-1">Vence: <span className="font-semibold text-foreground">{format(parseISO(recipe.dueDate), 'dd MMMM, yyyy', {locale: es})}</span></p>
                            </CardContent>
                        </Card>
                    )})}
                </div>
            ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <CardHeader>
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2"/>
                        <CardTitle>Sin Recetas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Aún no has subido ninguna receta.</p>
                        <Button className="mt-4" asChild><Link href="/patient-portal/dashboard/new-prescription">Subir mi primera receta</Link></Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


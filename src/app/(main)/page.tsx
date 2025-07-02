'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, FlaskConical, Stethoscope, UserCheck, Users } from 'lucide-react';
import { getInitialData, Recipe, RecipeStatus } from '@/lib/data';
import Link from 'next/link';

type Kpi = {
  title: string;
  value: string;
  icon: React.ElementType;
  href: string;
};

type RecipeCountByStatus = {
  status: RecipeStatus;
  count: number;
};

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getInitialData();
    setRecipes(data.recipes);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const kpis: Kpi[] = [
    { title: 'Recetas por Validar', value: recipes.filter(r => r.status === RecipeStatus.PendingValidation).length.toString(), icon: Stethoscope, href: '/recipes' },
    { title: 'En Preparación', value: recipes.filter(r => r.status === RecipeStatus.Preparation).length.toString(), icon: FlaskConical, href: '/recipes' },
    { title: 'Pacientes Crónicos', value: '3', icon: UserCheck, href: '/chronic-care' },
    { title: 'Total de Pacientes', value: getInitialData().patients.length.toString(), icon: Users, href: '/patients' },
  ];

  const recipeCounts = Object.values(RecipeStatus).map(status => ({
    status,
    count: recipes.filter(recipe => recipe.status === status).length,
  }));

  const overdueRecipes = recipes.filter(
    r => new Date(r.dueDate) < new Date() && r.status !== RecipeStatus.Dispensed && r.status !== RecipeStatus.Cancelled
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <Link href={kpi.href} className="text-xs text-muted-foreground flex items-center hover:text-primary">
                Ver más <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Resumen de Recetas</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={recipeCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}`} />
                 <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}}
                  cursor={{fill: 'hsl(var(--muted))'}}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Alertas y Recetas Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueRecipes.length > 0 ? (
                overdueRecipes.map(recipe => (
                  <div key={recipe.id} className="flex items-center p-2 rounded-md bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive mr-3" />
                    <div className="flex-grow">
                      <p className="text-sm font-medium">Receta Vencida: #{recipe.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Paciente: {getInitialData().patients.find(p => p.id === recipe.patientId)?.name}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/recipes/${recipe.id}`}>Revisar</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay alertas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

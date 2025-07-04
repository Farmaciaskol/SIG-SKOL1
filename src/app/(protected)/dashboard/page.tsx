
import Link from 'next/link';
import {
  Users,
  FlaskConical,
  Inbox,
  PlusCircle,
  Clock,
  CheckCircle2,
  Box,
  Wand2,
  AlertCircle,
  FileText,
  FilePlus2,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRecipes, getPatients, getInventory } from '@/lib/data';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { statusConfig } from '@/lib/constants';
import { RecipeStatus, ProactivePatientStatus } from '@/lib/types';
import type { Recipe, Patient, InventoryItem } from '@/lib/types';
import { useMemo } from 'react';


type KpiCardProps = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
};

const KpiCard = ({ title, value, icon: Icon, href }: KpiCardProps) => (
  <Link href={href}>
    <Card className="hover:shadow-md transition-shadow duration-300 cursor-pointer bg-card">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const ProactiveAlertsCard = ({ patients }: { patients: Patient[] }) => {
  const alerts = patients.filter(
    (p) =>
      p.proactiveStatus === ProactivePatientStatus.URGENT ||
      p.proactiveStatus === ProactivePatientStatus.ATTENTION
  ).sort((a, b) => { // Sort urgent ones first
      if (a.proactiveStatus === ProactivePatientStatus.URGENT && b.proactiveStatus !== ProactivePatientStatus.URGENT) return -1;
      if (a.proactiveStatus !== ProactivePatientStatus.URGENT && b.proactiveStatus === ProactivePatientStatus.URGENT) return 1;
      return 0;
  });

  const statusConfig = {
    [ProactivePatientStatus.URGENT]: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
    },
    [ProactivePatientStatus.ATTENTION]: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
    },
    [ProactivePatientStatus.OK]: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
    }
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
        <Wand2 className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg font-semibold text-primary">Alertas Proactivas (IA)</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {alerts.length > 0 ? (
          alerts.map((patient) => {
            const config = statusConfig[patient.proactiveStatus];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <div
                key={patient.id}
                className={`flex items-start p-3 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}
              >
                <Icon
                  className={`h-5 w-5 ${config.color} mr-3 mt-0.5 flex-shrink-0`}
                />
                <div className="flex-grow">
                  <p className="font-semibold text-primary">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="hover:underline"
                    >
                      Paciente: {patient.name}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.proactiveMessage}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/patients/${patient.id}`}>Revisar</Link>
                </Button>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center text-center text-muted-foreground h-full justify-center py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <p className="font-medium text-foreground">Todo en orden</p>
            <p className="text-sm">
              Ningún paciente crónico requiere atención inmediata.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DelayedRecipesCard = ({ recipes, patients }: { recipes: Recipe[], patients: Patient[] }) => {
    'use client';
    const delayedRecipes = useMemo(() => {
        if (!recipes) return [];
        const DELAY_THRESHOLD_DAYS = 3; 
        
        return recipes
        .filter(recipe => 
            (recipe.status === RecipeStatus.PendingValidation || recipe.status === RecipeStatus.Validated || recipe.status === RecipeStatus.Preparation) &&
            differenceInDays(new Date(), new Date(recipe.updatedAt)) > DELAY_THRESHOLD_DAYS
        )
        .map(recipe => ({
            ...recipe,
            daysDelayed: differenceInDays(new Date(), new Date(recipe.updatedAt)),
            patientName: patients.find(p => p.id === recipe.patientId)?.name ?? 'N/A'
        }));
    }, [recipes, patients]);

    return (
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold text-primary">Recetas con Retraso</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {delayedRecipes.length > 0 ? (
              delayedRecipes.map(recipe => (
                <div key={recipe.id} className="flex items-center p-3 rounded-lg bg-orange-50 border-l-4 border-orange-400">
                  <div className="flex-grow">
                    <p className="font-semibold text-primary"><Link href={`/recipes/${recipe.id}`} className="hover:underline">Receta: {recipe.id}</Link></p>
                    <p className="text-sm text-muted-foreground">Paciente: {recipe.patientName}</p>
                    <p className="text-sm text-muted-foreground">En estado "{recipe.status}" por {recipe.daysDelayed} días.</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/recipes/${recipe.id}`}>Revisar</Link>
                  </Button>
                </div>
              ))
            ) : (
                <div className="flex flex-col items-center text-center text-muted-foreground h-full justify-center py-6">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                    <p className="font-medium text-foreground">¡Excelente!</p>
                    <p className="text-sm">No hay recetas con retraso.</p>
                </div>
            )}
          </CardContent>
        </Card>
    );
};

const RecentRecipesCard = ({ recipes, patients }: { recipes: Recipe[], patients: Patient[] }) => {
    const recentRecipes = recipes.filter(r => r.status !== RecipeStatus.PendingReviewPortal).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'N/A';

    return (
        <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
                <FilePlus2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-semibold text-primary">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {recentRecipes.length > 0 ? (
                    recentRecipes.map(recipe => {
                        const Icon = statusConfig[recipe.status]?.icon || FileText;
                        return (
                            <div key={recipe.id} className="flex items-start gap-4">
                                <div className="p-2 rounded-full bg-muted">
                                    <Icon className="h-4 w-4 text-muted-foreground"/>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-medium text-primary">
                                        <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                                            Nueva Receta: {recipe.id}
                                        </Link>
                                    </p>
                                    <p className="text-sm text-muted-foreground">Paciente: {getPatientName(recipe.patientId)}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(recipe.createdAt), "d MMMM, yyyy 'a las' HH:mm", {locale: es})}</p>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center text-center text-muted-foreground h-full justify-center py-6">
                         <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                        <p className="font-medium text-foreground">Sin actividad reciente</p>
                        <p className="text-sm">
                            Las nuevas recetas aparecerán aquí.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default async function DashboardPage() {
  const [recipesData, patientsData, inventoryData] = await Promise.all([
    getRecipes(),
    getPatients(),
    getInventory(),
  ]);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(today);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  const pendingPayments = recipesData
      .filter(r => r.paymentStatus === 'Pendiente')
      .reduce((sum, r) => sum + (r.preparationCost || 0) + (r.transportCost || 0), 0);

  const kpis = [
    { title: 'Bandeja de Entrada Portal', value: recipesData.filter(r => r.status === RecipeStatus.PendingReviewPortal).length, icon: Inbox, href: '/portal-inbox' },
    { title: 'En Preparación', value: recipesData.filter(r => r.status === RecipeStatus.Preparation).length, icon: FlaskConical, href: '/recipes?status=En+Preparación' },
    { title: 'Ítems con Stock Bajo', value: inventoryData.filter(i => i.quantity < i.lowStockThreshold).length, icon: Box, href: '/inventory' },
    { title: 'Recetas por Pagar', value: `$${pendingPayments.toLocaleString('es-CL')}`, icon: DollarSign, href: '/financial-management' },
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight font-headline">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{capitalizedDate}</p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" asChild className="bg-card hover:bg-muted">
              <Link href="/patients"><Users className="mr-2 h-4 w-4" /> Ver Pacientes</Link>
            </Button>
            <Button asChild>
              <Link href="/recipes/new"><PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpis.map(kpi => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ProactiveAlertsCard patients={patientsData} />
        <DelayedRecipesCard recipes={recipesData} patients={patientsData} />
        <RecentRecipesCard recipes={recipesData} patients={patientsData} />
      </div>
    </>
  );
}

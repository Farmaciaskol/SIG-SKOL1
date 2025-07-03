
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Users,
  CalendarDays,
  Clock,
  PlusCircle,
  CheckCircle2,
  FlaskConical,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRecipes, getPatients, getInventory, getUsers, Recipe, Patient, InventoryItem, User, RecipeStatus } from '@/lib/data';
import { differenceInDays } from 'date-fns';

const BeakerIconCustom = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 3h15"></path>
        <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"></path>
        <path d="M6 14h12"></path>
    </svg>
);

const UsersIconCustom = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

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
        <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-500/10">
          <Icon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function DashboardPage() {
  const [data, setData] = useState<{
    recipes: Recipe[];
    patients: Patient[];
    inventory: InventoryItem[];
    users: User[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recipesData, patientsData, inventoryData, usersData] = await Promise.all([
          getRecipes(),
          getPatients(),
          getInventory(),
          getUsers(),
        ]);
        setData({
          recipes: recipesData,
          patients: patientsData,
          inventory: inventoryData,
          users: usersData,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formattedDate = useMemo(() => {
    const today = new Date();
    const date = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(today);
    return date.charAt(0).toUpperCase() + date.slice(1);
  }, []);

  const kpis = useMemo(() => {
    if (!data) return [];
    
    return [
      { title: 'Recetas del Portal Pendientes', value: data.recipes.filter(r => r.status === RecipeStatus.PendingReviewPortal).length, icon: Inbox, href: '/recipes?status=Pendiente+Revisión+-+Portal' },
      { title: 'En Preparación', value: data.recipes.filter(r => r.status === RecipeStatus.Preparation).length, icon: FlaskConical, href: '/recipes?status=En+Preparación' },
      { title: 'Ítems con Stock Bajo', value: data.inventory.filter(i => i.stock < i.lowStockThreshold).length, icon: BeakerIconCustom, href: '/inventory' },
      { title: 'Usuarios del Sistema', value: data.users.length, icon: UsersIconCustom, href: '/user-management' },
    ];
  }, [data]);
  
  const delayedRecipes = useMemo(() => {
    if (!data) return [];
    const DELAY_THRESHOLD_DAYS = 3; 
    
    return data.recipes
      .filter(recipe => 
        (recipe.status === RecipeStatus.PendingValidation || recipe.status === RecipeStatus.Validated || recipe.status === RecipeStatus.Preparation) &&
        differenceInDays(new Date(), new Date(recipe.updatedAt)) > DELAY_THRESHOLD_DAYS
      )
      .map(recipe => ({
        ...recipe,
        daysDelayed: differenceInDays(new Date(), new Date(recipe.updatedAt)),
        patientName: data.patients.find(p => p.id === recipe.patientId)?.name ?? 'N/A'
      }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 mb-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight font-headline">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold text-slate-800">Próximas Dispensaciones Mensuales</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center text-sm text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                No hay dispensaciones crónicas que requieran acción en los próximos 30 días.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold text-slate-800">Recetas con Retraso</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {delayedRecipes.length > 0 ? (
              delayedRecipes.map(recipe => (
                <div key={recipe.id} className="flex items-center p-3 rounded-lg bg-orange-50 border-l-4 border-orange-400">
                  <div className="flex-grow">
                    <p className="font-semibold text-sky-600"><Link href={`/recipes/${recipe.id}`} className="hover:underline">Receta: {recipe.id}</Link></p>
                    <p className="text-sm text-slate-700">Paciente: {recipe.patientName}</p>
                    <p className="text-sm text-slate-500">En estado "{recipe.status}" por {recipe.daysDelayed} días.</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/recipes/${recipe.id}`}>Revisar</Link>
                  </Button>
                </div>
              ))
            ) : (
                <div className="flex items-center text-sm text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                    ¡Excelente! No hay recetas con retraso.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

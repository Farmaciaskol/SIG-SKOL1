
'use client';

import Link from 'next/link';
import {
  Users,
  Clock,
  CheckCircle2,
  Wand2,
  AlertTriangle,
  FileText,
  Package,
  PackageCheck,
  Inbox,
  FlaskConical,
  Box,
  DollarSign,
  Send,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays, format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { statusConfig } from '@/lib/constants';
import { RecipeStatus, ProactivePatientStatus } from '@/lib/types';
import type { Recipe, Patient, InventoryItem } from '@/lib/types';
import React, { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Client Components for the Dashboard ---

type CalendarEvent = {
  date: Date;
  title: string;
  type: 'created' | 'received' | 'ready' | 'dispensed' | 'sentToPharmacy' | 'estimatedReception';
};

const eventConfig = {
    created: { icon: FileText, color: 'bg-blue-500', label: 'Receta Creada' },
    sentToPharmacy: { icon: Send, color: 'bg-cyan-500', label: 'Enviada a Recetario' },
    estimatedReception: { icon: Truck, color: 'bg-teal-500', label: 'Recepción Estimada' },
    received: { icon: PackageCheck, color: 'bg-indigo-500', label: 'Recepcionado en Skol' },
    ready: { icon: Package, color: 'bg-orange-500', label: 'Listo para Retiro' },
    dispensed: { icon: CheckCircle2, color: 'bg-green-500', label: 'Dispensado' },
};

function DashboardCalendar({ events }: { events: CalendarEvent[] }) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    const eventsByDate = useMemo(() => {
        return events.reduce((acc, event) => {
            const day = format(event.date, 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(event);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);
    }, [events]);

    const eventDays = useMemo(() => Object.keys(eventsByDate).map(dayStr => new Date(`${dayStr}T12:00:00`)), [eventsByDate]);
    
    const selectedDayEvents = useMemo(() => {
        if (!date) return [];
        const day = format(date, 'yyyy-MM-dd');
        return eventsByDate[day] || [];
    }, [date, eventsByDate]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Calendario de Actividades</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-6">
                <div className="flex justify-center">
                     <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border p-0"
                        locale={es}
                        components={{
                            DayContent: (props) => {
                                const isEventDay = eventDays.some(d => format(d, 'yyyy-MM-dd') === format(props.date, 'yyyy-MM-dd'));
                                return (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {format(props.date, 'd')}
                                        {isEventDay && (
                                            <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                );
                            },
                        }}
                    />
                </div>
                <div className="flex-1 space-y-4">
                    <h4 className="font-semibold text-foreground">
                       Eventos para {date ? format(date, "d 'de' MMMM", { locale: es }) : '...'}
                    </h4>
                    {selectedDayEvents.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {selectedDayEvents.map((event, index) => {
                                const config = eventConfig[event.type];
                                return (
                                <div key={index} className="flex items-start gap-3">
                                    <div className={`mt-1.5 flex h-2 w-2 rounded-full ${config.color}`} />
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium leading-none">{event.title}</p>
                                        <p className="text-sm text-muted-foreground">{config.label}</p>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center border-2 border-dashed rounded-lg">
                           No hay eventos para la fecha seleccionada.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

const KpiCard = ({ title, value, icon: Icon, href }: { title: string; value: string | number; icon: React.ElementType, href: string; }) => (
  <Link href={href}>
    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer bg-card">
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
        <Wand2 className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg font-semibold text-primary">Alertas Proactivas (IA)</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {alerts.length > 0 ? (
          alerts.map((patient) => (
              <Alert 
                key={patient.id} 
                variant={patient.proactiveStatus === ProactivePatientStatus.URGENT ? 'destructive' : 'warning'}
                className="flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-1" />
                    <div>
                        <AlertTitle>
                            <Link href={`/patients/${patient.id}`} className="hover:underline">{patient.name}</Link>
                        </AlertTitle>
                        <AlertDescription>
                            {patient.proactiveMessage}
                        </AlertDescription>
                    </div>
                </div>
              </Alert>
          ))
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

const ActivityFeedCard = ({ recipes, patients }: { recipes: Recipe[], patients: Patient[] }) => {
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

    const recentRecipes = recipes.filter(r => r.status !== RecipeStatus.PendingReviewPortal).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'N/A';

    return (
        <Card>
            <Tabs defaultValue="delayed" className="w-full">
                <CardHeader className="p-4 border-b">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="delayed" className="flex items-center gap-2">
                            Recetas con Retraso 
                            {delayedRecipes.length > 0 && <Badge variant="destructive" className="h-5">{delayedRecipes.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="recent">Actividad Reciente</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent className="p-0">
                    <TabsContent value="delayed" className="m-0">
                        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
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
                        </div>
                    </TabsContent>
                    <TabsContent value="recent" className="m-0">
                        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
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
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
};

export function DashboardClient({ recipes, patients, inventory, calendarEvents }: { 
    recipes: Recipe[];
    patients: Patient[];
    inventory: InventoryItem[];
    calendarEvents: CalendarEvent[];
}) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(today);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const kpis = useMemo(() => {
    const pendingPayments = recipes
      .filter(r => r.paymentStatus === 'Pendiente')
      .reduce((sum, r) => sum + (r.preparationCost || 0) + (r.transportCost || 0), 0);
      
    return [
      { title: 'Bandeja de Entrada Portal', value: recipes.filter(r => r.status === RecipeStatus.PendingReviewPortal).length, icon: Inbox, href: '/portal-inbox' },
      { title: 'En Preparación', value: recipes.filter(r => r.status === RecipeStatus.Preparation).length, icon: FlaskConical, href: '/recipes?status=En+Preparación' },
      { title: 'Ítems con Stock Bajo', value: inventory.filter(i => i.quantity < i.lowStockThreshold).length, icon: Box, href: '/inventory' },
      { title: 'Saldo por Pagar', value: `$${pendingPayments.toLocaleString('es-CL')}`, icon: DollarSign, href: '/financial-management' },
    ];
  }, [recipes, inventory]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight font-headline">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{capitalizedDate}</p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" asChild>
              <Link href="/patients"><Users className="mr-2 h-4 w-4" /> Ver Pacientes</Link>
            </Button>
            <Button asChild>
              <Link href="/recipes"><FileText className="mr-2 h-4 w-4" /> Gestionar Recetas</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpis.map(kpi => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <ActivityFeedCard recipes={recipes} patients={patients} />
          <DashboardCalendar events={calendarEvents} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <ProactiveAlertsCard patients={patients} />
        </div>
      </div>
    </>
  );
}

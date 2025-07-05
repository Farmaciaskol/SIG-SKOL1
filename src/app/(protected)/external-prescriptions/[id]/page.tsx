
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

// Data
import {
  getExternalPharmacy,
  getRecipesForExternalPharmacy,
  getDispatchNotesForExternalPharmacy,
  getPatients,
} from '@/lib/data';
import type {
  ExternalPharmacy,
  Recipe,
  DispatchNote,
  Patient,
} from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Warehouse, FileText, Truck, DollarSign, Phone, Mail, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { statusConfig } from '@/lib/constants';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default function ExternalPharmacyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [pharmacy, setPharmacy] = useState<ExternalPharmacy | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dispatches, setDispatches] = useState<DispatchNote[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pharmacyData, recipesData, dispatchesData, patientsData] = await Promise.all([
        getExternalPharmacy(id),
        getRecipesForExternalPharmacy(id),
        getDispatchNotesForExternalPharmacy(id),
        getPatients(),
      ]);
      
      if (pharmacyData) {
        setPharmacy(pharmacyData);
        setRecipes(recipesData);
        setDispatches(dispatchesData);
        setPatients(patientsData);
      } else {
        toast({ title: 'Error', description: 'Recetario no encontrado.', variant: 'destructive' });
        router.push('/external-prescriptions');
      }
    } catch (error) {
      console.error('Failed to fetch pharmacy detail data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del recetario.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    if (!pharmacy) return { balance: 0, activeRecipes: 0, totalDispatches: 0 };
    
    const balance = recipes.reduce((acc, r) => acc + (r.preparationCost || 0), 0);
    const activeRecipes = recipes.filter(r => r.status !== RecipeStatus.Dispensed && r.status !== RecipeStatus.Cancelled && r.status !== RecipeStatus.Rejected).length;
    const totalDispatches = dispatches.length;

    return {
      balance,
      activeRecipes,
      totalDispatches,
    };
  }, [pharmacy, recipes, dispatches]);
  
  const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'N/A';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos del recetario...</p>
      </div>
    );
  }
  
  if (!pharmacy) {
    return (
       <div className="flex items-center justify-center h-full">
        <p>Recetario no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-10 w-10" asChild>
          <Link href="/external-prescriptions"><ChevronLeft className="h-5 w-5"/></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{pharmacy.name}</h1>
          <p className="text-sm text-muted-foreground">Panel de control y detalle de operaciones del socio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
            {pharmacy.contactPerson && (
                <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">Contacto:</span> {pharmacy.contactPerson}</div>
            )}
            {pharmacy.phone && (
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">Teléfono:</span> {pharmacy.phone}</div>
            )}
            {pharmacy.email && (
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">Email:</span> {pharmacy.email}</div>
            )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
            <CardTitle>Tiempos de Compromiso (Días)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{pharmacy.standardPreparationTime ?? 'N/A'}</p>
                <p className="text-muted-foreground mt-1 text-center">Preparación Estándar</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{pharmacy.skolSuppliedPreparationTime ?? 'N/A'}</p>
                <p className="text-muted-foreground mt-1 text-center">Preparación Insumo Skol</p>
            </div>
            </CardContent>
        </Card>
      </div>


      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Saldo Pendiente" value={`$${stats.balance.toLocaleString('es-CL')}`} icon={DollarSign} />
        <StatCard title="Recetas Activas" value={stats.activeRecipes} icon={FileText} />
        <StatCard title="Despachos Históricos" value={stats.totalDispatches} icon={Truck} />
      </div>

      <Tabs defaultValue="recipes">
        <TabsList className="mb-4">
          <TabsTrigger value="recipes">Recetas ({recipes.length})</TabsTrigger>
          <TabsTrigger value="dispatches">Despachos ({dispatches.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="recipes">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Receta</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.length > 0 ? recipes.map(recipe => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-mono">
                        <Link href={`/recipes/${recipe.id}`} className="text-primary hover:underline">{recipe.id}</Link>
                      </TableCell>
                      <TableCell>{getPatientName(recipe.patientId)}</TableCell>
                      <TableCell>{format(new Date(recipe.createdAt), "d MMM, yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          <span className="mr-2">{React.createElement(statusConfig[recipe.status]?.icon || FileText, { className: 'h-3 w-3' })}</span>
                          {statusConfig[recipe.status]?.text || recipe.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${(recipe.preparationCost || 0).toLocaleString('es-CL')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">No hay recetas asociadas a este recetario.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dispatches">
           <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Despacho</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">N° de Ítems</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.length > 0 ? dispatches.map(dispatch => (
                    <TableRow key={dispatch.id}>
                      <TableCell className="font-mono text-primary">{dispatch.id}</TableCell>
                      <TableCell>{format(new Date(dispatch.createdAt), "d MMM, yyyy HH:mm", { locale: es })}</TableCell>
                      <TableCell><Badge variant={dispatch.status === 'Recibido' ? 'default' : 'secondary'}>{dispatch.status}</Badge></TableCell>
                      <TableCell className="text-right">{dispatch.items.length}</TableCell>
                    </TableRow>
                  )) : (
                     <TableRow><TableCell colSpan={4} className="text-center h-24">No hay despachos asociados a este recetario.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

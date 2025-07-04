
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

// Data
import {
  getDoctor,
  getRecipes,
  getPatients,
} from '@/lib/data';
import type {
  Doctor,
  Recipe,
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
import { ChevronLeft, Loader2, Stethoscope, FileText, User, Percent, Mail, Phone, Users } from 'lucide-react';
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

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Map<string, Patient>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [doctorData, allRecipes, allPatients] = await Promise.all([
        getDoctor(id),
        getRecipes(),
        getPatients(),
      ]);
      
      if (doctorData) {
        setDoctor(doctorData);
        const doctorRecipes = allRecipes.filter(r => r.doctorId === id);
        setRecipes(doctorRecipes);

        const patientIds = new Set(doctorRecipes.map(r => r.patientId));
        const patientsMap = new Map();
        allPatients.forEach(p => {
          if (patientIds.has(p.id)) {
            patientsMap.set(p.id, p);
          }
        });
        setPatients(patientsMap);

      } else {
        toast({ title: 'Error', description: 'Médico no encontrado.', variant: 'destructive' });
        router.push('/doctors');
      }
    } catch (error) {
      console.error('Failed to fetch doctor detail data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del médico.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    if (!doctor) return { totalRecipes: 0, rejectedRate: 0, associatedPatients: 0 };
    
    const totalRecipes = recipes.length;
    const rejectedRecipes = recipes.filter(r => r.status === RecipeStatus.Rejected).length;
    const rejectedRate = totalRecipes > 0 ? ((rejectedRecipes / totalRecipes) * 100).toFixed(1) : 0;
    const associatedPatients = patients.size;

    return {
      totalRecipes,
      rejectedRate,
      associatedPatients,
    };
  }, [doctor, recipes, patients]);
  
  const getPatientName = (patientId: string) => patients.get(patientId)?.name || 'N/A';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos del médico...</p>
      </div>
    );
  }
  
  if (!doctor) {
    return (
       <div className="flex items-center justify-center h-full">
        <p>Médico no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-10 w-10" asChild>
          <Link href="/doctors"><ChevronLeft className="h-5 w-5"/></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{doctor.name}</h1>
          <p className="text-sm text-muted-foreground">{doctor.specialty} | Licencia: {doctor.license || 'N/A'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {doctor.phone && (
             <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">Teléfono:</span> {doctor.phone}</div>
          )}
          {doctor.email && (
             <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">Email:</span> {doctor.email}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Recetas Totales Emitidas" value={stats.totalRecipes} icon={FileText} />
        <StatCard title="Tasa de Rechazo" value={`${stats.rejectedRate}%`} icon={Percent} />
        <StatCard title="Pacientes Asociados" value={stats.associatedPatients} icon={Users} />
      </div>

      <Tabs defaultValue="recipes">
        <TabsList className="mb-4">
          <TabsTrigger value="recipes">Recetas Emitidas ({recipes.length})</TabsTrigger>
          <TabsTrigger value="patients">Pacientes Asociados ({patients.size})</TabsTrigger>
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
                    <TableHead>Preparado Principal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.length > 0 ? recipes.map(recipe => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-mono">
                        <Link href={`/recipes/${recipe.id}`} className="text-primary hover:underline">{recipe.id}</Link>
                      </TableCell>
                      <TableCell>{getPatientName(recipe.patientId)}</TableCell>
                      <TableCell>{format(parseISO(recipe.createdAt), "d MMM, yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          <span className="mr-2">{React.createElement(statusConfig[recipe.status]?.icon || FileText, { className: 'h-3 w-3' })}</span>
                          {statusConfig[recipe.status]?.text || recipe.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{recipe.items[0]?.principalActiveIngredient || 'N/A'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center h-24">No hay recetas emitidas por este médico.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="patients">
           <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Paciente</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Es Crónico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(patients.values()).length > 0 ? Array.from(patients.values()).map(patient => (
                    <TableRow key={patient.id}>
                      <TableCell>
                         <Link href={`/patients/${patient.id}`} className="text-primary hover:underline">{patient.name}</Link>
                      </TableCell>
                      <TableCell>{patient.rut}</TableCell>
                      <TableCell>
                          <Badge variant={patient.isChronic ? 'secondary' : 'outline'}>{patient.isChronic ? 'Sí' : 'No'}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow><TableCell colSpan={3} className="text-center h-24">No hay pacientes asociados a este médico.</TableCell></TableRow>
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

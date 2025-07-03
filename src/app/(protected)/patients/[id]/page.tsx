'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPatient, getRecipes, Patient, Recipe } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, User, Mail, Phone, Heart } from 'lucide-react';
import Link from 'next/link';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) {
        setLoading(false);
        return;
    };
    setLoading(true);
    try {
      const patientData = await getPatient(id);
      if (patientData) {
        setPatient(patientData);
      } else {
        toast({ title: 'Error', description: 'Paciente no encontrado.', variant: 'destructive' });
        router.push('/patients');
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del paciente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando datos del paciente...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Paciente no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">RUT: {patient.rut}</p>
        </div>
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.rut}</span></div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email}</span></div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone}</span></div>
            <div className="flex items-center gap-2 pt-2">
                {patient.isChronic ? <Heart className="h-5 w-5 text-pink-500" /> : <Heart className="h-5 w-5 text-slate-300" />}
                <p>{patient.isChronic ? 'Paciente Crónico' : 'Paciente No Crónico'}</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

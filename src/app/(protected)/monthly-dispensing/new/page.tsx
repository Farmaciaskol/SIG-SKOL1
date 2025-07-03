
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPatients, createMonthlyDispensationBox } from '@/lib/data';
import type { Patient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

const newDispensationSchema = z.object({
  patientId: z.string().min(1, { message: 'Debe seleccionar un paciente.' }),
  period: z.string().regex(/^\d{4}-\d{2}$/, { message: 'El formato debe ser YYYY-MM.' }),
});

type NewDispensationValues = z.infer<typeof newDispensationSchema>;

export default function NewMonthlyDispensingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewDispensationValues>({
    resolver: zodResolver(newDispensationSchema),
    defaultValues: {
      patientId: '',
      period: format(new Date(), 'yyyy-MM'),
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const allPatients = await getPatients();
      setPatients(allPatients.filter(p => p.isChronic));
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast({ title: "Error", description: "No se pudieron cargar los pacientes crónicos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: NewDispensationValues) => {
    setIsSubmitting(true);
    try {
      const boxId = await createMonthlyDispensationBox(data.patientId, data.period);
      toast({
        title: "Caja de Dispensación Creada",
        description: "El sistema ha generado la lista de medicamentos para el paciente.",
      });
      router.push(`/monthly-dispensing/${boxId}`);
    } catch (error) {
      console.error("Failed to create dispensation box:", error);
      toast({
        title: "Error al Crear la Caja",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/monthly-dispensing">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Nueva Caja de Dispensación</h1>
          <p className="text-sm text-muted-foreground">
            Seleccione un paciente y período para iniciar la preparación.
          </p>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Caja</CardTitle>
              <CardDescription>El sistema generará la lista de medicamentos basado en esta información.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente Crónico *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loading ? "Cargando pacientes..." : "Seleccione un paciente"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período de Dispensación *</FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Generando Caja...' : 'Crear y Validar Caja'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

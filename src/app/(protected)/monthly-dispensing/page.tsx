
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getMonthlyDispensations,
  getPatients,
  MonthlyDispensationBox,
  Patient,
  MonthlyDispensationBoxStatus,
  DispensationItemStatus
} from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Box, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </CardContent>
  </Card>
);

const statusConfig: Record<MonthlyDispensationBoxStatus, { text: string; badge: string }> = {
  [MonthlyDispensationBoxStatus.InPreparation]: { text: 'En Preparación', badge: 'bg-yellow-100 text-yellow-800' },
  [MonthlyDispensationBoxStatus.ReadyForPickup]: { text: 'Lista para Retiro', badge: 'bg-sky-100 text-sky-800' },
  [MonthlyDispensationBoxStatus.Dispensed]: { text: 'Dispensada', badge: 'bg-green-100 text-green-800' },
  [MonthlyDispensationBoxStatus.Cancelled]: { text: 'Anulada', badge: 'bg-slate-200 text-slate-800' },
};

export default function MonthlyDispensingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dispensations, setDispensations] = useState<MonthlyDispensationBox[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dispensationsData, patientsData] = await Promise.all([
        getMonthlyDispensations(),
        getPatients(),
      ]);
      setDispensations(dispensationsData);
      setPatients(patientsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error de Carga", description: "No se pudieron cargar los datos de dispensación.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'N/A';
  
  const stats = useMemo(() => {
    return {
      inPreparation: dispensations.filter(d => d.status === MonthlyDispensationBoxStatus.InPreparation).length,
      readyForPickup: dispensations.filter(d => d.status === MonthlyDispensationBoxStatus.ReadyForPickup).length,
      dispensed: dispensations.filter(d => d.status === MonthlyDispensationBoxStatus.Dispensed).length,
    }
  }, [dispensations]);

  const sortedDispensations = useMemo(() => {
    return dispensations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dispensations]);

  const getComplianceStatus = (box: MonthlyDispensationBox) => {
    const hasIssues = box.items.some(item => item.status !== DispensationItemStatus.OkToInclude);
    if (hasIssues) {
      return { text: 'Requiere Revisión', icon: AlertCircle, color: 'text-orange-500' };
    }
    return { text: 'OK', icon: CheckCircle, color: 'text-green-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-slate-600">Cargando dispensaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Dispensación Mensual</h1>
          <p className="text-sm text-muted-foreground">
            Gestión proactiva y centralizada de tratamientos para pacientes crónicos.
          </p>
        </div>
        <Button asChild>
          <Link href="/monthly-dispensing/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Caja de Dispensación
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="En Preparación" value={stats.inPreparation} icon={Box} />
        <StatCard title="Listas para Retiro" value={stats.readyForPickup} icon={Package} />
        <StatCard title="Dispensadas (Mes Actual)" value={stats.dispensed} icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cajas de Dispensación</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Cumplimiento Recetas</TableHead>
                <TableHead>Estado Caja</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDispensations.length > 0 ? sortedDispensations.map(box => {
                const compliance = getComplianceStatus(box);
                const statusInfo = statusConfig[box.status] || { text: box.status, badge: 'bg-slate-200' };
                return (
                  <TableRow key={box.id}>
                    <TableCell className="font-semibold text-slate-700">{format(parse(box.period, 'yyyy-MM', new Date()), 'MMMM yyyy', {locale: es})}</TableCell>
                    <TableCell>{getPatientName(box.patientId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <compliance.icon className={`h-4 w-4 ${compliance.color}`} />
                        <span>{compliance.text}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.badge}>{statusInfo.text}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(box.createdAt), 'dd-MM-yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/monthly-dispensing/${box.id}`}>Ver / Gestionar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No hay cajas de dispensación creadas.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

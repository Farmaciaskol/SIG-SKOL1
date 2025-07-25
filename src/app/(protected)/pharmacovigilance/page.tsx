
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getPharmacovigilanceReports,
  getPatients,
  getExternalPharmacies,
} from '@/lib/data';
import type {
  PharmacovigilanceReport,
  Patient,
  ExternalPharmacy,
} from '@/lib/types';
import { PharmacovigilanceReportStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, HeartPulse, Clock, CalendarPlus, CheckCircle, FileWarning } from 'lucide-react';
import { Bar, BarChart, Pie, PieChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, isThisMonth, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </CardContent>
  </Card>
);

const statusStyles: Record<PharmacovigilanceReportStatus, { badge: string; iconColor: string; icon: React.ElementType }> = {
  [PharmacovigilanceReportStatus.New]: { badge: 'bg-yellow-100 text-yellow-800', iconColor: 'text-yellow-500', icon: PlusCircle },
  [PharmacovigilanceReportStatus.UnderInvestigation]: { badge: 'bg-sky-100 text-sky-800', iconColor: 'text-sky-500', icon: Clock },
  [PharmacovigilanceReportStatus.ActionRequired]: { badge: 'bg-orange-100 text-orange-800', iconColor: 'text-orange-500', icon: FileWarning },
  [PharmacovigilanceReportStatus.Resolved]: { badge: 'bg-green-100 text-green-800', iconColor: 'text-green-500', icon: CheckCircle },
  [PharmacovigilanceReportStatus.Closed]: { badge: 'bg-slate-200 text-slate-800', iconColor: 'text-slate-500', icon: CheckCircle },
};

export default function PharmacovigilancePage() {
  const [reports, setReports] = useState<PharmacovigilanceReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pharmacies, setPharmacies] = useState<ExternalPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsData, patientsData, pharmaciesData] = await Promise.all([
        getPharmacovigilanceReports(),
        getPatients(),
        getExternalPharmacies(),
      ]);
      setReports(reportsData);
      setPatients(patientsData);
      setPharmacies(pharmaciesData);
    } catch (error) {
      console.error('Failed to fetch pharmacovigilance data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos de farmacovigilancia.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const globalStats = useMemo(() => {
    const openCases = reports.filter(r => r.status !== PharmacovigilanceReportStatus.Resolved && r.status !== PharmacovigilanceReportStatus.Closed).length;
    const reportsThisMonth = reports.filter(r => isThisMonth(new Date(r.reportedAt))).length;
    const resolvedCount = reports.filter(r => r.status === PharmacovigilanceReportStatus.Resolved).length;

    const closedReports = reports.filter(r => (r.status === PharmacovigilanceReportStatus.Resolved || r.status === PharmacovigilanceReportStatus.Closed) && r.updatedAt);
    const totalDays = closedReports.reduce((acc, r) => acc + differenceInDays(new Date(r.updatedAt), new Date(r.reportedAt)), 0);
    const averageClosingDays = closedReports.length > 0 ? Math.round(totalDays / closedReports.length) : 0;

    return { openCases, averageClosingDays, reportsThisMonth, resolvedCount };
  }, [reports]);

  const chartDataByStatus = useMemo(() => {
    const statusCounts = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {} as Record<PharmacovigilanceReportStatus, number>);

    return Object.entries(statusCounts).map(([name, value], index) => ({
      name,
      value,
      fill: `var(--chart-${(index % 5) + 1})`,
    }));
  }, [reports]);

  const chartDataByMedication = useMemo(() => {
    const medicationCounts = reports.reduce((acc, report) => {
      const medName = report.suspectedMedicationName?.trim().toLowerCase();
      if (medName) {
        acc[medName] = (acc[medName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(medicationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }));
  }, [reports]);


  const getPatientName = (patientId?: string) => patients.find(p => p.id === patientId)?.name || 'N/A';

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Cargando datos de farmacovigilancia...</p></div>;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Farmacovigilancia</h1>
          <p className="text-sm text-muted-foreground">Monitorización y gestión de eventos adversos y calidad.</p>
        </div>
        <Button asChild>
          <Link href="/pharmacovigilance/new"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Reporte</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Casos Abiertos" value={globalStats.openCases} icon={HeartPulse} />
        <StatCard title="Tiempo Prom. Cierre" value={`${globalStats.averageClosingDays} días`} icon={Clock} />
        <StatCard title="Reportes este Mes" value={globalStats.reportsThisMonth} icon={CalendarPlus} />
        <StatCard title="Total Resueltos" value={globalStats.resolvedCount} icon={CheckCircle} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Distribución por Estado</CardTitle>
            <CardDescription>Proporción de reportes en cada estado del ciclo de vida.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
                <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie data={chartDataByStatus} dataKey="value" nameKey="name" innerRadius={60} />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos para mostrar.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Top 5 Medicamentos con Reportes</CardTitle>
            <CardDescription>Principios activos más frecuentemente implicados en reportes.</CardDescription>
          </CardHeader>
          <CardContent>
             {reports.length > 0 ? (
                <ChartContainer config={{ total: { label: "Reportes", color: "hsl(var(--chart-1))" } }} className="h-[250px] w-full">
                <BarChart accessibilityLayer data={chartDataByMedication} layout="vertical" margin={{ right: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} hide />
                    <XAxis dataKey="total" type="number" hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" radius={4} />
                </BarChart>
                </ChartContainer>
             ) : (
                 <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos para mostrar.</div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Lista de Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center h-24 flex items-center justify-center">No se encontraron reportes.</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Reporte</TableHead>
                      <TableHead>Fecha Reporte</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-primary">{report.id}</TableCell>
                        <TableCell>{format(new Date(report.reportedAt), 'dd-MM-yyyy')}</TableCell>
                        <TableCell>{getPatientName(report.patientId)}</TableCell>
                        <TableCell>{report.suspectedMedicationName}</TableCell>
                        <TableCell>
                          <Badge className={statusStyles[report.status].badge}>{statusStyles[report.status].text}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/pharmacovigilance/${report.id}`}><Eye className="mr-2 h-4 w-4" /> Ver/Editar</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {reports.map(report => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="font-mono text-primary">{report.id}</CardTitle>
                        <Badge className={statusStyles[report.status].badge}>{statusStyles[report.status].text}</Badge>
                      </div>
                       <p className="text-xs text-muted-foreground">
                        {format(new Date(report.reportedAt), 'dd MMMM, yyyy', { locale: es })}
                      </p>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                       <p><span className="font-semibold">Paciente:</span> {getPatientName(report.patientId)}</p>
                       <p><span className="font-semibold">Medicamento:</span> {report.suspectedMedicationName}</p>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-3">
                       <Button variant="outline" size="sm" asChild className="w-full">
                         <Link href={`/pharmacovigilance/${report.id}`}><Eye className="mr-2 h-4 w-4" /> Ver/Editar Reporte</Link>
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}


'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPharmacovigilanceReport,
  updatePharmacovigilanceReport,
  getPatient,
  getRecipe,
} from '@/lib/data';
import type {
  PharmacovigilanceReport,
  Patient,
  Recipe
} from '@/lib/types';
import { PharmacovigilanceReportStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2, User, FileText, Calendar, FlaskConical, AlertCircle, Edit, Save, MessageSquare, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const statusStyles: Record<PharmacovigilanceReportStatus, { badge: string; text: string }> = {
  [PharmacovigilanceReportStatus.New]: { badge: 'bg-yellow-100 text-yellow-800', text: 'Nuevo' },
  [PharmacovigilanceReportStatus.UnderInvestigation]: { badge: 'bg-sky-100 text-sky-800', text: 'En Investigación' },
  [PharmacovigilanceReportStatus.ActionRequired]: { badge: 'bg-orange-100 text-orange-800', text: 'Acción Requerida' },
  [PharmacovigilanceReportStatus.Resolved]: { badge: 'bg-green-100 text-green-800', text: 'Resuelto' },
  [PharmacovigilanceReportStatus.Closed]: { badge: 'bg-slate-200 text-slate-800', text: 'Cerrado' },
};

export default function PharmacovigilanceReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [report, setReport] = useState<PharmacovigilanceReport | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [currentStatus, setCurrentStatus] = useState<PharmacovigilanceReportStatus | ''>('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [pharmacyResponse, setPharmacyResponse] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');


  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const reportData = await getPharmacovigilanceReport(id);
      if (reportData) {
        setReport(reportData);
        setCurrentStatus(reportData.status);
        setActionsTaken(reportData.actionsTaken || '');
        setPharmacyResponse(reportData.pharmacyResponse || '');
        setResolutionDetails(reportData.resolutionDetails || '');

        if (reportData.patientId) {
          const patientData = await getPatient(reportData.patientId);
          setPatient(patientData);
        }
        if (reportData.recipeId) {
          const recipeData = await getRecipe(reportData.recipeId);
          setRecipe(recipeData);
        }
      } else {
        toast({ title: 'Error', description: 'Reporte de farmacovigilancia no encontrado.', variant: 'destructive' });
        router.push('/pharmacovigilance');
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del reporte.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveChanges = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
        const updates: Partial<PharmacovigilanceReport> = {
            status: currentStatus as PharmacovigilanceReportStatus,
            actionsTaken,
            pharmacyResponse,
            resolutionDetails,
        };
        await updatePharmacovigilanceReport(report.id, updates);
        toast({ title: 'Reporte Actualizado', description: 'Los cambios han sido guardados exitosamente.' });
        fetchData();
    } catch (error) {
        console.error('Failed to save changes:', error);
        toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando reporte...</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-10 w-10" asChild>
          <Link href="/pharmacovigilance"><ChevronLeft className="h-5 w-5"/></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Reporte FV: {report.id}</h1>
          <p className="text-sm text-muted-foreground">Gestión y seguimiento de eventos adversos y de calidad.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Report Details */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-primary">
                        <span>Información del Reporte</span>
                        <Badge className={statusStyles[report.status]?.badge || 'bg-slate-200 text-slate-800'}>
                            {statusStyles[report.status]?.text || report.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div><span className="font-semibold text-foreground">Notificador:</span> {report.reporterName}</div>
                        <div><span className="font-semibold text-foreground">Fecha Reporte:</span> {format(parseISO(report.reportedAt), 'dd MMM, yyyy', { locale: es })}</div>
                        <div><span className="font-semibold text-foreground">Gravedad:</span> {report.severity}</div>
                        <div><span className="font-semibold text-foreground">Desenlace:</span> {report.outcome}</div>
                        <div className="md:col-span-2"><span className="font-semibold text-foreground">Fecha Inicio Reacción:</span> {format(parseISO(report.reactionStartDate), 'dd MMM, yyyy', { locale: es })}</div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-primary">Descripción del Problema</CardTitle></CardHeader>
                <CardContent className="p-4 border rounded-md bg-muted/50 text-sm text-foreground/90 whitespace-pre-wrap">
                    {report.problemDescription}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-primary">Medicamento Sospechoso</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p className="text-lg font-bold">{report.suspectedMedicationName}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="font-semibold">Dosis:</span> {report.dose || 'N/A'}</div>
                        <div><span className="font-semibold">Forma Farmacéutica:</span> {report.pharmaceuticalForm || 'N/A'}</div>
                        <div><span className="font-semibold">Lote:</span> {report.lotNumber || 'N/A'}</div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-primary">Gestión del Caso</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="status-select">Cambiar Estado</Label>
                             <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as PharmacovigilanceReportStatus)}>
                                <SelectTrigger id="status-select"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(statusStyles).map(([status, {text}]) => (
                                        <SelectItem key={status} value={status}>{text}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="actions-taken"><Edit className="inline-block h-4 w-4 mr-2"/>Acciones Tomadas / Investigación</Label>
                        <Textarea id="actions-taken" value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} placeholder="Describa las acciones inmediatas o el plan de investigación..." rows={5}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pharmacy-response"><MessageSquare className="inline-block h-4 w-4 mr-2"/>Respuesta para Farmacia/Paciente</Label>
                        <Textarea id="pharmacy-response" value={pharmacyResponse} onChange={(e) => setPharmacyResponse(e.target.value)} placeholder="Comunicación o recomendaciones para el involucrado..." rows={3}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="resolution-details"><CheckSquare className="inline-block h-4 w-4 mr-2"/>Detalles de Resolución</Label>
                        <Textarea id="resolution-details" value={resolutionDetails} onChange={(e) => setResolutionDetails(e.target.value)} placeholder="Conclusión final del caso, causa raíz y medidas preventivas." rows={4}/>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Save className="mr-2 h-4 w-4"/>
                            Guardar Cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>

        {/* Right Column - Context */}
        <div className="lg:col-span-1 space-y-6">
            {patient && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><User /> Paciente</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p className="font-bold text-lg text-primary">{report.patientInfoSnapshot.name}</p>
                        <p className="text-muted-foreground">{report.patientInfoSnapshot.rut}</p>
                         <p className="text-muted-foreground">{report.patientInfoSnapshot.age} años, {report.patientInfoSnapshot.gender}</p>
                        <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <Link href={`/patients/${report.patientId}`}>Ver Ficha Completa</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
             {recipe && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><FileText /> Receta Asociada</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p className="font-bold text-lg font-mono text-primary">{recipe.id}</p>
                        <p className="text-muted-foreground">
                            {recipe.items[0]?.principalActiveIngredient}
                            {recipe.items.length > 1 && ` y ${recipe.items.length - 1} más`}
                        </p>
                        <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <Link href={`/recipes/${recipe.id}`}>Ver Receta Completa</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
             {report.concomitantMedications && (
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><FlaskConical /> Medicación Concomitante</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                        <p>{report.concomitantMedications}</p>
                    </CardContent>
                </Card>
             )}
        </div>
      </div>
    </div>
  )
}

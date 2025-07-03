
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPatient, getRecipes, getDoctors, getControlledSubstanceLogForPatient, getPharmacovigilanceReportsForPatient, Patient, Recipe, Doctor, ControlledSubstanceLogEntry, PharmacovigilanceReport, PharmacovigilanceReportStatus } from '@/lib/data';
import { analyzePatientHistory, AnalyzePatientHistoryOutput } from '@/ai/flows/analyze-patient-history';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, MapPin, AlertTriangle, Pencil, Clock, Wand2, FlaskConical, FileText, CheckCircle2, BriefcaseMedical, DollarSign, Calendar, Lock, ShieldAlert, Eye, PlusCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { DispensationDialog } from '@/components/app/dispensation-dialog';
import { PatientFormDialog } from '@/components/app/patient-form-dialog';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </CardContent>
  </Card>
);

const statusStyles: Record<PharmacovigilanceReportStatus, string> = {
  [PharmacovigilanceReportStatus.New]: 'bg-yellow-100 text-yellow-800',
  [PharmacovigilanceReportStatus.UnderInvestigation]: 'bg-sky-100 text-sky-800',
  [PharmacovigilanceReportStatus.ActionRequired]: 'bg-orange-100 text-orange-800',
  [PharmacovigilanceReportStatus.Resolved]: 'bg-green-100 text-green-800',
  [PharmacovigilanceReportStatus.Closed]: 'bg-slate-200 text-slate-800',
};


export default function PatientDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [controlledLogs, setControlledLogs] = useState<ControlledSubstanceLogEntry[]>([]);
  const [pharmaReports, setPharmaReports] = useState<PharmacovigilanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePatientHistoryOutput | null>(null);
  const [isDispensationDialogOpen, setIsDispensationDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);


  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [patientData, allRecipes, allDoctors, controlledLogsData, pharmaReportsData] = await Promise.all([
        getPatient(id),
        getRecipes(),
        getDoctors(),
        getControlledSubstanceLogForPatient(id),
        getPharmacovigilanceReportsForPatient(id),
      ]);
      
      if (patientData) {
        setPatient(patientData);
        setControlledLogs(controlledLogsData);
        setPharmaReports(pharmaReportsData);
        const patientRecipes = allRecipes.filter(r => r.patientId === id);
        setRecipes(patientRecipes);
        
        const patientDoctorIds = [...new Set(patientRecipes.map(r => r.doctorId).concat(patientData.associatedDoctorIds || []))];
        const associatedDoctors = allDoctors.filter(d => patientDoctorIds.includes(d.id));
        setDoctors(associatedDoctors);

      } else {
        toast({ title: 'Error', description: 'Paciente no encontrado.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
      toast({ title: 'Error de Carga', description: 'No se pudieron cargar los datos del paciente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalyzeHistory = async () => {
    if (!patient) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const magistralMedications = recipes.flatMap(r => r.items.map(i => `${i.principalActiveIngredient} ${i.concentrationValue}${i.concentrationUnit}`));
      
      const result = await analyzePatientHistory({
        magistralMedications,
        commercialMedications: patient.commercialMedications || [],
        allergies: patient.allergies || []
      });
      setAnalysisResult(result);
      toast({ title: 'Análisis Completado', description: 'La IA ha revisado el historial del paciente.' });
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({ title: 'Error de IA', description: 'No se pudo completar el análisis.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const patientStats = useMemo(() => {
    const activeMedications = new Set([
        ...(patient?.commercialMedications || []),
        ...recipes.flatMap(r => r.items.map(i => i.principalActiveIngredient))
    ]);

    const lastDispensation = recipes
        .filter(r => r.dispensationDate)
        .sort((a, b) => new Date(b.dispensationDate!).getTime() - new Date(a.dispensationDate!).getTime())[0];

    const monthlyCost = recipes.reduce((sum, recipe) => sum + (recipe.preparationCost || 0), 0);

    return {
        estimatedMonthlyCost: `$${monthlyCost.toLocaleString('es-CL')}`,
        activeMedicationsCount: activeMedications.size,
        historicalRecipesCount: recipes.length,
        lastDispensationDate: lastDispensation?.dispensationDate && isValid(parseISO(lastDispensation.dispensationDate)) ? format(parseISO(lastDispensation.dispensationDate), 'dd-MM-yyyy') : 'N/A'
    };
  }, [patient, recipes]);

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
  
  const hasAlerts = (patient.allergies && patient.allergies.length > 0) || (patient.adverseReactions && patient.adverseReactions.length > 0);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" className="h-10 w-10 hidden md:flex" asChild>
                <Link href="/patients"><User className="h-5 w-5"/></Link>
             </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">{patient.name}</h1>
              <p className="text-muted-foreground">{patient.rut} | {patient.gender}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <Button variant="outline"><ShieldAlert className="mr-2 h-4 w-4"/> Reportar Evento FV</Button>
            <Button onClick={handleAnalyzeHistory} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Analizar Historial (IA)
            </Button>
            <Button onClick={() => setIsEditModalOpen(true)}><Pencil className="mr-2 h-4 w-4"/> Editar Paciente</Button>
          </div>
        </div>
        
        {/* Clinical Alerts */}
        {hasAlerts && (
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-800 [&>svg]:text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-bold">Alertas Clínicas Críticas</AlertTitle>
              <AlertDescription>
                  <ul className="list-disc pl-5">
                    {patient.allergies?.map(allergy => <li key={`allergy-${allergy}`}>Alergia: <span className="font-semibold">{allergy}</span></li>)}
                    {patient.adverseReactions?.map(reaction => <li key={`reaction-${reaction.medication}`}>Reacción Adversa a <span className="font-semibold">{reaction.medication}</span>: {reaction.description}</li>)}
                  </ul>
              </AlertDescription>
          </Alert>
        )}

        {/* Stat Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Costo Mensual Estimado" value={patientStats.estimatedMonthlyCost} icon={DollarSign} />
          <StatCard title="Medicamentos Activos" value={patientStats.activeMedicationsCount} icon={FlaskConical} />
          <StatCard title="Recetas Históricas" value={patientStats.historicalRecipesCount} icon={FileText} />
          <StatCard title="Última Dispensación" value={patientStats.lastDispensationDate} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* AI Analysis */}
            {(isAnalyzing || analysisResult) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wand2 className="text-primary"/>Análisis de Seguridad del Paciente (IA)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando historial...</div>
                  ) : analysisResult ? (
                    <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <h4 className="font-bold text-slate-800">Análisis Completo</h4>
                          <p className="text-sm text-slate-700">{analysisResult.analysis}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
            
            {/* Commercial Medications */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tratamiento con Medicamentos Comerciales</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsDispensationDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Dispensar Med. Controlado</Button>
                </CardHeader>
                <CardContent>
                  {patient.commercialMedications && patient.commercialMedications.length > 0 ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                          {patient.commercialMedications.map((med, index) => <li key={index}>- {med}</li>)}
                      </ul>
                  ) : (
                      <p className="text-sm text-muted-foreground">No hay medicamentos comerciales activos registrados.</p>
                  )}
                </CardContent>
            </Card>

              {/* Timeline and History */}
              <Accordion type="multiple" defaultValue={['history']} className="w-full space-y-6">
                  <Card>
                      <AccordionItem value="history" className="border-b-0">
                          <AccordionTrigger className="text-xl font-semibold p-6"><FileText className="mr-3 h-5 w-5 text-primary"/>Historial de Recetas Magistrales</AccordionTrigger>
                          <AccordionContent className="px-6 pb-6">
                              {recipes.length > 0 ? (
                                  <div className="space-y-4">
                                      {recipes.map(recipe => (
                                          <div key={recipe.id} className="p-3 border rounded-md">
                                              <div className="flex justify-between items-center">
                                                  <p className="font-bold text-primary">{recipe.id}</p>
                                                  <Badge variant="secondary">{recipe.status}</Badge>
                                              </div>
                                              <p className="text-sm text-muted-foreground">Fecha: {isValid(parseISO(recipe.prescriptionDate)) ? format(parseISO(recipe.prescriptionDate), 'dd-MM-yyyy') : 'Fecha inválida'}</p>
                                              <p className="text-sm font-medium mt-2">{recipe.items[0].principalActiveIngredient}</p>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-muted-foreground">No hay recetas históricas para este paciente.</p>
                              )}
                          </AccordionContent>
                      </AccordionItem>
                  </Card>
                  <Card>
                      <AccordionItem value="controlled" className="border-b-0">
                          <AccordionTrigger className="text-xl font-semibold p-6"><Lock className="mr-3 h-5 w-5 text-primary"/>Historial de Recetas Controladas</AccordionTrigger>
                          <AccordionContent className="px-6 pb-6">
                              {controlledLogs.length > 0 ? (
                                  <Table>
                                      <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Medicamento</TableHead><TableHead>Folio Receta</TableHead><TableHead>Retirado por</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                          {controlledLogs.map(log => (
                                              <TableRow key={log.id}>
                                                  <TableCell>{isValid(parseISO(log.dispensationDate)) ? format(parseISO(log.dispensationDate), 'dd-MM-yy') : ''}</TableCell>
                                                  <TableCell>{log.medicationName}</TableCell>
                                                  <TableCell className="font-mono">{log.prescriptionFolio}</TableCell>
                                                  <TableCell>{log.retrievedBy_Name}</TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              ) : (
                                  <p className="text-muted-foreground">No hay dispensaciones controladas registradas.</p>
                              )}
                          </AccordionContent>
                      </AccordionItem>
                  </Card>
                  <Card>
                      <AccordionItem value="pharma" className="border-b-0">
                          <AccordionTrigger className="text-xl font-semibold p-6"><ShieldAlert className="mr-3 h-5 w-5 text-primary"/>Eventos de Farmacovigilancia</AccordionTrigger>
                          <AccordionContent className="px-6 pb-6">
                              {pharmaReports.length > 0 ? (
                                  <Table>
                                      <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Problema</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                      <TableBody>
                                          {pharmaReports.map(report => (
                                              <TableRow key={report.id}>
                                                  <TableCell>{isValid(parseISO(report.reportedAt)) ? format(parseISO(report.reportedAt), 'dd-MM-yy') : ''}</TableCell>
                                                  <TableCell className="max-w-[200px] truncate">{report.problemDescription}</TableCell>
                                                  <TableCell><Badge className={statusStyles[report.status]}>{report.status}</Badge></TableCell>
                                                  <TableCell>
                                                    <Button variant="ghost" size="sm" asChild>
                                                      <Link href={`/pharmacovigilance/${report.id}`}><Eye className="mr-2 h-4 w-4"/> Ver</Link>
                                                    </Button>
                                                  </TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                              ) : (
                                  <p className="text-muted-foreground">No hay eventos de farmacovigilancia para este paciente.</p>
                              )}
                          </AccordionContent>
                      </AccordionItem>
                  </Card>
              </Accordion>

          </div>
          <div className="lg:col-span-1 space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email}</span></div>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone}</span></div>
                    {patient.address && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.address}</span></div>}
                </CardContent>
              </Card>

              {/* Doctors */}
              <Card>
                <CardHeader>
                  <CardTitle>Médicos Tratantes</CardTitle>
                </CardHeader>
                <CardContent>
                  {doctors.length > 0 ? (
                    <ul className="space-y-3">
                      {doctors.map(doctor => (
                          <li key={doctor.id} className="flex items-center gap-3 text-sm">
                              <BriefcaseMedical className="h-4 w-4 text-muted-foreground" />
                              <div>
                                  <p className="font-medium">{doctor.name}</p>
                                  <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                              </div>
                          </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">No hay médicos asociados.</p>
                        <Button asChild variant="outline">
                            <Link href="/doctors"><PlusCircle className="mr-2 h-4 w-4"/>Asociar Médico</Link>
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
      
      {patient && (
        <DispensationDialog 
          isOpen={isDispensationDialogOpen}
          onOpenChange={setIsDispensationDialogOpen}
          patient={patient}
          doctors={doctors}
          onDispensationSuccess={fetchData}
        />
      )}

      <PatientFormDialog
        patient={patient}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={fetchData}
      />
    </>
  );
}

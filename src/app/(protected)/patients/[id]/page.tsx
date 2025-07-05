
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPatient, getRecipes, getDoctors, getControlledSubstanceLogForPatient, getPharmacovigilanceReportsForPatient, updatePatient, getInventory } from '@/lib/data';
import type { Patient, Recipe, Doctor, ControlledSubstanceLogEntry, PharmacovigilanceReport, InventoryItem } from '@/lib/types';
import { PharmacovigilanceReportStatus, RecipeStatus } from '@/lib/types';
import { analyzePatientHistory, AnalyzePatientHistoryOutput } from '@/ai/flows/analyze-patient-history';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, MapPin, AlertTriangle, Pencil, Clock, Wand2, FlaskConical, FileText, CheckCircle2, BriefcaseMedical, DollarSign, Calendar, Lock, ShieldAlert, Eye, PlusCircle, Search, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { PatientFormDialog } from '@/components/app/patient-form-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
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
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [controlledLogs, setControlledLogs] = useState<ControlledSubstanceLogEntry[]>([]);
  const [pharmaReports, setPharmaReports] = useState<PharmacovigilanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePatientHistoryOutput | null>(null);
  
  // Dialogs State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssociateDoctorModalOpen, setIsAssociateDoctorModalOpen] = useState(false);
  const [doctorsToAssociate, setDoctorsToAssociate] = useState<string[]>([]);
  const [isSavingAssociation, setIsSavingAssociation] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  
  // Commercial Meds Dialog State
  const [isCommercialMedsModalOpen, setIsCommercialMedsModalOpen] = useState(false);
  const [isSavingMeds, setIsSavingMeds] = useState(false);
  const [currentMeds, setCurrentMeds] = useState<string[]>([]);
  const [medToAdd, setMedToAdd] = useState('');


  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [patientData, allRecipes, allDoctorsData, controlledLogsData, pharmaReportsData, inventoryData] = await Promise.all([
        getPatient(id),
        getRecipes(),
        getDoctors(),
        getControlledSubstanceLogForPatient(id),
        getPharmacovigilanceReportsForPatient(id),
        getInventory(),
      ]);
      
      setAllDoctors(allDoctorsData);
      setInventory(inventoryData);

      if (patientData) {
        setPatient(patientData);
        setControlledLogs(controlledLogsData);
        setPharmaReports(pharmaReportsData);
        const patientRecipes = allRecipes.filter(r => r.patientId === id);
        setRecipes(patientRecipes);
        
        const patientDoctorIds = [...new Set(patientRecipes.map(r => r.doctorId).concat(patientData.associatedDoctorIds || []))];
        const associatedDoctors = allDoctorsData.filter(d => patientDoctorIds.includes(d.id));
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

  const activeTreatments = useMemo(() => {
    if (!patient) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only

    const activeMagistralRecipes = recipes
        .filter(r => ![
            RecipeStatus.Dispensed,
            RecipeStatus.Cancelled,
            RecipeStatus.Rejected,
            RecipeStatus.Archived,
        ].includes(r.status))
        .map(r => {
            let isExpired = false;
            if (r.dueDate) {
                const dueDate = parseISO(r.dueDate);
                if (isValid(dueDate)) {
                    dueDate.setHours(0, 0, 0, 0);
                    isExpired = dueDate < today;
                }
            }
            return {
                type: 'magistral' as const,
                name: r.items[0]?.principalActiveIngredient || 'Preparado Magistral',
                details: `Receta #${r.id.substring(0, 6)}... - ${r.status}`,
                id: r.id,
                isExpired,
            }
        });
    
    const activeCommercialMeds = (patient.commercialMedications || []).map((med, index) => ({
        type: 'commercial' as const,
        name: med,
        details: 'Medicamento Comercial',
        id: `comm-${index}`,
        isExpired: false,
    }));

    return [...activeMagistralRecipes, ...activeCommercialMeds];
  }, [patient, recipes]);

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
    const lastDispensation = recipes
        .filter(r => r.dispensationDate)
        .sort((a, b) => new Date(b.dispensationDate!).getTime() - new Date(a.dispensationDate!).getTime())[0];

    const monthlyCost = recipes.reduce((sum, recipe) => sum + (recipe.preparationCost || 0), 0);

    return {
        estimatedMonthlyCost: `$${monthlyCost.toLocaleString('es-CL')}`,
        activeMedicationsCount: activeTreatments.length,
        historicalRecipesCount: recipes.length,
        lastDispensationDate: lastDispensation?.dispensationDate && isValid(parseISO(lastDispensation.dispensationDate)) ? format(parseISO(lastDispensation.dispensationDate), 'dd-MM-yyyy') : 'N/A'
    };
  }, [recipes, activeTreatments]);

  const handleOpenAssociateModal = () => {
    setDoctorsToAssociate(patient?.associatedDoctorIds || []);
    setDoctorSearchTerm('');
    setIsAssociateDoctorModalOpen(true);
  };
  
  const handleSaveAssociations = async () => {
    if (!patient) return;
    setIsSavingAssociation(true);
    try {
      await updatePatient(patient.id, { associatedDoctorIds: doctorsToAssociate });
      toast({ title: 'Médicos Actualizados', description: 'Se han guardado las asociaciones de médicos.' });
      setIsAssociateDoctorModalOpen(false);
      await fetchData(); // Refresh data
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar las asociaciones.', variant: 'destructive' });
    } finally {
      setIsSavingAssociation(false);
    }
  };
  
  const handleOpenCommercialMedsModal = () => {
    setCurrentMeds(patient?.commercialMedications || []);
    setMedToAdd('');
    setIsCommercialMedsModalOpen(true);
  };

  const handleAddMed = () => {
    if (medToAdd && !currentMeds.some(m => m.toLowerCase() === medToAdd.toLowerCase())) {
        setCurrentMeds([...currentMeds, medToAdd]);
        setMedToAdd('');
    }
  };

  const handleRemoveMed = (medToRemove: string) => {
    setCurrentMeds(currentMeds.filter(med => med !== medToRemove));
  };

  const handleSaveCommercialMeds = async () => {
    if (!patient) return;
    setIsSavingMeds(true);
    try {
      await updatePatient(patient.id, { commercialMedications: currentMeds });
      toast({ title: 'Medicamentos Actualizados', description: 'La lista de medicamentos comerciales ha sido guardada.' });
      setIsCommercialMedsModalOpen(false);
      await fetchData(); // To get the updated patient data
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los medicamentos.', variant: 'destructive' });
    } finally {
      setIsSavingMeds(false);
    }
  };

  const availableInventoryMeds = useMemo(() => {
    if (!inventory || !currentMeds) return [];
    const currentMedsLower = currentMeds.map(m => m.toLowerCase());
    return inventory.filter(item => !currentMedsLower.includes(item.name.toLowerCase()));
  }, [inventory, currentMeds]);


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
            <Button variant="outline" asChild>
                <Link href={`/pharmacovigilance/new?patientId=${patient.id}`}>
                    <ShieldAlert className="mr-2 h-4 w-4"/> Reportar Evento FV
                </Link>
            </Button>
            <Button onClick={handleAnalyzeHistory} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Analizar Historial (IA)
            </Button>
            <Button onClick={() => setIsEditModalOpen(true)}><Pencil className="mr-2 h-4 w-4"/> Editar Paciente</Button>
          </div>
        </div>
        
        {/* Clinical Alerts */}
        {hasAlerts && (
          <Alert variant="warning">
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
                          <h4 className="font-bold text-foreground">Análisis Completo</h4>
                          <p className="text-sm text-foreground/90">{analysisResult.analysis}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
            
            {/* Active Treatments */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Tratamientos Activos</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleOpenCommercialMedsModal}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar Medicamentos
                    </Button>
                </CardHeader>
                <CardContent>
                    {activeTreatments.length > 0 ? (
                        <ul className="space-y-3">
                            {activeTreatments.map((treatment) => (
                                <li key={treatment.id} className={cn("flex items-center justify-between p-3 bg-muted/50 rounded-lg", treatment.isExpired && "bg-red-50 border-l-4 border-red-400")}>
                                    <div>
                                        <p className={cn("font-semibold text-foreground", treatment.isExpired && "text-red-800")}>{treatment.name}</p>
                                        <p className="text-xs text-muted-foreground">{treatment.details}</p>
                                        {treatment.isExpired && (
                                            <div className="flex items-center gap-1.5 mt-2 text-red-600">
                                                <AlertTriangle className="h-4 w-4" />
                                                <p className="text-sm font-semibold">Receta Vencida</p>
                                            </div>
                                        )}
                                    </div>
                                    {treatment.type === 'magistral' && (
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/recipes/${treatment.id}`}>Ver Receta</Link>
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay tratamientos activos registrados.</p>
                    )}
                </CardContent>
            </Card>

              {/* Timeline and History */}
              <Accordion type="multiple" defaultValue={['history']} className="w-full space-y-6">
                  <Card>
                      <AccordionItem value="history" className="border-b-0">
                          <AccordionTrigger className="text-xl font-semibold p-6 hover:no-underline"><FileText className="mr-3 h-5 w-5 text-primary"/>Historial de Recetas Magistrales</AccordionTrigger>
                          <AccordionContent className="px-6 pb-6">
                              <div className="flex justify-end mb-4">
                                <Button asChild>
                                  <Link href={`/recipes/new?patientId=${patient.id}`}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta Magistral
                                  </Link>
                                </Button>
                              </div>
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
                          <AccordionTrigger className="text-xl font-semibold p-6 hover:no-underline"><Lock className="mr-3 h-5 w-5 text-primary"/>Historial de Recetas Controladas</AccordionTrigger>
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
                          <AccordionTrigger className="text-xl font-semibold p-6 hover:no-underline"><ShieldAlert className="mr-3 h-5 w-5 text-primary"/>Eventos de Farmacovigilancia</AccordionTrigger>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Médicos Tratantes</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleOpenAssociateModal}>
                    <PlusCircle className="mr-2 h-4 w-4"/>Asociar Médico
                  </Button>
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
                        <Button onClick={handleOpenAssociateModal}>
                            <PlusCircle className="mr-2 h-4 w-4"/>Asociar Primer Médico
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
      
      <PatientFormDialog
        patient={patient}
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={fetchData}
      />

      <Dialog open={isAssociateDoctorModalOpen} onOpenChange={setIsAssociateDoctorModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Asociar Médicos a {patient.name}</DialogTitle>
                <DialogDescription>
                    Busque y seleccione los médicos que tratan a este paciente.
                </DialogDescription>
            </DialogHeader>
            <div className="relative mt-2 mb-4">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o especialidad..."
                value={doctorSearchTerm}
                onChange={(e) => setDoctorSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="space-y-2 py-2 max-h-60 overflow-y-auto pr-2">
                {allDoctors
                  .filter(doctor =>
                    doctor.name.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
                    doctor.specialty.toLowerCase().includes(doctorSearchTerm.toLowerCase())
                  )
                  .map(doctor => (
                    <div key={doctor.id} className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted/50">
                        <Checkbox
                            id={`doc-${doctor.id}`}
                            checked={doctorsToAssociate.includes(doctor.id)}
                            onCheckedChange={(checked) => {
                                setDoctorsToAssociate(prev => 
                                    checked
                                        ? [...prev, doctor.id]
                                        : prev.filter(id => id !== doctor.id)
                                );
                            }}
                        />
                        <label htmlFor={`doc-${doctor.id}`} className="w-full cursor-pointer">
                            <p className="font-medium">{doctor.name}</p>
                            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        </label>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAssociateDoctorModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveAssociations} disabled={isSavingAssociation}>
                    {isSavingAssociation && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCommercialMedsModalOpen} onOpenChange={setIsCommercialMedsModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Editar Medicamentos Comerciales</DialogTitle>
            <DialogDescription>
                Añada o elimine los medicamentos que el paciente está tomando, seleccionándolos desde el inventario.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                    <Select value={medToAdd} onValueChange={setMedToAdd}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar medicamento del inventario..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInventoryMeds.length > 0 ? (
                          availableInventoryMeds.map(item => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name} ({item.quantity} {item.unit})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">No hay más medicamentos para añadir.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddMed} type="button" disabled={!medToAdd}>Añadir</Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {currentMeds.length > 0 ? currentMeds.map((med, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <span className="text-sm">{med}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMed(med)}>
                        <X className="h-4 w-4" />
                        </Button>
                    </div>
                    )) : <p className="text-sm text-center text-muted-foreground p-4">No hay medicamentos añadidos.</p>}
                </div>
            </div>
            <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCommercialMedsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCommercialMeds} disabled={isSavingMeds}>
                {isSavingMeds && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

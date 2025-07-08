
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPatient, getRecipes, getDoctors, getControlledSubstanceLogForPatient, getPharmacovigilanceReportsForPatient, updatePatient, getInventory, addPharmacovigilanceReport } from '@/lib/data';
import type { Patient, Recipe, Doctor, ControlledSubstanceLogEntry, PharmacovigilanceReport, InventoryItem } from '@/lib/types';
import { PharmacovigilanceReportStatus, RecipeStatus, PharmacovigilanceSeverity, PharmacovigilanceOutcome } from '@/lib/types';
import { analyzePatientHistory, AnalyzePatientHistoryOutput } from '@/ai/flows/analyze-patient-history';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, MapPin, AlertTriangle, Pencil, Clock, Wand2, FlaskConical, FileText, CheckCircle2, BriefcaseMedical, DollarSign, Calendar, Lock, ShieldAlert, Eye, PlusCircle, Search, X, ChevronLeft, Calendar as CalendarIcon, Save, MoreHorizontal } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { PatientFormDialog } from '@/components/app/patient-form-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { InventoryItemForm } from '@/components/app/inventory-item-form';
import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


type ActiveTreatment = {
  type: 'magistral';
  recipe: Recipe;
} | {
  type: 'commercial';
  inventoryItem: InventoryItem | { name: string; id: string };
};

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

const reportSchema = z.object({
  severity: z.nativeEnum(PharmacovigilanceSeverity, { required_error: 'La gravedad es requerida.'}),
  outcome: z.nativeEnum(PharmacovigilanceOutcome, { required_error: 'El desenlace es requerido.'}),
  reactionStartDate: z.date({ required_error: 'La fecha de inicio de la reacción es requerida.'}),
  problemDescription: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  concomitantMedications: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

const PharmacovigilanceDialog = ({ 
  isOpen, 
  onOpenChange, 
  patient, 
  treatment, 
  onSuccess 
} : {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  treatment: ActiveTreatment | null;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();
  const [user] = useAuthState(auth);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      concomitantMedications: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        concomitantMedications: '',
        problemDescription: '',
        severity: undefined,
        outcome: undefined,
        reactionStartDate: undefined,
      });
    }
  }, [isOpen, form]);
  
  const onSubmit = async (data: ReportFormValues) => {
    if (!patient || !treatment || !user) {
        toast({ title: "Error", description: "Faltan datos para crear el reporte.", variant: "destructive" });
        return;
    }
    
    let age;
    if (patient.rut) {
        try {
            const rutYear = parseInt(patient.rut.split('-')[0].slice(-2));
            const currentYear = new Date().getFullYear() % 100;
            let birthYear = (rutYear > currentYear) ? 1900 + rutYear : 2000 + rutYear;
            age = new Date().getFullYear() - birthYear;
        } catch(e) { /* ignore */ }
    }

    const reportData = {
        ...data,
        reporterName: user.displayName || user.email || 'Sistema',
        patientId: patient.id,
        isMagistral: treatment.type === 'magistral',
        recipeId: treatment.type === 'magistral' ? treatment.recipe.id : undefined,
        suspectedMedicationName: treatment.type === 'magistral' ? (treatment.recipe.items[0]?.principalActiveIngredient || 'N/A') : treatment.inventoryItem.name,
        dose: treatment.type === 'magistral' ? `${treatment.recipe.items[0]?.concentrationValue || ''}${treatment.recipe.items[0]?.concentrationUnit || ''}` : `${(treatment.inventoryItem as InventoryItem).doseValue || ''} ${(treatment.inventoryItem as InventoryItem).doseUnit || ''}`,
        pharmaceuticalForm: treatment.type === 'magistral' ? treatment.recipe.items[0]?.pharmaceuticalForm : (treatment.inventoryItem as InventoryItem).pharmaceuticalForm,
        lotNumber: treatment.type === 'magistral' ? treatment.recipe.internalPreparationLot : undefined,
        patientInfoSnapshot: {
            name: patient.name,
            rut: patient.rut,
            gender: patient.gender || 'Otro',
            age: age,
        },
        reactionStartDate: data.reactionStartDate.toISOString(),
    };
    
    try {
        await addPharmacovigilanceReport(reportData);
        toast({ title: 'Reporte de FV Creado', description: 'El nuevo reporte se ha guardado exitosamente.' });
        onSuccess();
    } catch(error) {
        console.error("Failed to create FV report:", error);
        toast({ title: "Error al Crear Reporte", description: error instanceof Error ? error.message : "Ocurrió un error inesperado.", variant: "destructive" });
    }
  };

  const { isSubmitting } = form.formState;
  
  if (!treatment || !patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reportar Evento Adverso</DialogTitle>
          <DialogDescription>
            Reporte de evento para el medicamento <span className="font-bold text-primary">{treatment.type === 'magistral' ? (treatment.recipe.items[0]?.principalActiveIngredient || 'N/A') : treatment.inventoryItem.name}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="reactionStartDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Fecha Inicio Reacción *</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="severity" render={({ field }) => (
                        <FormItem><FormLabel>Gravedad *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent>{Object.values(PharmacovigilanceSeverity).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="outcome" render={({ field }) => (
                        <FormItem><FormLabel>Desenlace *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger></FormControl><SelectContent>{Object.values(PharmacovigilanceOutcome).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="problemDescription" render={({ field }) => (
                    <FormItem><FormLabel>Descripción Detallada de la Reacción *</FormLabel><FormControl><Textarea rows={5} placeholder="Describa la reacción, cuándo ocurrió, qué medidas se tomaron, etc." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="concomitantMedications" render={({ field }) => (
                    <FormItem><FormLabel>Otros Medicamentos en Uso (Concomitantes)</FormLabel><FormControl><Textarea placeholder="Liste otros medicamentos que el paciente estaba tomando, separados por comas." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Reporte
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


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
  const [medSearchTerm, setMedSearchTerm] = useState('');
  
  // FV Dialog State
  const [reportingTreatment, setReportingTreatment] = useState<ActiveTreatment | null>(null);
  
  // Inventory Form Dialog State
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);


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

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const magistralTreatments = useMemo(() => {
    if (!patient) return [];
    return recipes
      .filter(r => ![
          RecipeStatus.Dispensed,
          RecipeStatus.Cancelled,
          RecipeStatus.Rejected,
          RecipeStatus.Archived,
      ].includes(r.status))
      .map(r => ({
          type: 'magistral' as const,
          recipe: r,
      }))
      .sort((a, b) => {
          const nameA = a.recipe.items[0]?.principalActiveIngredient || '';
          const nameB = b.recipe.items[0]?.principalActiveIngredient || '';
          return nameA.localeCompare(nameB);
      });
  }, [patient, recipes]);

  const commercialTreatments = useMemo(() => {
    if (!patient || !inventory) return [];
    return (patient.commercialMedications || [])
      .map((med, index) => {
        const inventoryItem = inventory.find(i => i.name.toLowerCase() === med.toLowerCase());
        return {
            type: 'commercial' as const,
            inventoryItem: inventoryItem || { name: med, id: `comm-${index}` },
        }
      })
      .sort((a, b) => {
          const nameA = a.inventoryItem.name;
          const nameB = b.inventoryItem.name;
          return nameA.localeCompare(nameB);
      });
  }, [patient, inventory]);


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
        activeMedicationsCount: magistralTreatments.length + commercialTreatments.length,
        historicalRecipesCount: recipes.length,
        lastDispensationDate: lastDispensation?.dispensationDate && isValid(parseISO(lastDispensation.dispensationDate)) ? format(parseISO(lastDispensation.dispensationDate), 'dd-MM-yyyy') : 'N/A'
    };
  }, [recipes, magistralTreatments, commercialTreatments]);

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
      refreshData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar las asociaciones.', variant: 'destructive' });
    } finally {
      setIsSavingAssociation(false);
    }
  };
  
  const handleOpenCommercialMedsModal = () => {
    setCurrentMeds(patient?.commercialMedications || []);
    setMedSearchTerm('');
    setIsCommercialMedsModalOpen(true);
  };

  const handleToggleMed = (medName: string) => {
    setCurrentMeds(prev => 
      prev.some(m => m.toLowerCase() === medName.toLowerCase())
        ? prev.filter(m => m.toLowerCase() !== medName.toLowerCase())
        : [...prev, medName]
    );
  };

  const handleSaveCommercialMeds = async () => {
    if (!patient) return;
    setIsSavingMeds(true);
    try {
      await updatePatient(patient.id, { commercialMedications: currentMeds });
      toast({ title: 'Medicamentos Actualizados', description: 'La lista de medicamentos comerciales ha sido guardada.' });
      setIsCommercialMedsModalOpen(false);
      refreshData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los medicamentos.', variant: 'destructive' });
    } finally {
      setIsSavingMeds(false);
    }
  };
  
  const handleInventoryFormFinished = () => {
    setIsInventoryFormOpen(false);
    refreshData();
  }

  const availableInventoryMeds = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item =>
      item.name.toLowerCase().includes(medSearchTerm.toLowerCase())
    );
  }, [inventory, medSearchTerm]);


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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" asChild>
                <Link href="/patients"><ChevronLeft className="h-5 w-5"/></Link>
             </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">{patient.name}</h1>
              <p className="text-muted-foreground">{patient.rut} | {patient.gender}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full justify-start md:w-auto md:justify-end">
            <Button variant="outline" onClick={handleAnalyzeHistory} disabled={isAnalyzing}>
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
            
            {/* Active Treatments (collapsible) */}
            <Accordion type="multiple" defaultValue={['treatments']} className="w-full">
              <Card>
                <AccordionItem value="treatments" className="border-b-0">
                  <AccordionTrigger className="text-xl font-semibold p-6 hover:no-underline">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="h-5 w-5 text-primary" />
                            <span>Tratamientos Activos</span>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" size="sm" onClick={handleOpenCommercialMedsModal}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar Medicamentos
                        </Button>
                    </div>
                    <div className="space-y-6">
                    {(magistralTreatments.length > 0 || commercialTreatments.length > 0) ? (
                        <>
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Preparados Magistrales</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Preparado</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Vencimiento</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {magistralTreatments.length > 0 ? magistralTreatments.map(treatment => {
                                            const recipe = (treatment as { type: 'magistral'; recipe: Recipe }).recipe;
                                            const item = recipe.items[0];
                                            const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;

                                            return (
                                                <TableRow key={recipe.id} className={isExpired ? "bg-red-50/50" : ""}>
                                                    <TableCell>
                                                        <p className="font-semibold">{item?.principalActiveIngredient || 'N/A'}</p>
                                                        <p className="text-xs text-muted-foreground">{item ? `${item.concentrationValue}${item.concentrationUnit}` : 'N/A'}</p>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline">{recipe.status}</Badge></TableCell>
                                                    <TableCell className={isExpired ? "text-red-600 font-semibold" : ""}>
                                                        {recipe.dueDate ? format(parseISO(recipe.dueDate), 'dd-MM-yyyy') : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild><Link href={`/recipes/${recipe.id}`}><Eye className="mr-2 h-4 w-4" />Ver Receta</Link></DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setReportingTreatment(treatment)}><ShieldAlert className="mr-2 h-4 w-4 text-amber-600"/>Reportar Evento FV</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay preparados magistrales activos.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Medicamentos Comerciales</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Medicamento</TableHead>
                                            <TableHead>Dosis</TableHead>
                                            <TableHead>Precio Ref.</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commercialTreatments.length > 0 ? commercialTreatments.map(treatment => {
                                            const inventoryItem = treatment.inventoryItem as InventoryItem;
                                            return (
                                                <TableRow key={inventoryItem.id}>
                                                    <TableCell className="font-semibold">{inventoryItem.name}</TableCell>
                                                    <TableCell>{inventoryItem.doseValue ? `${inventoryItem.doseValue} ${inventoryItem.doseUnit}` : 'N/A'}</TableCell>
                                                    <TableCell>{inventoryItem.salePrice ? `$${inventoryItem.salePrice.toLocaleString('es-CL')}` : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => setReportingTreatment(treatment)}><ShieldAlert className="mr-2 h-4 w-4 text-amber-600"/>Reportar Evento FV</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay medicamentos comerciales registrados.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        </>
                    ) : (
                        <p className="text-sm text-center py-8 text-muted-foreground">No hay tratamientos activos registrados para este paciente.</p>
                    )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            </Accordion>

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
                                              <p className="text-sm font-medium mt-2">{recipe.items[0]?.principalActiveIngredient}</p>
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
        onSuccess={refreshData}
      />
      
      <PharmacovigilanceDialog
        isOpen={!!reportingTreatment}
        onOpenChange={() => setReportingTreatment(null)}
        patient={patient}
        treatment={reportingTreatment}
        onSuccess={() => {
            setReportingTreatment(null);
            refreshData();
        }}
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
                Añada o elimine los medicamentos que el paciente está tomando.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar en inventario..."
                        value={medSearchTerm}
                        onChange={(e) => setMedSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {availableInventoryMeds.length > 0 ? availableInventoryMeds.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                        <label htmlFor={`med-${item.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {item.name}
                        </label>
                        <Checkbox 
                          id={`med-${item.id}`}
                          checked={currentMeds.some(m => m.toLowerCase() === item.name.toLowerCase())}
                          onCheckedChange={() => handleToggleMed(item.name)}
                        />
                    </div>
                    )) : (
                        <div className="text-center p-4">
                            <p className="text-sm text-muted-foreground">No se encontraron medicamentos en el inventario.</p>
                            <Button variant="link" className="text-sm h-auto p-0 mt-2" onClick={() => { setIsCommercialMedsModalOpen(false); setIsInventoryFormOpen(true);}}>
                                ¿Desea crear un nuevo producto en el inventario?
                            </Button>
                        </div>
                    )}
                </div>
                <h4 className="font-semibold pt-2">Medicamentos Seleccionados:</h4>
                 <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/50">
                     {currentMeds.length > 0 ? currentMeds.map((med, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md">
                        <span className="text-sm">{med}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleMed(med)}>
                           <X className="h-4 w-4" />
                        </Button>
                    </div>
                    )) : <p className="text-sm text-center text-muted-foreground p-4">Ningún medicamento seleccionado.</p>}
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
      
       <Dialog open={isInventoryFormOpen} onOpenChange={setIsInventoryFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Crear Producto en Inventario</DialogTitle>
            <DialogDescription>
                Configure un nuevo producto. Estará disponible inmediatamente para asignarlo al paciente.
            </DialogDescription>
          </DialogHeader>
          <InventoryItemForm onFinished={handleInventoryFormFinished} />
        </DialogContent>
      </Dialog>
    </>
  );
}

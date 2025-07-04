
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getPatients, deletePatient } from '@/lib/data';
import type { Patient } from '@/lib/types';
import { ProactivePatientStatus, PatientActionNeeded } from '@/lib/types';
import { runProactiveAnalysisForAllPatients } from '@/lib/actions';
import { PlusCircle, Search, User, Heart, AlertTriangle, Pencil, Trash2, FileText, Repeat, Truck, CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatientFormDialog } from '@/components/app/patient-form-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const statusStyles: Record<ProactivePatientStatus, string> = {
  [ProactivePatientStatus.URGENT]: 'border-red-500 bg-red-50',
  [ProactivePatientStatus.ATTENTION]: 'border-yellow-400 bg-yellow-50',
  [ProactivePatientStatus.OK]: 'border-border',
};

const actionButtonConfig: Record<PatientActionNeeded, { text: string; icon: React.ElementType }> = {
  [PatientActionNeeded.CREATE_NEW_RECIPE]: { text: 'Crear Receta', icon: FileText },
  [PatientActionNeeded.REPREPARE_CYCLE]: { text: 'Re-preparar Ciclo', icon: Repeat },
  [PatientActionNeeded.DISPENSE_COMMERCIAL]: { text: 'Gestionar Dispensación', icon: Truck },
  [PatientActionNeeded.NONE]: { text: 'Ver Ficha', icon: User },
};

type FilterStatus = 'all' | ProactivePatientStatus;

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const patientsData = await getPatients();
      setPatients(patientsData);
    } catch (error) {
      console.error("Failed to fetch patients data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    toast({ title: "Análisis Proactivo Iniciado", description: "La IA está revisando a los pacientes crónicos. Los estados se actualizarán en breve." });
    try {
      await runProactiveAnalysisForAllPatients();
      await fetchData();
      toast({ title: "Análisis Completado", description: "Los estados de los pacientes han sido actualizados." });
    } catch (error) {
      console.error("Proactive analysis failed:", error);
      toast({ title: "Error en el Análisis", description: "No se pudo completar el análisis de IA.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenForm = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPatient(null);
  };

  const handleSuccess = () => {
    fetchData();
    handleCloseForm();
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await deletePatient(patientToDelete.id);
      toast({ title: "Paciente Eliminado", description: `El paciente ${patientToDelete.name} ha sido eliminado.` });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el paciente.", variant: "destructive" });
    } finally {
      setPatientToDelete(null);
      setIsDeleting(false);
    }
  };


  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient => {
        if (activeFilter !== 'all' && patient.proactiveStatus !== activeFilter) {
          return false;
        }
        if (searchTerm) {
          const lowerCaseSearchTerm = searchTerm.toLowerCase();
          return (
            patient.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            patient.rut.toLowerCase().includes(lowerCaseSearchTerm)
          );
        }
        return true;
      });
  }, [patients, searchTerm, activeFilter]);

  const PatientCard = ({ patient }: { patient: Patient }) => {
    const { text: buttonText, icon: ButtonIcon } = actionButtonConfig[patient.actionNeeded] || actionButtonConfig.NONE;
    
    const buttonHref = useMemo(() => {
      switch (patient.actionNeeded) {
        case PatientActionNeeded.CREATE_NEW_RECIPE:
          return `/recipes/new?patientId=${patient.id}`;
        case PatientActionNeeded.REPREPARE_CYCLE:
        case PatientActionNeeded.DISPENSE_COMMERCIAL:
        case PatientActionNeeded.NONE:
        default:
          return `/patients/${patient.id}`;
      }
    }, [patient.actionNeeded, patient.id]);

    return (
        <Card className={cn("flex flex-col justify-between transition-shadow hover:shadow-md", statusStyles[patient.proactiveStatus])}>
            <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold text-foreground hover:underline">
                            <Link href={`/patients/${patient.id}`} title={patient.name} className="truncate">
                                {patient.name}
                            </Link>
                        </CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <User className="mr-2 h-3 w-3" />
                            <span>{patient.rut}</span>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        {patient.isChronic && <Heart className="h-5 w-5 text-red-500" fill="currentColor" title="Paciente Crónico" />}
                        {patient.allergies && patient.allergies.length > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={2.5} title={`Alergias: ${patient.allergies.join(', ')}`} />}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex items-start text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-foreground/90 leading-snug">{patient.proactiveMessage}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-2">
                <Button asChild>
                    <Link href={buttonHref}>
                        <ButtonIcon className="mr-2 h-4 w-4" />
                        {buttonText}
                    </Link>
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(patient)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600" onClick={() => setPatientToDelete(patient)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Gestión de Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Una visión 360° para una atención farmacéutica proactiva.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRunAnalysis} disabled={loading || isAnalyzing}>
              {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Analizar Pacientes (IA)
            </Button>
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Paciente
            </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por nombre o RUT..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Filtros de Prevención:</span>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={activeFilter === 'all' ? 'default' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        className="px-3"
                    >
                        Todos
                    </Button>
                    <Button 
                        variant={activeFilter === 'URGENT' ? 'destructive' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter(ProactivePatientStatus.URGENT)}
                        className="px-3"
                    >
                        Urgente
                    </Button>
                    <Button 
                        variant={activeFilter === 'ATTENTION' ? 'secondary' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter(ProactivePatientStatus.ATTENTION)}
                        className="px-3"
                    >
                        Atención
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando pacientes...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="text-center py-16 mt-8 shadow-none border-dashed">
            <div className="flex flex-col items-center justify-center">
              <User className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No se encontraron pacientes</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
              Intenta ajustar tu búsqueda o filtros, o crea un nuevo paciente para empezar.
              </p>
              <Button className="mt-6" onClick={() => handleOpenForm(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Paciente
              </Button>
            </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
                <PatientCard key={patient.id} patient={patient} />
            ))}
        </div>
      )}

      <PatientFormDialog
        patient={selectedPatient}
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al paciente <span className="font-bold">{patientToDelete?.name}</span> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

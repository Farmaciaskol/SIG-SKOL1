
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getPatients, deletePatient, getRecipes } from '@/lib/data';
import type { Patient, Recipe } from '@/lib/types';
import { ProactivePatientStatus, PatientActionNeeded, RecipeStatus } from '@/lib/types';
import { runProactiveAnalysisForAllPatients } from '@/lib/actions';
import { PlusCircle, Search, User, Heart, AlertTriangle, Pencil, Trash2, FileText, Repeat, Truck, CheckCircle2, Loader2, Wand2, MoreHorizontal, FlaskConical, Package, ChevronsRight, ChevronsLeft, ChevronRight, ChevronLeft, Home } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';


const statusStyles: Record<ProactivePatientStatus, { border: string; icon: React.ElementType, iconColor: string }> = {
  [ProactivePatientStatus.URGENT]: { border: 'border-l-4 border-red-500', icon: AlertTriangle, iconColor: 'text-red-500' },
  [ProactivePatientStatus.ATTENTION]: { border: 'border-l-4 border-yellow-400', icon: AlertTriangle, iconColor: 'text-yellow-500' },
  [ProactivePatientStatus.OK]: { border: 'border-l-4 border-green-500', icon: CheckCircle2, iconColor: 'text-green-500' },
};

const PatientRowActions = ({ patient, onEdit, onDelete }: { patient: Patient, onEdit: (p: Patient) => void, onDelete: (p: Patient) => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Menú</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/patients/${patient.id}`}><User className="mr-2 h-4 w-4" />Ver Ficha</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(patient)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/recipes/new?patientId=${patient.id}`}><FileText className="mr-2 h-4 w-4" />Nueva Receta</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(patient)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

type FilterStatus = 'all' | ProactivePatientStatus | 'homecare';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [isDeleteBatchAlertOpen, setIsDeleteBatchAlertOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsData, recipesData] = await Promise.all([
        getPatients(),
        getRecipes(),
      ]);
      setPatients(patientsData);
      setRecipes(recipesData);
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
  
  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
        await Promise.all(selectedPatients.map(id => deletePatient(id)));
        toast({ title: `${selectedPatients.length} Pacientes Eliminados`, description: 'Los pacientes seleccionados han sido eliminados.' });
        setSelectedPatients([]);
        fetchData();
    } catch (error) {
         toast({ title: 'Error', description: 'No se pudieron eliminar todos los pacientes seleccionados.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        setIsDeleteBatchAlertOpen(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient => {
        if (activeFilter === 'homecare') {
            if (!patient.isHomeCare) return false;
        } else if (activeFilter !== 'all' && patient.proactiveStatus !== activeFilter) {
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

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const allOnPageSelected = paginatedPatients.length > 0 && paginatedPatients.every(p => selectedPatients.includes(p.id));

  const toggleSelectAll = () => {
    const pageIds = paginatedPatients.map(p => p.id);
    if (allOnPageSelected) {
      setSelectedPatients(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedPatients(prev => [...new Set([...prev, ...pageIds])]);
    }
  }

  const toggleSelectPatient = (id: string) => {
    setSelectedPatients(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  }

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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm font-medium text-foreground shrink-0">Filtros de Prevención:</span>
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
                     <Button 
                        variant={activeFilter === 'homecare' ? 'secondary' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter('homecare')}
                        className="px-3"
                    >
                        Homecare
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
        <Card>
            <CardContent className="p-0">
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="p-4"><Checkbox onCheckedChange={toggleSelectAll} checked={allOnPageSelected} /></TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>RUT</TableHead>
                                <TableHead>Condición</TableHead>
                                <TableHead>Mensaje Proactivo (IA)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPatients.map(patient => {
                                const {icon: StatusIcon, iconColor} = statusStyles[patient.proactiveStatus];
                                return (
                                <TableRow key={patient.id} data-state={selectedPatients.includes(patient.id) && "selected"}>
                                    <TableCell className="p-4"><Checkbox onCheckedChange={() => toggleSelectPatient(patient.id)} checked={selectedPatients.includes(patient.id)}/></TableCell>
                                    <TableCell className="font-medium">
                                        <Link href={`/patients/${patient.id}`} className="hover:underline">{patient.name}</Link>
                                    </TableCell>
                                    <TableCell>{patient.rut}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {patient.isChronic && <Heart className="h-4 w-4 text-red-500" fill="currentColor" title="Paciente Crónico" />}
                                            {patient.isHomeCare && <Home className="h-4 w-4 text-blue-500" title="Paciente Homecare" />}
                                            {patient.allergies && patient.allergies.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={2.5} title={`Alergias: ${patient.allergies.join(', ')}`} />}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <StatusIcon className={cn("h-4 w-4", iconColor)} />
                                            <span className="text-foreground/90">{patient.proactiveMessage}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <PatientRowActions patient={patient} onEdit={handleOpenForm} onDelete={setPatientToDelete} />
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                 <div className="grid grid-cols-1 gap-4 md:hidden p-4">
                    {paginatedPatients.map(patient => {
                        const { border, icon: StatusIcon, iconColor } = statusStyles[patient.proactiveStatus];
                        return (
                            <Card key={patient.id} className={cn("flex flex-col", border, selectedPatients.includes(patient.id) && "ring-2 ring-primary")}>
                                <CardHeader className="p-4 flex flex-row items-start gap-3">
                                    <Checkbox onCheckedChange={() => toggleSelectPatient(patient.id)} checked={selectedPatients.includes(patient.id)} className="mt-1"/>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg leading-tight hover:underline">
                                                <Link href={`/patients/${patient.id}`}>{patient.name}</Link>
                                            </CardTitle>
                                             <div className="flex items-center gap-2">
                                                {patient.isChronic && <Heart className="h-5 w-5 text-red-500" fill="currentColor" title="Paciente Crónico" />}
                                                {patient.isHomeCare && <Home className="h-5 w-5 text-blue-500" title="Paciente Homecare" />}
                                                {patient.allergies && patient.allergies.length > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={2.5} title={`Alergias: ${patient.allergies.join(', ')}`} />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{patient.rut}</p>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex items-start text-sm">
                                        <StatusIcon className={cn("h-5 w-5 mr-2 mt-0.5 flex-shrink-0", iconColor)} />
                                        <p className="text-foreground/90 leading-snug">{patient.proactiveMessage}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-2 flex justify-end">
                                    <PatientRowActions patient={patient} onEdit={handleOpenForm} onDelete={setPatientToDelete} />
                                </CardFooter>
                            </Card>
                        )
                    })}
                 </div>
            </CardContent>
             <CardFooter className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-xs text-muted-foreground">
                    {selectedPatients.length > 0
                    ? `${selectedPatients.length} de ${filteredPatients.length} fila(s) seleccionadas.`
                    : `Total de ${filteredPatients.length} pacientes.`}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft /></Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft /></Button>
                    <span className="text-sm">Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight /></Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight /></Button>
                </div>
            </CardFooter>
        </Card>
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
      
      {selectedPatients.length > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-sm z-50 shadow-2xl">
            <CardContent className="p-3 flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{selectedPatients.length} paciente(s) seleccionado(s)</p>
                <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteBatchAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </div>
            </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteBatchAlertOpen} onOpenChange={setIsDeleteBatchAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {selectedPatients.length} pacientes?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer. Los pacientes seleccionados serán eliminados permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

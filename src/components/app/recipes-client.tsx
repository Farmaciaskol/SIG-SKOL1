
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlusCircle, Search, Filter, Calendar as CalendarIcon, FileX, Send, Trash2, FileClock, FlaskConical, Package, AlertTriangle, XCircle } from 'lucide-react';
import { deleteRecipe, updateRecipe, logControlledMagistralDispensation, batchSendRecipesToExternal } from '@/lib/data';
import type { Recipe, Patient, Doctor, ExternalPharmacy, AuditTrailEntry } from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { useToast } from '@/hooks/use-toast';
import { statusConfig } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { RecipeDialogs } from './recipe-dialogs';
import { RecipeActions, MobileRecipeActions } from './recipe-actions';
import { RecipeTableView } from './recipe-table-view';
import { RecipeCardView } from './recipe-card-view';
import { CardHeader, CardTitle } from '../ui/card';

const intentClasses = {
  default: {
    bg: 'bg-sky-50 dark:bg-sky-950',
    icon: 'text-sky-500 dark:text-sky-400',
    border: 'border-sky-300 dark:border-sky-800'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    icon: 'text-yellow-500 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-800'
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'text-red-500 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800'
  },
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700'
  }
};

const StatCard = ({ title, value, icon: Icon, onClick, active = false, intent = 'neutral' }: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  onClick: () => void; 
  active?: boolean;
  intent?: keyof typeof intentClasses;
}) => {
  const classes = intentClasses[intent] || intentClasses.neutral;
  
  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-shadow cursor-pointer border-l-4", 
        classes.border,
        active && "ring-2 ring-primary ring-offset-2"
      )} 
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-3 rounded-lg", classes.bg)}>
          <Icon className={cn("h-6 w-6", classes.icon)} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};


export const RecipesClient = ({
  initialRecipes,
  initialPatients,
  initialDoctors,
  initialExternalPharmacies
}: {
  initialRecipes: Recipe[],
  initialPatients: Patient[],
  initialDoctors: Doctor[],
  initialExternalPharmacies: ExternalPharmacy[]
}) => {

  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>(initialExternalPharmacies);
  
  // Dialogs state
  const [recipeToView, setRecipeToView] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [recipeToReject, setRecipeToReject] = useState<Recipe | null>(null);
  const [recipeToCancel, setRecipeToCancel] = useState<Recipe | null>(null);
  const [recipeToReprepare, setRecipeToReprepare] = useState<Recipe | null>(null);
  const [recipeToReceive, setRecipeToReceive] = useState<Recipe | null>(null);
  const [recipeToPrint, setRecipeToPrint] = useState<Recipe | null>(null);
  const [recipeToArchive, setRecipeToArchive] = useState<Recipe | null>(null);
  const [recipeToSend, setRecipeToSend] = useState<Recipe | null>(null);
  const [recipesToSendBatch, setRecipesToSendBatch] = useState<Recipe[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs form fields
  const [reason, setReason] = useState('');
  const [controlledFolio, setControlledFolio] = useState('');
  const [internalLot, setInternalLot] = useState('');
  const [preparationExpiry, setPreparationExpiry] = useState<Date>();
  const [transportCost, setTransportCost] = useState('0');
  const [receptionChecklist, setReceptionChecklist] = useState({
    etiqueta: false,
    vencimiento: false,
    aspecto: false,
    cadenaFrio: false,
  });
  
  // Reprepare dialog state
  const [daysSinceDispensation, setDaysSinceDispensation] = useState<number | null>(null);
  const [urgencyStatus, setUrgencyStatus] = useState<'early' | 'normal' | 'urgent'>('normal');

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [pharmacyFilter, setPharmacyFilter] = useState<string>('all');
  
  // Batch actions state
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [isDeleteBatchAlertOpen, setIsDeleteBatchAlertOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const getPatientName = useCallback((patientId: string) => patients.find((p) => p.id === patientId)?.name || 'N/A', [patients]);
  const getPharmacy = useCallback((pharmacyId?: string) => externalPharmacies.find((p) => p.id === pharmacyId), [externalPharmacies]);
  const getDoctorName = useCallback((doctorId: string) => doctors.find((d) => d.id === doctorId)?.name || 'N/A', [doctors]);
  
  useEffect(() => {
    if (recipeToReprepare) {
      const lastDispensation = recipeToReprepare.auditTrail?.slice().reverse().find(t => t.status === RecipeStatus.Dispensed);
      if (lastDispensation?.date) {
        const days = differenceInDays(new Date(), parseISO(lastDispensation.date));
        setDaysSinceDispensation(days);
        if (days < 23) setUrgencyStatus('early');
        else if (days >= 23 && days <= 26) setUrgencyStatus('normal');
        else setUrgencyStatus('urgent');
      } else {
        setDaysSinceDispensation(null);
        setUrgencyStatus('normal');
      }
    }
  }, [recipeToReprepare]);


  useEffect(() => {
    setRecipes(initialRecipes);
    setPatients(initialPatients);
    setDoctors(initialDoctors);
    setExternalPharmacies(initialExternalPharmacies);
  }, [initialRecipes, initialPatients, initialDoctors, initialExternalPharmacies]);

  const handleUpdateStatus = useCallback(async (recipe: Recipe, newStatus: RecipeStatus, notes?: string) => {
    if (!user) {
        toast({ title: 'Error de Autenticación', description: 'Debe iniciar sesión para realizar esta acción.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    try {
      if (newStatus === RecipeStatus.Dispensed && recipe.isControlled) {
        const patient = patients.find(p => p.id === recipe.patientId);
        if (patient) {
          await logControlledMagistralDispensation(recipe, patient);
          toast({ title: "Registro Controlado Creado", description: `La dispensación se ha registrado en el libro de control.` });
        } else {
          throw new Error("No se encontró el paciente para registrar la dispensación controlada.");
        }
      }

      const newAuditEntry: AuditTrailEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        userId: user.uid,
        notes: notes || `Estado cambiado a ${statusConfig[newStatus].text}`
      };
      const updatedAuditTrail = [...(recipe.auditTrail || []), newAuditEntry];
      
      const updates: Partial<Recipe> = { 
        status: newStatus, 
        auditTrail: updatedAuditTrail,
        rejectionReason: newStatus === RecipeStatus.Rejected ? notes : recipe.rejectionReason,
      };

      if(newStatus === RecipeStatus.Dispensed) {
        updates.dispensationDate = new Date().toISOString();
      }

      await updateRecipe(recipe.id, updates);

      toast({ title: 'Estado Actualizado', description: `La receta ${recipe.id} ahora está en estado "${statusConfig[newStatus].text}".` });
      router.refresh();
    } catch (error) {
       toast({ title: 'Error', description: `No se pudo actualizar el estado. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }, [user, patients, toast, router]);

  const handleConfirmReject = async () => {
    if (!recipeToReject || !reason) return;
    await handleUpdateStatus(recipeToReject, RecipeStatus.Rejected, `Motivo del rechazo: ${reason}`);
    setRecipeToReject(null);
    setReason('');
  }

  const handleConfirmCancel = async () => {
    if (!recipeToCancel || !reason) return;
    await handleUpdateStatus(recipeToCancel, RecipeStatus.Cancelled, `Motivo de anulación: ${reason}`);
    setRecipeToCancel(null);
    setReason('');
  }
  
  const isReceptionChecklistComplete = useMemo(() => {
    if (!recipeToReceive) return false;
    const requiresColdChain = recipeToReceive.items.some(i => i.isRefrigerated);
    if (requiresColdChain) {
        return receptionChecklist.etiqueta && receptionChecklist.vencimiento && receptionChecklist.aspecto && receptionChecklist.cadenaFrio;
    }
    return receptionChecklist.etiqueta && receptionChecklist.vencimiento && receptionChecklist.aspecto;
  }, [receptionChecklist, recipeToReceive]);
  
  const handleConfirmReceive = async () => {
    if (!user) {
        toast({ title: 'Error de Autenticación', description: 'Debe iniciar sesión para realizar esta acción.', variant: 'destructive' });
        return;
    }
    if (!recipeToReceive || !internalLot || !preparationExpiry || !isReceptionChecklistComplete) return;
    setIsSubmitting(true);
    try {
       const notesParts = [
          `Preparado recepcionado.`,
          `Lote Interno: ${internalLot}.`,
          `Vencimiento: ${format(preparationExpiry, 'dd-MM-yyyy')}.`
       ];
       if (recipeToReceive.items.some(i => i.isRefrigerated)) {
          notesParts.push('Cadena de frío verificada.');
       }
       const newAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.ReceivedAtSkol,
        date: new Date().toISOString(),
        userId: user.uid,
        notes: notesParts.join(' ')
      };
      const updates: Partial<Recipe> = { 
        status: RecipeStatus.ReceivedAtSkol, 
        paymentStatus: 'Pendiente',
        auditTrail: [...(recipeToReceive.auditTrail || []), newAuditEntry],
        internalPreparationLot: internalLot,
        compoundingDate: new Date().toISOString(),
        preparationExpiryDate: preparationExpiry.toISOString(),
        transportCost: Number(transportCost) || 0,
      };
       await updateRecipe(recipeToReceive.id, updates);
       toast({ title: 'Preparado Recepcionado', description: `La receta ${recipeToReceive.id} ha sido actualizada.` });
       setRecipeToReceive(null);
       router.refresh();
    } catch (error) {
       toast({ title: 'Error', description: 'No se pudo recepcionar el preparado.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleConfirmSend = async () => {
    if (!recipeToSend) return;
    await handleUpdateStatus(recipeToSend, RecipeStatus.SentToExternal, "Receta enviada al recetario externo para preparación.");
    setRecipeToSend(null);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteRecipe(recipeToDelete.id);
        toast({ title: 'Receta Eliminada', description: `La receta ${recipeToDelete.id} ha sido eliminada.` });
        setRecipeToDelete(null);
        router.refresh();
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la receta.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!recipeToArchive) return;
    await handleUpdateStatus(recipeToArchive, RecipeStatus.Archived, 'Receta archivada.');
    setRecipeToArchive(null);
  };
  
  const handleBatchDelete = async () => {
    setIsSubmitting(true);
    try {
        const idsToDelete = [...selectedRecipes];
        await Promise.all(idsToDelete.map(id => deleteRecipe(id)));
        toast({ title: `${idsToDelete.length} Recetas Eliminadas`, description: 'Las recetas seleccionadas han sido eliminadas.' });
        setSelectedRecipes([]);
        router.refresh();
    } catch (error) {
         toast({ title: 'Error', description: 'No se pudieron eliminar todas las recetas seleccionadas.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
        setIsDeleteBatchAlertOpen(false);
    }
  };

  const handleOpenBatchSendDialog = () => {
    const toSend = recipes.filter(r => 
        selectedRecipes.includes(r.id) &&
        r.status === RecipeStatus.Validated &&
        r.supplySource !== 'Insumos de Skol'
    );

    if (toSend.length === 0) {
        toast({
            title: "No hay recetas válidas para enviar",
            description: "Asegúrese de que las recetas seleccionadas estén en estado 'Validada' y su origen de insumos no sea 'Insumos de Skol'.",
            variant: "destructive"
        });
        return;
    }
    setRecipesToSendBatch(toSend);
  };

  const handleConfirmBatchSend = async () => {
    if (!user) {
      toast({ title: 'Error de Autenticación', variant: 'destructive' });
      return;
    }
    if (recipesToSendBatch.length === 0) return;

    setIsSubmitting(true);
    try {
      const idsToSend = recipesToSendBatch.map(r => r.id);
      await batchSendRecipesToExternal(idsToSend, user.uid);
      toast({ title: `${idsToSend.length} recetas enviadas`, description: 'Las recetas han sido marcadas como enviadas a sus respectivos recetarios.' });
      setRecipesToSendBatch([]);
      setSelectedRecipes([]);
      router.refresh();
    } catch (error) {
      toast({ title: 'Error al enviar en lote', description: error instanceof Error ? error.message : 'Ocurrió un error.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReprepare = async () => {
    if (!recipeToReprepare || !user) {
        toast({ title: 'Error', description: 'No se ha seleccionado una receta o falta la autenticación del usuario.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);

    if (recipeToReprepare.isControlled && !controlledFolio.trim()) {
      toast({ title: "Error de Validación", description: "El nuevo folio es requerido para recetas controladas.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const lastDispensation = recipeToReprepare.auditTrail?.slice().reverse().find(t => t.status === RecipeStatus.Dispensed);
      const isUrgent = lastDispensation?.date ? differenceInDays(new Date(), parseISO(lastDispensation.date)) > 26 : false;

      const reprepareAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.PendingValidation,
        date: new Date().toISOString(),
        userId: user.uid,
        notes: `Nuevo ciclo de re-preparación iniciado.${recipeToReprepare.isControlled ? ` Nuevo folio: ${controlledFolio}.` : ''}`
      };

      const updates: Partial<Recipe> = {
        status: RecipeStatus.PendingValidation,
        paymentStatus: 'N/A',
        dispensationDate: undefined,
        internalPreparationLot: undefined,
        compoundingDate: undefined,
        preparationExpiryDate: undefined,
        rejectionReason: undefined,
        auditTrail: [...(recipeToReprepare.auditTrail || []), reprepareAuditEntry],
        isUrgentRepreparation: isUrgent,
      };

      if (recipeToReprepare.isControlled) {
        updates.controlledRecipeFolio = controlledFolio;
      }

      await updateRecipe(recipeToReprepare.id, updates);
      
      toast({ title: 'Nuevo Ciclo Iniciado', description: `La receta ${recipeToReprepare.id} está lista para un nuevo ciclo.` });
      setRecipeToReprepare(null);
      setControlledFolio('');
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo iniciar el nuevo ciclo.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const activeRecipes = initialRecipes.filter(r => 
        ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected, RecipeStatus.Archived].includes(r.status)
    );
    
    const expiringOrExpiredCount = activeRecipes.filter(r => {
        if (!r.dueDate) return false;
        try {
            const dueDate = parseISO(r.dueDate);
            return dueDate < thirtyDaysFromNow;
        } catch (e) {
            return false;
        }
    }).length;

    return {
      pendingValidation: initialRecipes.filter(r => r.status === RecipeStatus.PendingValidation).length,
      inPreparation: initialRecipes.filter(r => r.status === RecipeStatus.Preparation || r.status === RecipeStatus.SentToExternal).length,
      readyForPickup: initialRecipes.filter(r => r.status === RecipeStatus.ReadyForPickup || r.status === RecipeStatus.ReceivedAtSkol).length,
      rejected: initialRecipes.filter(r => r.status === RecipeStatus.Rejected).length,
      expiringOrExpired: expiringOrExpiredCount,
    }
  }, [initialRecipes]);

  const filteredRecipes = useMemo(() => {
    return recipes
    .filter((recipe) => {
      if (recipe.status === RecipeStatus.PendingReviewPortal) {
        return false;
      }

      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      
      const searchMatch = searchTerm === '' ||
        recipe.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        getPatientName(recipe.patientId).toLowerCase().includes(lowerCaseSearchTerm) ||
        recipe.items.some(item => item.principalActiveIngredient.toLowerCase().includes(lowerCaseSearchTerm));
      
      let statusMatch = true;
      if (statusFilter === 'all') {
          statusMatch = recipe.status !== RecipeStatus.Archived;
      } else if (statusFilter === 'expiring') {
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(now.getDate() + 30);
          const isActive = ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected, RecipeStatus.Archived].includes(recipe.status);
          
          if (!isActive || !recipe.dueDate) {
              statusMatch = false;
          } else {
              try {
                const dueDate = parseISO(recipe.dueDate);
                statusMatch = dueDate < thirtyDaysFromNow;
              } catch (e) {
                statusMatch = false;
              }
          }
      } else if (statusFilter === RecipeStatus.ReadyForPickup) {
          statusMatch = [RecipeStatus.ReadyForPickup, RecipeStatus.ReceivedAtSkol].includes(recipe.status)
      } else if (statusFilter === RecipeStatus.Preparation) {
          statusMatch = [RecipeStatus.Preparation, RecipeStatus.SentToExternal].includes(recipe.status)
      } else {
          statusMatch = recipe.status === statusFilter;
      }

      const doctorMatch = doctorFilter === 'all' || recipe.doctorId === doctorFilter;
      const pharmacyMatch = pharmacyFilter === 'all' || recipe.externalPharmacyId === pharmacyFilter;
      
      const dateMatch = !dateRange || (
        (!dateRange.from || new Date(recipe.createdAt) >= dateRange.from) &&
        (!dateRange.to || new Date(recipe.createdAt) <= dateRange.to)
      );

      return searchMatch && statusMatch && doctorMatch && pharmacyMatch && dateMatch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recipes, searchTerm, statusFilter, doctorFilter, pharmacyFilter, dateRange, getPatientName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, doctorFilter, pharmacyFilter, searchTerm, dateRange]);

  const totalPages = Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE);

  const paginatedRecipes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecipes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecipes, currentPage]);
  
  const allOnPageSelected = paginatedRecipes.length > 0 && paginatedRecipes.every(r => selectedRecipes.includes(r.id));

  const toggleSelectAll = () => {
    const pageIds = paginatedRecipes.map(r => r.id);
    if (allOnPageSelected) {
      setSelectedRecipes(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedRecipes(prev => [...new Set([...prev, ...pageIds])]);
    }
  }

  const toggleSelectRecipe = (id: string) => {
    setSelectedRecipes(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  }
  
  const actionHandlers = {
    onView: setRecipeToView,
    onDelete: setRecipeToDelete,
    onCancel: setRecipeToCancel,
    onReprepare: setRecipeToReprepare,
    onArchive: setRecipeToArchive,
    onSend: setRecipeToSend,
    onReceive: setRecipeToReceive,
    onReadyForPickup: (recipe: Recipe) => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup),
    onDispense: (recipe: Recipe) => handleUpdateStatus(recipe, RecipeStatus.Dispensed),
    onPrint: setRecipeToPrint,
    onValidate: () => handleUpdateStatus(recipeToReject!, RecipeStatus.Validated, 'Receta validada por farmacéutico.'),
    onReject: () => setRecipeToReject(recipeToReject!),
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Gestión de Recetas</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza, filtra y gestiona todas las recetas del sistema.
          </p>
        </div>
        <Button asChild>
            <Link href="/recipes/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta
            </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mt-6">
        <StatCard 
          title="Pend. Validación" 
          value={stats.pendingValidation} 
          icon={FileClock}
          onClick={() => setStatusFilter(RecipeStatus.PendingValidation)}
          active={statusFilter === RecipeStatus.PendingValidation}
          intent="warning"
        />
        <StatCard 
          title="En Preparación" 
          value={stats.inPreparation} 
          icon={FlaskConical}
          onClick={() => setStatusFilter(RecipeStatus.Preparation)}
          active={statusFilter === RecipeStatus.Preparation}
          intent="default"
        />
        <StatCard 
          title="Para Retiro" 
          value={stats.readyForPickup} 
          icon={Package}
          onClick={() => setStatusFilter(RecipeStatus.ReadyForPickup)}
          active={statusFilter === RecipeStatus.ReadyForPickup}
          intent="default"
        />
        <StatCard 
          title="Próximas a Vencer" 
          value={stats.expiringOrExpired} 
          icon={AlertTriangle}
          onClick={() => setStatusFilter('expiring')}
          active={statusFilter === 'expiring'}
          intent="warning"
        />
        <StatCard 
          title="Rechazadas" 
          value={stats.rejected} 
          icon={XCircle}
          onClick={() => setStatusFilter(RecipeStatus.Rejected)}
          active={statusFilter === RecipeStatus.Rejected}
          intent="danger"
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por ID, paciente, principio activo..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
              <div className="w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="expiring">Próximas a Vencer</SelectItem>{Object.values(RecipeStatus).filter(s => s !== RecipeStatus.PendingReviewPortal).map((status) => ( <SelectItem key={status} value={status}>{statusConfig[status]?.text || status}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <CollapsibleTrigger asChild><Button variant="outline" className="w-full md:w-auto"><Filter className="mr-2 h-4 w-4" />Filtros Avanzados</Button></CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 pt-4 border-t mt-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Select value={doctorFilter} onValueChange={setDoctorFilter}><SelectTrigger><SelectValue placeholder="Filtrar por médico..." /></SelectTrigger><SelectContent><SelectItem value="all">Todos los médicos</SelectItem>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                     <Select value={pharmacyFilter} onValueChange={setPharmacyFilter}><SelectTrigger><SelectValue placeholder="Filtrar por recetario..." /></SelectTrigger><SelectContent><SelectItem value="all">Todos los recetarios</SelectItem>{externalPharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                     <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Seleccionar rango de fechas</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent></Popover>
                 </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {filteredRecipes.length === 0 ? (
        <Card className="w-full py-16 mt-8 shadow-none border-dashed"><div className="flex flex-col items-center justify-center text-center"><FileX className="h-16 w-16 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold">No se encontraron recetas</h3><p className="text-muted-foreground mt-2 max-w-sm">Intenta ajustar tu búsqueda o filtros, o crea una nueva receta para empezar.</p><Button asChild className="mt-6"><Link href="/recipes/new"><PlusCircle className="mr-2 h-4 w-4" /> Crear Primera Receta</Link></Button></div></Card>
      ) : (
        <>
            <Card className="hidden w-full md:block mt-6">
              <CardContent className="p-0">
                <RecipeTableView 
                  recipes={paginatedRecipes} 
                  selectedRecipes={selectedRecipes}
                  allOnPageSelected={allOnPageSelected}
                  toggleSelectAll={toggleSelectAll}
                  toggleSelectRecipe={toggleSelectRecipe} 
                  getPatientName={getPatientName} 
                  actionHandlers={actionHandlers} 
                />
              </CardContent>
              <CardFooter className="flex items-center justify-between px-4 py-2 border-t"><div className="text-xs text-muted-foreground">{selectedRecipes.length} de {paginatedRecipes.length} fila(s) seleccionadas.</div><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button><span className="text-sm">Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button></div></CardFooter>
            </Card>

            <RecipeCardView recipes={paginatedRecipes} selectedRecipes={selectedRecipes} toggleSelectRecipe={toggleSelectRecipe} getPatientName={getPatientName} actionHandlers={actionHandlers} />
            
            <div className="flex items-center justify-between pt-4 md:hidden"><p className="text-sm text-muted-foreground">{filteredRecipes.length} resultados</p><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button><span className="text-sm">{currentPage} / {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button></div></div>
        </>
      )}

      <RecipeDialogs
        recipeToView={recipeToView} setRecipeToView={setRecipeToView}
        recipeToDelete={recipeToDelete} setRecipeToDelete={setRecipeToDelete}
        recipeToReject={recipeToReject} setRecipeToReject={setRecipeToReject}
        recipeToCancel={recipeToCancel} setRecipeToCancel={setRecipeToCancel}
        recipeToReprepare={recipeToReprepare} setRecipeToReprepare={setRecipeToReprepare}
        recipeToReceive={recipeToReceive} setRecipeToReceive={setRecipeToReceive}
        recipeToPrint={recipeToPrint} setRecipeToPrint={setRecipeToPrint}
        recipeToArchive={recipeToArchive} setRecipeToArchive={setRecipeToArchive}
        recipeToSend={recipeToSend} setRecipeToSend={setRecipeToSend}
        recipesToSendBatch={recipesToSendBatch} setRecipesToSendBatch={setRecipesToSendBatch}
        isSubmitting={isSubmitting}
        reason={reason} setReason={setReason}
        controlledFolio={controlledFolio} setControlledFolio={setControlledFolio}
        internalLot={internalLot} setInternalLot={setInternalLot}
        preparationExpiry={preparationExpiry} setPreparationExpiry={setPreparationExpiry}
        transportCost={transportCost} setTransportCost={setTransportCost}
        receptionChecklist={receptionChecklist}
        daysSinceDispensation={daysSinceDispensation}
        urgencyStatus={urgencyStatus}
        isDeleteBatchAlertOpen={isDeleteBatchAlertOpen} setIsDeleteBatchAlertOpen={setIsDeleteBatchAlertOpen}
        selectedRecipesCount={selectedRecipes.length}
        handleConfirmSend={handleConfirmSend}
        handleConfirmBatchSend={handleConfirmBatchSend}
        handleConfirmReject={handleConfirmReject}
        handleConfirmCancel={handleConfirmCancel}
        handleConfirmReprepare={handleConfirmReprepare}
        handleConfirmReceive={handleConfirmReceive}
        isReceptionChecklistComplete={isReceptionChecklistComplete}
        handleConfirmArchive={handleConfirmArchive}
        handleConfirmDelete={handleConfirmDelete}
        handleBatchDelete={handleBatchDelete}
        patients={patients}
        doctors={doctors}
        externalPharmacies={externalPharmacies}
        getPatientName={getPatientName}
        getDoctorName={getDoctorName}
        getPharmacy={getPharmacy}
      />

      {selectedRecipes.length > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-lg z-50 shadow-2xl"><CardContent className="p-3 flex items-center justify-between gap-4"><p className="text-sm font-medium">{selectedRecipes.length} receta(s) seleccionada(s)</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleOpenBatchSendDialog}><Send className="mr-2 h-4 w-4"/>Enviar</Button><Button variant="outline" size="sm" onClick={() => toast({ title: 'Función no disponible', description: 'La exportación a CSV se implementará pronto.' })}>Exportar</Button><Button variant="destructive" size="sm" onClick={() => setIsDeleteBatchAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button></div></CardContent></Card>
      )}
    </>
  );
};

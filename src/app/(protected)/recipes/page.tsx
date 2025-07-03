
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  FileX,
  Eye,
  Copy,
  Printer,
  XCircle,
  Send,
  PackageCheck,
  Truck,
  Ban,
  Loader2,
  CheckCheck,
  Package,
  ShieldCheck,
  Filter,
  Calendar as CalendarIcon,
  Split,
} from 'lucide-react';
import { getRecipes, getPatients, getDoctors, getExternalPharmacies, deleteRecipe, updateRecipe, Recipe, Patient, Doctor, ExternalPharmacy, RecipeStatus, AuditTrailEntry } from '@/lib/data';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { useToast } from '@/hooks/use-toast';
import { MAX_REPREPARATIONS, statusConfig } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const RecipeStatusBadge = ({ status }: { status: RecipeStatus }) => {
  const config = statusConfig[status] || { text: status, badge: 'bg-gray-100', icon: FileX };
  return (
    <Badge
      variant="outline"
      className={cn('font-semibold text-xs gap-1.5 whitespace-nowrap', config.badge)}
    >
      <config.icon className="h-3.5 w-3.5" />
      {config.text}
    </Badge>
  );
};

export default function RecipesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs state
  const [recipeToView, setRecipeToView] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [recipeToReject, setRecipeToReject] = useState<Recipe | null>(null);
  const [recipeToCancel, setRecipeToCancel] = useState<Recipe | null>(null);
  const [recipeToReprepare, setRecipeToReprepare] = useState<Recipe | null>(null);
  const [recipeToReceive, setRecipeToReceive] = useState<Recipe | null>(null);
  const [recipeToPrint, setRecipeToPrint] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs form fields
  const [reason, setReason] = useState('');
  const [controlledFolio, setControlledFolio] = useState('');
  const [internalLot, setInternalLot] = useState('');
  const [preparationExpiry, setPreparationExpiry] = useState<Date>();

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


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, patientsData, doctorsData, pharmaciesData] = await Promise.all([
        getRecipes(),
        getPatients(),
        getDoctors(),
        getExternalPharmacies(),
      ]);
      setRecipes(recipesData);
      setPatients(patientsData);
      setDoctors(doctorsData);
      setExternalPharmacies(pharmaciesData);
    } catch (error) {
      console.error("Failed to fetch recipes data:", error);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos de las recetas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPatientName = (patientId: string) => patients.find((p) => p.id === patientId)?.name || 'N/A';

  const handleUpdateStatus = async (recipe: Recipe, newStatus: RecipeStatus, notes?: string) => {
    setIsSubmitting(true);
    try {
      const newAuditEntry: AuditTrailEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        userId: 'system-user',
        notes: notes || `Estado cambiado a ${newStatus}`
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
      
      setRecipes(prevRecipes => 
        prevRecipes.map(r => 
          r.id === recipe.id 
            ? { ...r, ...updates, updatedAt: new Date().toISOString() } 
            : r
        )
      );
    } catch (error) {
       toast({ title: 'Error', description: 'No se pudo actualizar el estado de la receta.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

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
  
  const handleConfirmReceive = async () => {
    if (!recipeToReceive || !internalLot || !preparationExpiry) return;
    setIsSubmitting(true);
    try {
       const newAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.ReceivedAtSkol,
        date: new Date().toISOString(),
        userId: 'system-user',
        notes: `Preparado recepcionado. Lote Interno: ${internalLot}. Vencimiento: ${format(preparationExpiry, 'dd-MM-yyyy')}`
      };
      const updates: Partial<Recipe> = { 
        status: RecipeStatus.ReceivedAtSkol, 
        auditTrail: [...(recipeToReceive.auditTrail || []), newAuditEntry],
        internalPreparationLot: internalLot,
        compoundingDate: new Date().toISOString(),
        preparationExpiryDate: preparationExpiry.toISOString(),
      };
       await updateRecipe(recipeToReceive.id, updates);
       toast({ title: 'Preparado Recepcionado', description: `La receta ${recipeToReceive.id} ha sido actualizada.` });
       
       setRecipes(prevRecipes =>
         prevRecipes.map(r =>
           r.id === recipeToReceive.id
             ? { ...r, ...updates, updatedAt: new Date().toISOString() }
             : r
         )
       );

       setRecipeToReceive(null);
       setInternalLot('');
       setPreparationExpiry(undefined);
    } catch (error) {
       toast({ title: 'Error', description: 'No se pudo recepcionar el preparado.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    setIsSubmitting(true);
    try {
        const deletedId = recipeToDelete.id;
        await deleteRecipe(deletedId);
        toast({ title: 'Receta Eliminada', description: `La receta ${deletedId} ha sido eliminada.` });
        
        setRecipes(prevRecipes => prevRecipes.filter(r => r.id !== deletedId));
        setRecipeToDelete(null);
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la receta.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleBatchDelete = async () => {
    setIsSubmitting(true);
    try {
        const idsToDelete = [...selectedRecipes];
        await Promise.all(idsToDelete.map(id => deleteRecipe(id)));
        toast({ title: `${idsToDelete.length} Recetas Eliminadas`, description: 'Las recetas seleccionadas han sido eliminadas.' });
        
        setRecipes(prevRecipes => prevRecipes.filter(r => !idsToDelete.includes(r.id)));
        setSelectedRecipes([]);
    } catch (error) {
         toast({ title: 'Error', description: 'No se pudieron eliminar todas las recetas seleccionadas.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
        setIsDeleteBatchAlertOpen(false);
    }
  }

  const handleConfirmReprepare = async () => {
    if (!recipeToReprepare) return;
    
    setIsSubmitting(true);
    
    if (recipeToReprepare.isControlled && !controlledFolio.trim()) {
      toast({ title: "Error de Validación", description: "El nuevo folio es requerido para recetas controladas.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const reprepareAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.PendingValidation,
        date: new Date().toISOString(),
        userId: 'system-user',
        notes: `Nuevo ciclo de re-preparación iniciado.${recipeToReprepare.isControlled ? ` Nuevo folio: ${controlledFolio}.` : ''}`
      };

      const updates: Partial<Recipe> = {
        status: RecipeStatus.PendingValidation,
        paymentStatus: 'Pendiente',
        dispensationDate: undefined,
        internalPreparationLot: undefined,
        compoundingDate: undefined,
        preparationExpiryDate: undefined,
        rejectionReason: undefined,
        auditTrail: [...(recipeToReprepare.auditTrail || []), reprepareAuditEntry]
      };

      if (recipeToReprepare.isControlled) {
        updates.controlledRecipeFolio = controlledFolio;
      }

      await updateRecipe(recipeToReprepare.id, updates);
      
      toast({ title: 'Nuevo Ciclo Iniciado', description: `La receta ${recipeToReprepare.id} está lista para un nuevo ciclo.` });
      
      setRecipes(prevRecipes =>
        prevRecipes.map(r => 
          r.id === recipeToReprepare.id
            ? { ...r, ...updates, updatedAt: new Date().toISOString() }
            : r
        )
      );

      setRecipeToReprepare(null);
      setControlledFolio('');
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo iniciar el nuevo ciclo.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const filteredRecipes = useMemo(() => {
    return recipes
    .filter((recipe) => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      
      const searchMatch = searchTerm === '' ||
        recipe.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        getPatientName(recipe.patientId).toLowerCase().includes(lowerCaseSearchTerm) ||
        recipe.items.some(item => item.principalActiveIngredient.toLowerCase().includes(lowerCaseSearchTerm));
      
      const statusMatch = statusFilter === 'all' || recipe.status === statusFilter;
      const doctorMatch = doctorFilter === 'all' || recipe.doctorId === doctorFilter;
      const pharmacyMatch = pharmacyFilter === 'all' || recipe.externalPharmacyId === pharmacyFilter;
      
      const dateMatch = !dateRange || (
        (!dateRange.from || new Date(recipe.createdAt) >= dateRange.from) &&
        (!dateRange.to || new Date(recipe.createdAt) <= dateRange.to)
      );

      return searchMatch && statusMatch && doctorMatch && pharmacyMatch && dateMatch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recipes, searchTerm, statusFilter, doctorFilter, pharmacyFilter, dateRange, patients]);
  
  const toggleSelectAll = () => {
    if (selectedRecipes.length === filteredRecipes.length) {
      setSelectedRecipes([]);
    } else {
      setSelectedRecipes(filteredRecipes.map(r => r.id));
    }
  }

  const toggleSelectRecipe = (id: string) => {
    setSelectedRecipes(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  }

  const RecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;
    const cycleLimitReached = dispensedCount >= MAX_REPREPARATIONS + 1;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${MAX_REPREPARATIONS + 1} ciclos alcanzado.`;

    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;

    return (
        <div className="flex items-center justify-end gap-1">
            {/* --- STATE CHANGE ACTIONS --- */}
            {recipe.status === RecipeStatus.PendingValidation && (
                <>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Validar</p></TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToReject(recipe)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Rechazar</p></TooltipContent></Tooltip></TooltipProvider>
                </>
            )}
            
            {recipe.status === RecipeStatus.Validated && (
                recipe.supplySource === 'Insumos de Skol' ? (
                     <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dispatch-management`}><Truck className="h-4 w-4 text-blue-500" /></Link>
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Ir a Despachos</p></TooltipContent></Tooltip></TooltipProvider>
                ) : (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}>
                            <Send className="h-4 w-4 text-cyan-500" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Enviar a Recetario</p></TooltipContent></Tooltip></TooltipProvider>
                )
            )}

            {recipe.status === RecipeStatus.SentToExternal && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToReceive(recipe)}>
                        <PackageCheck className="h-4 w-4 text-indigo-500" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Recepcionar Preparado</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            
             {recipe.status === RecipeStatus.ReceivedAtSkol && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}>
                        <Package className="h-4 w-4 text-orange-500" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Marcar para Retiro</p></TooltipContent></Tooltip></TooltipProvider>
            )}

            {recipe.status === RecipeStatus.ReadyForPickup && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}>
                        <CheckCheck className="h-4 w-4 text-green-500" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Dispensar</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRecipeToView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</DropdownMenuItem>
                    <DropdownMenuItem asChild disabled={!canEdit}><Link href={`/recipes/${recipe.id}`} className={!canEdit ? 'pointer-events-none' : ''}><Pencil className="mr-2 h-4 w-4" />Editar</Link></DropdownMenuItem>
                    {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
                        <DropdownMenuItem onClick={() => setRecipeToPrint(recipe)}><Printer className="mr-2 h-4 w-4" />Imprimir Etiqueta</DropdownMenuItem>
                    )}
                    {recipe.status === RecipeStatus.Dispensed && (
                         <DropdownMenuItem disabled={!canReprepare} onSelect={() => canReprepare && setRecipeToReprepare(recipe)}><Copy className="mr-2 h-4 w-4" /><span>Re-preparar</span></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                        <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => setRecipeToCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setRecipeToDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

  const MobileRecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const ActionButton = () => {
        switch (recipe.status) {
            case RecipeStatus.PendingValidation:
                return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}><ShieldCheck className="mr-2 h-4 w-4" />Validar</Button>;
            case RecipeStatus.Validated:
                 return recipe.supplySource === 'Insumos de Skol' 
                    ? <Button size="sm" asChild><Link href="/dispatch-management"><Truck className="mr-2 h-4 w-4" />Ir a Despacho</Link></Button>
                    : <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}><Send className="mr-2 h-4 w-4" />Enviar</Button>;
            case RecipeStatus.SentToExternal:
                 return <Button size="sm" onClick={() => setRecipeToReceive(recipe)}><PackageCheck className="mr-2 h-4 w-4" />Recepcionar</Button>;
            case RecipeStatus.ReceivedAtSkol:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}><Package className="mr-2 h-4 w-4" />Marcar Retiro</Button>;
            case RecipeStatus.ReadyForPickup:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}><CheckCheck className="mr-2 h-4 w-4" />Dispensar</Button>;
            case RecipeStatus.Dispensed:
                const { isExpired, cycleLimitReached } = {
                    isExpired: new Date(recipe.dueDate) < new Date(),
                    cycleLimitReached: (recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0) >= MAX_REPREPARATIONS + 1,
                };
                const canReprepare = !isSubmitting && !isExpired && !cycleLimitReached;
                 return <Button size="sm" onClick={() => setRecipeToReprepare(recipe)} disabled={!canReprepare}><Copy className="mr-2 h-4 w-4" />Re-preparar</Button>;
            default:
                return <Button size="sm" onClick={() => setRecipeToView(recipe)}>Ver Detalle</Button>;
        }
    }
    
    const { isExpired, cycleLimitReached } = {
        isExpired: new Date(recipe.dueDate) < new Date(),
        cycleLimitReached: (recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0) >= MAX_REPREPARATIONS + 1,
    };
    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !(cycleLimitReached);

    return (
        <div className="flex justify-between items-center w-full">
            <ActionButton />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRecipeToView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</DropdownMenuItem>
                    <DropdownMenuItem disabled={!canEdit} onSelect={() => canEdit && router.push(`/recipes/${recipe.id}`)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                     {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
                        <DropdownMenuItem onClick={() => setRecipeToPrint(recipe)}><Printer className="mr-2 h-4 w-4" />Imprimir Etiqueta</DropdownMenuItem>
                    )}
                    {recipe.status === RecipeStatus.PendingValidation && (
                        <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setRecipeToReject(recipe)}><XCircle className="mr-2 h-4 w-4" />Rechazar</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                        <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => setRecipeToCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular Receta</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setRecipeToDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight font-headline">Gestión de Recetas</h1>
          <p className="text-sm text-slate-500">
            Visualiza, filtra y gestiona todas las recetas del sistema.
          </p>
        </div>
        <Button asChild>
            <Link href="/recipes/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Receta
            </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Collapsible
            open={advancedFiltersOpen}
            onOpenChange={setAdvancedFiltersOpen}
          >
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por ID, paciente, principio activo..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.values(RecipeStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusConfig[status]?.text || status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros Avanzados
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 pt-4 border-t mt-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por médico..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los médicos</SelectItem>
                            {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                     <Select value={pharmacyFilter} onValueChange={setPharmacyFilter}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por recetario..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los recetarios</SelectItem>
                            {externalPharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Seleccionar rango de fechas</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                        </PopoverContent>
                     </Popover>
                 </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>


      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Cargando recetas...</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="w-full py-16 mt-8 shadow-none border-dashed">
            <div className="flex flex-col items-center justify-center text-center">
              <FileX className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No se encontraron recetas</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
              Intenta ajustar tu búsqueda o filtros, o crea una nueva receta para empezar.
              </p>
              <Button asChild className="mt-6"><Link href="/recipes/new"><PlusCircle className="mr-2 h-4 w-4" /> Crear Primera Receta</Link></Button>
            </div>
        </Card>
      ) : (
        <>
            {/* Desktop Table View */}
            <Card className="hidden w-full md:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="p-4"><Checkbox onCheckedChange={toggleSelectAll} checked={selectedRecipes.length === filteredRecipes.length && filteredRecipes.length > 0} /></TableHead>
                            <TableHead>ID Receta</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Preparado</TableHead>
                            <TableHead>Fecha Creación</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredRecipes.map((recipe) => (
                            <TableRow key={recipe.id} className={cn("hover:bg-muted/50", selectedRecipes.includes(recipe.id) && "bg-muted/50")}>
                            <TableCell className="p-4"><Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)}/></TableCell>
                            <TableCell className="font-mono text-primary">
                                <div className="flex items-center gap-2">
                                    <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                                        {recipe.id}
                                    </Link>
                                    {recipe.items.some(item => item.requiresFractionation) && (
                                        <TooltipProvider><Tooltip><TooltipTrigger>
                                            <Split className="h-4 w-4 text-orange-500" />
                                        </TooltipTrigger><TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent></Tooltip></TooltipProvider>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">{getPatientName(recipe.patientId)}</TableCell>
                            <TableCell>
                                {recipe.items.length > 0 ? (
                                    <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-800">
                                        {recipe.items[0].principalActiveIngredient}{' '}
                                        {recipe.items[0].concentrationValue}
                                        {recipe.items[0].concentrationUnit}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate" style={{maxWidth: '25ch'}}>
                                        {recipe.items[0].usageInstructions}
                                    </span>
                                    {recipe.items.length > 1 && <span className="text-xs font-bold text-slate-500 mt-1">+ {recipe.items.length - 1} más</span>}
                                    </div>
                                ) : (
                                    'N/A'
                                )}
                            </TableCell>
                            <TableCell>{format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</TableCell>
                            <TableCell><RecipeStatusBadge status={recipe.status} /></TableCell>
                            <TableCell className="text-right"><RecipeActions recipe={recipe} /></TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className={cn(selectedRecipes.includes(recipe.id) && "ring-2 ring-primary")}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)}/>
                        <Link href={`/recipes/${recipe.id}`} className="text-lg font-bold text-primary hover:underline">{recipe.id}</Link>
                         {recipe.items.some(item => item.requiresFractionation) && (
                            <TooltipProvider><Tooltip><TooltipTrigger>
                                <Split className="h-4 w-4 text-orange-500" />
                            </TooltipTrigger><TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent></Tooltip></TooltipProvider>
                        )}
                    </div>
                    <RecipeStatusBadge status={recipe.status} />
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    <p className="font-bold text-lg text-slate-800">{getPatientName(recipe.patientId)}</p>
                    {recipe.items.length > 0 ? (
                        <div>
                        <p className="font-medium text-sm text-slate-800">
                            {recipe.items[0].principalActiveIngredient}{' '}
                            {recipe.items[0].concentrationValue}
                            {recipe.items[0].concentrationUnit}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            {recipe.items[0].usageInstructions}
                        </p>
                        {recipe.items.length > 1 && (
                            <p className="text-xs font-bold text-slate-500 mt-1">
                            + {recipe.items.length - 1} más
                            </p>
                        )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Sin preparado</p>
                    )}
                     <p className="text-xs text-slate-500 pt-1">Creada: {format(new Date(recipe.createdAt), "d MMM yyyy", { locale: es })}</p>
                  </CardContent>
                  <CardFooter className="p-3 bg-muted/50"><MobileRecipeActions recipe={recipe} /></CardFooter>
                </Card>
            ))}
            </div>
        </>
      )}

      {/* --- DIALOGS --- */}
      <Dialog open={!!recipeToView} onOpenChange={(open) => !open && setRecipeToView(null)}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="text-xl font-semibold">Detalle Receta: {recipeToView?.id}</DialogTitle><DialogDescription>Información completa de la receta y su historial.</DialogDescription></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1 pr-4"><div className="space-y-6">
                <div className="space-y-1"><h3 className="text-sm font-semibold text-slate-700">Paciente:</h3><p className="text-slate-500">{getPatientName(recipeToView?.patientId || '')}</p></div>
                <div className="space-y-1"><h3 className="text-sm font-semibold text-slate-700">Estado Actual:</h3>{recipeToView && <RecipeStatusBadge status={recipeToView.status} />}</div>
                <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-700">Items:</h3>{recipeToView?.items.map((item, index) => ( <div key={index} className="text-sm p-3 border rounded-md bg-muted/50"><p className="font-medium text-slate-800">{item.principalActiveIngredient} {item.concentrationValue}{item.concentrationUnit}</p><p className="text-slate-500">{item.usageInstructions}</p></div>))}</div>
                <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-700">Historial de Auditoría:</h3><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{recipeToView?.auditTrail?.slice().reverse().map((entry, index) => (<TableRow key={index}><TableCell>{format(parseISO(entry.date), 'dd-MM-yy HH:mm')}</TableCell><TableCell>{statusConfig[entry.status]?.text || entry.status}</TableCell><TableCell>{entry.notes}</TableCell></TableRow>))}</TableBody></Table></div>
            </div></div><DialogFooter><Button variant="outline" onClick={() => setRecipeToView(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro que deseas eliminar esta receta?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. La receta con ID <span className="font-bold font-mono text-slate-800">{recipeToDelete?.id}</span> será eliminada permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setRecipeToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!recipeToReject} onOpenChange={(open) => {if (!open) {setRecipeToReject(null); setReason('');}}}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Rechazar Receta: {recipeToReject?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo del rechazo. Este quedará registrado en el historial de la receta.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea" className="text-sm font-medium text-slate-700">Motivo del Rechazo *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Dosis inconsistente con la indicación."/></div><DialogFooter><Button variant="ghost" onClick={() => {setRecipeToReject(null); setReason('');}}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmReject} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Rechazo</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToCancel} onOpenChange={(open) => {if (!open) {setRecipeToCancel(null); setReason('');}}}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Anular Receta: {recipeToCancel?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo de la anulación. Esta acción es irreversible.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea" className="text-sm font-medium text-slate-700">Motivo de la Anulación *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Solicitado por el paciente."/></div><DialogFooter><Button variant="ghost" onClick={() => {setRecipeToCancel(null); setReason('');}}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmCancel} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Anulación</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToReprepare} onOpenChange={(open) => { if (!open) { setRecipeToReprepare(null); setControlledFolio(''); } }}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Re-preparar Receta: {recipeToReprepare?.id}</DialogTitle></DialogHeader>{recipeToReprepare?.isControlled ? (<div className="space-y-4"><DialogDescription>Esta es una receta controlada. Para re-preparar, debe ingresar el folio de la nueva receta física/electrónica.</DialogDescription><div className="grid gap-2 py-2"><Label htmlFor="controlled-folio" className="mb-1 text-sm font-medium text-slate-700">Nuevo Folio de Receta Controlada *</Label><Input id="controlled-folio" value={controlledFolio} onChange={(e) => setControlledFolio(e.target.value)} placeholder="Ej: A12345678"/></div></div>) : (<DialogDescription>¿Está seguro que desea iniciar un nuevo ciclo para esta receta? La receta volverá al estado 'Pendiente Validación'.</DialogDescription>)}<DialogFooter><Button variant="ghost" onClick={() => setRecipeToReprepare(null)}>Cancelar</Button><Button onClick={handleConfirmReprepare} disabled={isSubmitting || (recipeToReprepare?.isControlled && !controlledFolio.trim())}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Re-preparación</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToReceive} onOpenChange={(open) => {if (!open) setRecipeToReceive(null)}}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Recepcionar Preparado: {recipeToReceive?.id}</DialogTitle><DialogDescription>Ingrese la información del preparado recibido desde el recetario externo.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label htmlFor="internal-lot" className="text-sm font-medium text-slate-700">Lote Interno Skol *</Label><Input id="internal-lot" value={internalLot} onChange={(e) => setInternalLot(e.target.value)} placeholder="Lote asignado por Skol"/></div><div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Fecha de Vencimiento del Preparado *</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !preparationExpiry && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{preparationExpiry ? format(preparationExpiry, "PPP") : <span>Seleccionar fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={preparationExpiry} onSelect={setPreparationExpiry} initialFocus/></PopoverContent></Popover></div></div><DialogFooter><Button variant="ghost" onClick={() => setRecipeToReceive(null)}>Cancelar</Button><Button onClick={handleConfirmReceive} disabled={!internalLot || !preparationExpiry || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Recepcionar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToPrint} onOpenChange={(open) => !open && setRecipeToPrint(null)}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Imprimir Etiqueta: {recipeToPrint?.id}</DialogTitle><DialogDescription>Vista previa de la etiqueta para el paciente.</DialogDescription></DialogHeader><div className="my-6 p-4 border rounded-lg bg-muted/50 space-y-2 font-mono text-sm"><p><span className="font-semibold">SKOL Pharmacy</span></p><p>Paciente: {getPatientName(recipeToPrint?.patientId || '')}</p><p>Receta: {recipeToPrint?.id}</p><p>Producto: {recipeToPrint?.items[0]?.principalActiveIngredient} {recipeToPrint?.items[0]?.concentrationValue}{recipeToPrint?.items[0]?.concentrationUnit}</p><p className="pt-2">Instrucciones: {recipeToPrint?.items[0]?.usageInstructions}</p><p className="pt-2">Vencimiento: {recipeToPrint?.preparationExpiryDate ? format(parseISO(recipeToPrint.preparationExpiryDate), 'dd-MM-yyyy') : 'N/A'}</p><p>Lote: {recipeToPrint?.internalPreparationLot || 'N/A'}</p></div><DialogFooter><Button variant="outline" onClick={() => setRecipeToPrint(null)}>Cerrar</Button><Button onClick={() => toast({title: 'Imprimiendo...', description: 'La funcionalidad de impresión real no está implementada.'})}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isDeleteBatchAlertOpen} onOpenChange={setIsDeleteBatchAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar {selectedRecipes.length} recetas?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Las recetas seleccionadas serán eliminadas permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBatchDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {/* Batch Action Bar */}
      {selectedRecipes.length > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-lg z-50 shadow-2xl">
            <CardContent className="p-3 flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{selectedRecipes.length} receta(s) seleccionada(s)</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Exportar</Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteBatchAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

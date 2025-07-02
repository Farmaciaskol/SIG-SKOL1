
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
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
  CheckCircle,
  XCircle,
  Send,
  PackageCheck,
  Truck,
  Ban,
  Loader2,
  FileClock,
  CheckCheck,
  FileSearch,
  Package,
} from 'lucide-react';
import { getRecipes, getPatients, deleteRecipe, updateRecipe, Recipe, Patient, RecipeStatus, AuditTrailEntry } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const statusConfig: Record<RecipeStatus, { text: string; badge: string; icon: React.ElementType }> = {
  [RecipeStatus.PendingReviewPortal]: { text: 'Pendiente Revisión', badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: FileSearch },
  [RecipeStatus.PendingValidation]: { text: 'Pendiente Validación', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FileClock },
  [RecipeStatus.Validated]: { text: 'Validada', badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  [RecipeStatus.Rejected]: { text: 'Rechazada', badge: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  [RecipeStatus.SentToExternal]: { text: 'Enviada a Recetario', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Send },
  [RecipeStatus.ReceivedAtSkol]: { text: 'Recepcionado en Skol', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: PackageCheck },
  [RecipeStatus.ReadyForPickup]: { text: 'Lista para Retiro', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
  [RecipeStatus.Dispensed]: { text: 'Dispensada', badge: 'bg-green-100 text-green-800 border-green-200', icon: CheckCheck },
  [RecipeStatus.Cancelled]: { text: 'Anulada', badge: 'bg-gray-200 text-gray-800 border-gray-300', icon: Ban },
  [RecipeStatus.Preparation]: { text: 'En Preparación', badge: 'bg-pink-100 text-pink-800 border-pink-200', icon: Package },
};


const RecipeStatusBadge = ({ status }: { status: RecipeStatus }) => {
  const config = statusConfig[status] || { text: status, badge: 'bg-gray-100', icon: FileClock };
  return (
    <Badge
      variant="outline"
      className={`font-semibold text-xs gap-1.5 ${config.badge}`}
    >
      <config.icon className="h-3.5 w-3.5" />
      {config.text}
    </Badge>
  );
};

export default function RecipesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // State for dialogs
  const [recipeToView, setRecipeToView] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [recipeToReject, setRecipeToReject] = useState<Recipe | null>(null);
  const [recipeToCancel, setRecipeToCancel] = useState<Recipe | null>(null);
  const [recipeToReprepare, setRecipeToReprepare] = useState<Recipe | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [controlledFolio, setControlledFolio] = useState('');


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, patientsData] = await Promise.all([
        getRecipes(),
        getPatients(),
      ]);
      setRecipes(recipesData);
      setPatients(patientsData);
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

  const getPatientName = (patientId: string) => {
    return patients.find((p) => p.id === patientId)?.name || 'N/A';
  };

  const handleUpdateStatus = async (recipe: Recipe, newStatus: RecipeStatus, notes?: string) => {
    setIsSubmitting(true);
    try {
      const newAuditEntry: AuditTrailEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        userId: 'system-user', // Placeholder for actual user ID
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

      toast({ title: 'Estado Actualizado', description: `La receta ${recipe.id} ahora está en estado "${newStatus}".` });
      fetchData();
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

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteRecipe(recipeToDelete.id);
        toast({ title: 'Receta Eliminada', description: `La receta ${recipeToDelete.id} ha sido eliminada.` });
        setRecipeToDelete(null);
        fetchData();
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la receta.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

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
        userId: 'system-user', // Placeholder
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
        // logic for new image upload would go here
      }

      await updateRecipe(recipeToReprepare.id, updates);
      
      toast({ title: 'Nuevo Ciclo Iniciado', description: `La receta ${recipeToReprepare.id} está lista para un nuevo ciclo.` });
      
      setRecipeToReprepare(null);
      setControlledFolio('');
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo iniciar el nuevo ciclo.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    toast({ title: 'No implementado', description: 'La función de impresión estará disponible próximamente.' });
  };
  
  const filteredRecipes = recipes
    .filter((recipe) => {
      if (statusFilter !== 'all' && recipe.status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const patientName = getPatientName(recipe.patientId).toLowerCase();
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
          recipe.id.toLowerCase().includes(lowerCaseSearchTerm) ||
          patientName.includes(lowerCaseSearchTerm) ||
          recipe.items.some(item => item.principalActiveIngredient.toLowerCase().includes(lowerCaseSearchTerm))
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const RecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = new Date(recipe.dueDate) < new Date();
    const cycleLimitReached = dispensedCount >= MAX_REPREPARATIONS + 1;
    const canReprepare = !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${MAX_REPREPARATIONS + 1} ciclos alcanzado.`;

    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;

    return (
        <div className="flex items-center justify-end gap-1">
            {/* --- CONTEXTUAL STATE CHANGE ACTIONS --- */}
            {recipe.status === RecipeStatus.PendingValidation && (
                <>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Validar</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToReject(recipe)}>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Rechazar</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </>
            )}
            
            {recipe.status === RecipeStatus.Validated && (
                recipe.supplySource === 'Insumos de Skol' ? (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <Link href={`/dispatch-management`}>
                                        <Package className="h-4 w-4 text-blue-500" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ir a Despachos</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}>
                                    <Send className="h-4 w-4 text-cyan-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Enviar a Recetario</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            )}

            {recipe.status === RecipeStatus.SentToExternal && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReceivedAtSkol)}>
                                <PackageCheck className="h-4 w-4 text-indigo-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Recepcionar Preparado</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            
            {recipe.status === RecipeStatus.ReceivedAtSkol && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}>
                                <Truck className="h-4 w-4 text-orange-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Marcar para Retiro</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {recipe.status === RecipeStatus.ReadyForPickup && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}>
                                <CheckCheck className="h-4 w-4 text-green-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Dispensar</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* --- SUPPORT ACTIONS --- */}
            {recipe.status === RecipeStatus.Dispensed && (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canReprepare} onClick={() => { if(canReprepare) setRecipeToReprepare(recipe)}}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{canReprepare ? 'Re-preparar' : disabledReprepareTooltip}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            
            {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}>
                                <Printer className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Imprimir Etiqueta</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToCancel(recipe)}>
                                <Ban className="h-4 w-4 text-amber-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Anular Receta</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToView(recipe)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Ver Detalle</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canEdit} asChild>
                             <Link href={!canEdit ? '#' : `/recipes/${recipe.id}`} className={!canEdit ? 'pointer-events-none opacity-50' : ''}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Editar</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToDelete(recipe)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Eliminar</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

  const MobileRecipeActions = ({ recipe }: { recipe: Recipe }) => {
    // Primary action button logic
    const ActionButton = () => {
        switch (recipe.status) {
            case RecipeStatus.PendingValidation:
                return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}><CheckCircle className="mr-2 h-4 w-4" />Validar</Button>;
            case RecipeStatus.Validated:
                 return recipe.supplySource === 'Insumos de Skol' 
                    ? <Button size="sm" asChild><Link href="/dispatch-management"><Package className="mr-2 h-4 w-4" />Ir a Despacho</Link></Button>
                    : <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}><Send className="mr-2 h-4 w-4" />Enviar</Button>;
            case RecipeStatus.SentToExternal:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReceivedAtSkol)}><PackageCheck className="mr-2 h-4 w-4" />Recepcionar</Button>;
            case RecipeStatus.ReceivedAtSkol:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}><Truck className="mr-2 h-4 w-4" />Marcar Retiro</Button>;
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
                return <Button size="sm" asChild><Link href={`/recipes/${recipe.id}`}>Ver Detalle</Link></Button>;
        }
    }
    
    const { isExpired, cycleLimitReached } = {
        isExpired: new Date(recipe.dueDate) < new Date(),
        cycleLimitReached: (recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0) >= MAX_REPREPARATIONS + 1,
    };
    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isSubmitting && !isExpired && !cycleLimitReached;
    
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${MAX_REPREPARATIONS + 1} ciclos alcanzado.`;


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
                    <DropdownMenuItem onClick={() => setRecipeToView(recipe)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalle
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild disabled={!canEdit}>
                        <Link href={`/recipes/${recipe.id}`} className="flex items-center cursor-pointer w-full">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
                        <DropdownMenuItem className="flex items-center cursor-pointer w-full" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Etiqueta
                        </DropdownMenuItem>
                    )}
                    {recipe.status === RecipeStatus.Dispensed && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild><div>
                                    <DropdownMenuItem disabled={!canReprepare} onSelect={(e) => {
                                        if(!canReprepare) e.preventDefault();
                                        else setRecipeToReprepare(recipe);
                                    }}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Re-preparar
                                    </DropdownMenuItem>
                                </div></TooltipTrigger>
                                {!canReprepare && <TooltipContent><p>{disabledReprepareTooltip}</p></TooltipContent>}
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                        <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => setRecipeToCancel(recipe)}>
                            <Ban className="mr-2 h-4 w-4" /> Anular Receta
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setRecipeToDelete(recipe)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Recetas</h2>
          <p className="text-muted-foreground">
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
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
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
                <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                >
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
              <Button asChild className="mt-6">
                  <Link href="/recipes/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Primera Receta
                  </Link>
              </Button>
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
                            <TableHead>ID Receta</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Fecha Creación</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredRecipes.map((recipe) => (
                            <TableRow key={recipe.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-primary">{recipe.id}</TableCell>
                            <TableCell className="font-medium">{getPatientName(recipe.patientId)}</TableCell>
                            <TableCell>
                                {format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>
                                <RecipeStatusBadge status={recipe.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                <RecipeActions recipe={recipe} />
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredRecipes.map((recipe) => (
                <Card key={recipe.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Link href={`/recipes/${recipe.id}`} className="font-semibold text-primary hover:underline">
                      {recipe.id}
                    </Link>
                    <RecipeStatusBadge status={recipe.status} />
                  </CardHeader>
                  <CardContent className="space-y-1 pb-4">
                    <p className="font-bold text-lg">{getPatientName(recipe.patientId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {recipe.items[0]?.principalActiveIngredient || 'Múltiples ítems'}
                    </p>
                     <p className="text-xs text-muted-foreground pt-1">
                        Creada: {format(new Date(recipe.createdAt), "d MMM yyyy", { locale: es })}
                      </p>
                  </CardContent>
                  <CardFooter className="p-3 bg-muted/50">
                    <MobileRecipeActions recipe={recipe} />
                  </CardFooter>
                </Card>
            ))}
            </div>
        </>
      )}

      {/* --- DIALOGS --- */}

      {/* View Detail Dialog */}
      <Dialog open={!!recipeToView} onOpenChange={(open) => !open && setRecipeToView(null)}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Detalle Receta: {recipeToView?.id}</DialogTitle>
                <DialogDescription>
                    Información completa de la receta y su historial.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="font-semibold">Paciente:</h3>
                  <p className="text-muted-foreground">{getPatientName(recipeToView?.patientId || '')}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Estado Actual:</h3>
                  {recipeToView && <RecipeStatusBadge status={recipeToView.status} />}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Items:</h3>
                  {recipeToView?.items.map((item, index) => (
                    <div key={index} className="text-sm p-3 border rounded-md bg-muted/50">
                      <p className="font-medium">{item.principalActiveIngredient} {item.concentrationValue}{item.concentrationUnit}</p>
                      <p className="text-muted-foreground">{item.usageInstructions}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Historial de Auditoría:</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipeToView?.auditTrail?.map((entry, index) => (
                        <TableRow key={index}>
                           <TableCell>{format(new Date(entry.date), 'dd-MM-yy HH:mm')}</TableCell>
                           <TableCell>{entry.status}</TableCell>
                           <TableCell>{entry.notes}</TableCell>
                        </TableRow>
                      )).reverse()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setRecipeToView(null)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro que deseas eliminar esta receta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. La receta con ID <span className="font-bold font-mono">{recipeToDelete?.id}</span> será eliminada permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecipeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <Dialog open={!!recipeToReject} onOpenChange={(open) => {if (!open) {setRecipeToReject(null); setReason('');}}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Rechazar Receta: {recipeToReject?.id}</DialogTitle>
                <DialogDescription>
                    Por favor, ingrese el motivo del rechazo. Este quedará registrado en el historial de la receta.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="reason-textarea">Motivo del Rechazo *</Label>
                <Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Dosis inconsistente con la indicación."/>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => {setRecipeToReject(null); setReason('');}}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmReject} disabled={!reason.trim() || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Rechazo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancellation Dialog */}
       <Dialog open={!!recipeToCancel} onOpenChange={(open) => {if (!open) {setRecipeToCancel(null); setReason('');}}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Anular Receta: {recipeToCancel?.id}</DialogTitle>
                <DialogDescription>
                    Por favor, ingrese el motivo de la anulación. Esta acción es irreversible.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="reason-textarea">Motivo de la Anulación *</Label>
                <Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Solicitado por el paciente."/>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => {setRecipeToCancel(null); setReason('');}}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmCancel} disabled={!reason.trim() || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Anulación
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Re-preparation Dialog */}
      <Dialog open={!!recipeToReprepare} onOpenChange={(open) => { if (!open) { setRecipeToReprepare(null); setControlledFolio(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-preparar Receta: {recipeToReprepare?.id}</DialogTitle>
          </DialogHeader>
          {recipeToReprepare?.isControlled ? (
            <div className="space-y-4">
              <DialogDescription>
                Esta es una receta controlada. Para re-preparar, debe ingresar el folio de la nueva receta física/electrónica.
              </DialogDescription>
              <div className="grid gap-2 py-2">
                <Label htmlFor="controlled-folio" className="mb-1">Nuevo Folio de Receta Controlada *</Label>
                <Input
                  id="controlled-folio"
                  value={controlledFolio}
                  onChange={(e) => setControlledFolio(e.target.value)}
                  placeholder="Ej: A12345678"
                />
              </div>
            </div>
          ) : (
            <DialogDescription>
              ¿Está seguro que desea iniciar un nuevo ciclo para esta receta? La receta volverá al estado 'Pendiente Validación'.
            </DialogDescription>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecipeToReprepare(null)}>Cancelar</Button>
            <Button onClick={handleConfirmReprepare} disabled={isSubmitting || (recipeToReprepare?.isControlled && !controlledFolio.trim())}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Re-preparación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

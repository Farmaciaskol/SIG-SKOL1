
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
  Loader2
} from 'lucide-react';
import { getRecipes, getPatients, deleteRecipe, updateRecipe, Recipe, Patient, RecipeStatus, AuditTrailEntry } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { MAX_REPREPARATIONS } from '@/lib/constants';

const statusColors: Record<RecipeStatus, string> = {
  [RecipeStatus.PendingValidation]: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  [RecipeStatus.Validated]: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  [RecipeStatus.Rejected]: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
  [RecipeStatus.SentToExternal]: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
  [RecipeStatus.ReceivedAtSkol]: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  [RecipeStatus.ReadyForPickup]: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
  [RecipeStatus.Dispensed]: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  [RecipeStatus.Cancelled]: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
};

const RecipeStatusBadge = ({ status }: { status: RecipeStatus }) => (
  <Badge
    variant="outline"
    className={`font-semibold text-xs ${statusColors[status]}`}
  >
    {status}
  </Badge>
);

export default function RecipesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // State for dialogs
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
        userId: 'system-user', // Placeholder
        notes: notes || `Estado cambiado a ${newStatus}`
      };
      const updatedAuditTrail = [...(recipe.auditTrail || []), newAuditEntry];
      
      await updateRecipe(recipe.id, { status: newStatus, auditTrail: updatedAuditTrail });

      toast({ title: 'Estado Actualizado', description: `La receta ${recipe.id} ahora está ${newStatus}.` });
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
        dispensationDate: null,
        internalPreparationLot: null,
        compoundingDate: null,
        preparationExpiryDate: null,
        rejectionReason: undefined,
        auditTrail: [...(recipeToReprepare.auditTrail || []), reprepareAuditEntry]
      };

      if (recipeToReprepare.isControlled) {
        updates.controlledRecipeFolio = controlledFolio;
        // logic for image upload would go here
      }

      await updateRecipe(recipeToReprepare.id, updates);
      
      toast({ title: 'Nuevo Ciclo Iniciado', description: `La receta ${recipeToReprepare.id} está lista para un nuevo ciclo.` });
      
      // Close dialog and reset state
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
          patientName.includes(lowerCaseSearchTerm)
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
    
    let disabledTooltip = '';
    if (isExpired) disabledTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledTooltip = `Límite de ${MAX_REPREPARATIONS + 1} ciclos alcanzado.`;

    const ReprepareMenuItem = (
        <DropdownMenuItem disabled={!canReprepare} onSelect={(e) => {
            if(!canReprepare) e.preventDefault();
            else setRecipeToReprepare(recipe);
        }}>
            <Copy className="mr-2 h-4 w-4" />
            Re-preparar
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
            <Link href={`/recipes/${recipe.id}`} className="flex items-center cursor-pointer w-full">
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
            </Link>
            </DropdownMenuItem>

            {recipe.status === RecipeStatus.PendingValidation || recipe.status === RecipeStatus.Rejected ? (
                <DropdownMenuItem asChild>
                    <Link href={`/recipes/${recipe.id}`} className="flex items-center cursor-pointer w-full">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </DropdownMenuItem>
            ) : null}

            <DropdownMenuSeparator />

            {recipe.status === RecipeStatus.PendingValidation && (
            <>
                <DropdownMenuItem onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Validar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRecipeToReject(recipe)}>
                <XCircle className="mr-2 h-4 w-4 text-red-500" /> Rechazar
                </DropdownMenuItem>
            </>
            )}
            
            {recipe.status === RecipeStatus.Validated && recipe.supplySource === 'Stock del Recetario Externo' && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}>
                    <Send className="mr-2 h-4 w-4 text-blue-500" /> Enviar a Recetario
                </DropdownMenuItem>
            )}

            {recipe.status === RecipeStatus.SentToExternal && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReceivedAtSkol)}>
                    <PackageCheck className="mr-2 h-4 w-4 text-purple-500" /> Recepcionar Preparado
                </DropdownMenuItem>
            )}
            
            {recipe.status === RecipeStatus.ReceivedAtSkol && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}>
                    <Truck className="mr-2 h-4 w-4 text-orange-500" /> Marcar para Retiro
                </DropdownMenuItem>
            )}

            {recipe.status === RecipeStatus.ReadyForPickup && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Dispensar
                </DropdownMenuItem>
            )}

            {(recipe.status === RecipeStatus.Dispensed) && (
                !canReprepare ? (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>{ReprepareMenuItem}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{disabledTooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    ReprepareMenuItem
                )
            )}
        
            <DropdownMenuItem className="flex items-center cursor-pointer w-full" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Etiqueta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
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
    );
  }

  const MobileRecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const ActionButton = () => {
        switch (recipe.status) {
            case RecipeStatus.PendingValidation:
                return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}><CheckCircle className="mr-2 h-4 w-4" />Validar</Button>;
            case RecipeStatus.Validated:
                 if (recipe.supplySource === 'Stock del Recetario Externo') {
                    return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.SentToExternal)}><Send className="mr-2 h-4 w-4" />Enviar</Button>;
                 }
                 return <Button size="sm" disabled>En Despacho</Button>;
            case RecipeStatus.SentToExternal:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReceivedAtSkol)}><PackageCheck className="mr-2 h-4 w-4" />Recepcionar</Button>;
            case RecipeStatus.ReceivedAtSkol:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}><Truck className="mr-2 h-4 w-4" />Marcar Retiro</Button>;
            case RecipeStatus.ReadyForPickup:
                 return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}><CheckCircle className="mr-2 h-4 w-4" />Dispensar</Button>;
            case RecipeStatus.Dispensed:
                 return <Button size="sm" onClick={() => setRecipeToReprepare(recipe)}><Copy className="mr-2 h-4 w-4" />Re-preparar</Button>;
            default:
                return <Button size="sm" asChild><Link href={`/recipes/${recipe.id}`}>Ver Detalle</Link></Button>;
        }
    }

    return (
        <div className="flex justify-between items-center">
            <ActionButton />
            <RecipeActions recipe={recipe} />
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
                placeholder="Buscar por ID, paciente..."
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
                        {status}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>


      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Cargando recetas...</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="py-16 mt-8 shadow-none border-dashed">
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
                            <TableHead className="text-right">
                                <span className="sr-only">Acciones</span>
                            </TableHead>
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
                        Creada: {format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
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

      {/* Dialog for Deletion */}
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
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for Rejection */}
      <Dialog open={!!recipeToReject} onOpenChange={(open) => {if (!open) {setRecipeToReject(null); setReason('');}}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Rechazar Receta: {recipeToReject?.id}</DialogTitle>
                <DialogDescription>
                    Por favor, ingrese el motivo del rechazo. Este quedará registrado en el historial de la receta.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="reason-textarea">Motivo del Rechazo</Label>
                <Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Dosis inconsistente con la indicación."/>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setRecipeToReject(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmReject} disabled={!reason.trim() || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Rechazo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Cancellation */}
       <Dialog open={!!recipeToCancel} onOpenChange={(open) => {if (!open) {setRecipeToCancel(null); setReason('');}}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Anular Receta: {recipeToCancel?.id}</DialogTitle>
                <DialogDescription>
                    Por favor, ingrese el motivo de la anulación. Esta acción es irreversible.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="reason-textarea">Motivo de la Anulación</Label>
                <Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Solicitado por el paciente."/>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setRecipeToCancel(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmCancel} disabled={!reason.trim() || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Anulación
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Re-preparation */}
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

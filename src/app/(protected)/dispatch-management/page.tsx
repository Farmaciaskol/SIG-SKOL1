
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getRecipes,
  getPatients,
  getInventory,
  getExternalPharmacies,
  getDispatchNotes,
  processDispatch,
  getRecipe,
} from '@/lib/data';
import type {
  Recipe,
  Patient,
  InventoryItem,
  ExternalPharmacy,
  DispatchNote,
  DispatchItem,
  AuditTrailEntry,
} from '@/lib/types';
import {
  RecipeStatus,
  SkolSuppliedItemsDispatchStatus,
  DispatchStatus,
} from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Package, History, PackageCheck, Loader2, Truck, AlertTriangle, Check, ShieldCheck, FileWarning, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ItemForDispatch = {
  recipe: Recipe;
  patient?: Patient;
  inventoryItem?: InventoryItem;
  recipeItem: any; // RecipeItem type
  quantityToDispatch?: number;
  error?: string;
};

type GroupedItems = {
  [pharmacyId: string]: ItemForDispatch[];
};

type ItemValidationState = {
  lotNumber?: string;
  barcodeInput?: string;
  isValidated: 'valid' | 'invalid' | 'pending';
};

type ValidationState = {
  [itemId: string]: ItemValidationState;
};

export default function DispatchManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState<DispatchNote[]>([]);
  const [validationState, setValidationState] = useState<ValidationState>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipesData, patientsData, inventoryData, pharmaciesData, dispatchNotesData] = await Promise.all([
        getRecipes(),
        getPatients(),
        getInventory(),
        getExternalPharmacies(),
        getDispatchNotes(),
      ]);
      setRecipes(recipesData);
      setPatients(patientsData);
      setInventory(inventoryData);
      setExternalPharmacies(pharmaciesData);
      setDispatchNotes(dispatchNotesData);
    } catch (error) {
      console.error('Failed to fetch dispatch data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos de despachos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const itemsToDispatch = useMemo<ItemForDispatch[]>(() => {
    if (loading) return [];
    
    const items: ItemForDispatch[] = [];
    
    const recipesToProcess = recipes.filter(r => 
        r.status === RecipeStatus.Validated &&
        r.supplySource === 'Insumos de Skol' &&
        r.skolSuppliedItemsDispatchStatus !== SkolSuppliedItemsDispatchStatus.Dispatched
    );
    
    for (const recipe of recipesToProcess) {
      const patient = patients.find(p => p.id === recipe.patientId);

      if (!Array.isArray(recipe.items) || recipe.items.length === 0) {
        continue; // CRITICAL FIX: Skip recipes with no items to prevent crashes.
      }

      for (const recipeItem of recipe.items) {
        if (!recipeItem?.principalActiveIngredient) continue;

        const isAlreadyInActiveDispatch = dispatchNotes.some(dn => 
            dn.status === DispatchStatus.Active &&
            dn.items.some(item => item.recipeId === recipe.id && item.recipeItemName === recipeItem.principalActiveIngredient)
        );

        if (isAlreadyInActiveDispatch) continue;
        
        const inventoryItem = inventory.find(i => 
          i.name.toLowerCase().includes(recipeItem.principalActiveIngredient.toLowerCase()) && i.itemsPerBaseUnit
        );

        if (inventoryItem) {
             if (inventoryItem.lots && inventoryItem.lots.length > 0 && inventoryItem.itemsPerBaseUnit && recipeItem.totalQuantityValue) {
                 const quantityToDispatch = Math.ceil(Number(recipeItem.totalQuantityValue) / inventoryItem.itemsPerBaseUnit);
                 items.push({ recipe, patient, inventoryItem, recipeItem, quantityToDispatch });
            } else {
                 items.push({ recipe, patient, inventoryItem, recipeItem, error: 'El insumo no tiene lotes con stock o no está configurado para fraccionamiento.' });
            }
        } else {
            items.push({ recipe, patient, inventoryItem: undefined, recipeItem, error: 'Insumo base no encontrado en el inventario.' });
        }
      }
    }
    return items;
  }, [loading, recipes, patients, inventory, dispatchNotes]);


  const itemsToDispatchGroupedByPharmacy = useMemo<GroupedItems>(() => {
    return itemsToDispatch.reduce<GroupedItems>((acc, item) => {
      const pharmacyId = item.recipe.externalPharmacyId;
      if (!pharmacyId) return acc;

      if (!acc[pharmacyId]) {
        acc[pharmacyId] = [];
      }
      acc[pharmacyId].push(item);
      return acc;
    }, {});
  }, [itemsToDispatch]);

  const activeDispatches = useMemo(() => {
    return dispatchNotes.filter(dn => dn.status === DispatchStatus.Active).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dispatchNotes]);

  const historicalDispatches = useMemo(() => {
     return dispatchNotes.filter(dn => dn.status !== DispatchStatus.Active).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dispatchNotes]);
  
  const handleLotChange = (itemId: string, lotNumber: string) => {
    setValidationState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], lotNumber, isValidated: 'pending' }
    }));
  };

  const handleBarcodeInputChange = (itemId: string, barcode: string) => {
     setValidationState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], barcodeInput: barcode }
    }));
  };
  
  const handleValidateItem = (item: ItemForDispatch) => {
    if (!item.inventoryItem) return;
    const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
    const state = validationState[itemId];
    if (!state?.barcodeInput || !state?.lotNumber) {
        toast({ title: "Información Faltante", description: "Seleccione un lote y escanee el código de barras del lote.", variant: "destructive" });
        return;
    }

    if (state.barcodeInput === state.lotNumber) {
        setValidationState(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], isValidated: 'valid' }
        }));
        toast({ title: "Validación Correcta", description: `${item.inventoryItem.name} (Lote: ${state.lotNumber}) ha sido validado.`});
    } else {
         setValidationState(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], isValidated: 'invalid' }
        }));
        toast({ title: "Error de Validación", description: `El Lote Escaneado no coincide con el Lote seleccionado para ${item.inventoryItem.name}.`, variant: "destructive" });
    }
  };

  const handleGenerateDispatchNote = async (pharmacyId: string, items: ItemForDispatch[]) => {
    setIsDispatching(true);
    try {
        const validatedItems = items.filter(item => {
            if (!item.inventoryItem) return false;
            const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
            return validationState[itemId]?.isValidated === 'valid';
        });

        if (validatedItems.length === 0) {
            throw new Error("No hay ítems validados para generar la nota de despacho.");
        }

        const dispatchItems: DispatchItem[] = validatedItems.map(item => {
            const itemId = `${item.recipe.id}-${item.inventoryItem!.id}`;
            const state = validationState[itemId];
             if (!state || state.isValidated !== 'valid' || !state.lotNumber) {
                // This should not happen if called correctly, but as a safeguard.
                throw new Error(`Ítem ${item.inventoryItem!.name} no está validado.`);
            }
            return {
                recipeId: item.recipe.id,
                inventoryItemId: item.inventoryItem!.id,
                recipeItemName: item.recipeItem.principalActiveIngredient,
                lotNumber: state.lotNumber,
                quantity: item.quantityToDispatch!,
            }
        });
        
        await processDispatch(pharmacyId, dispatchItems);

        toast({
            title: "Nota de Despacho Generada",
            description: `Se ha creado la nota de despacho para ${getPharmacyName(pharmacyId)}.`,
        });

        // Reset validation state for the dispatched items
        const newValidationState = { ...validationState };
        validatedItems.forEach(item => {
            if (item.inventoryItem) {
                const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
                delete newValidationState[itemId];
            }
        });
        setValidationState(newValidationState);

        fetchData(); // Refresh all data

    } catch (error) {
        console.error("Failed to generate dispatch note:", error);
        toast({
            title: "Error al Despachar",
            description: `Hubo un problema al generar la nota de despacho. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
        });
    } finally {
        setIsDispatching(false);
    }
  };
  
  const getPharmacyName = (pharmacyId: string) => externalPharmacies.find(p => p.id === pharmacyId)?.name || 'Desconocido';

  const handleMarkAsReceived = async (noteId: string) => {
    if (!db) return;
    setUpdatingNoteId(noteId);

    const note = dispatchNotes.find(n => n.id === noteId);
    if (!note) {
      toast({ title: 'Error', description: 'Nota de despacho no encontrada.', variant: 'destructive' });
      setUpdatingNoteId(null);
      return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Update the dispatch note status
        const noteRef = doc(db, 'dispatchNotes', noteId);
        batch.update(noteRef, {
            status: DispatchStatus.Received,
            completedAt: new Date().toISOString(),
        });

        // 2. Find unique recipes and update their status to "In Preparation"
        const uniqueRecipeIds = [...new Set(note.items.map(item => item.recipeId))];

        for (const recipeId of uniqueRecipeIds) {
            const recipeDocRef = doc(db, "recipes", recipeId);
            const recipeData = await getRecipe(recipeId); // Fetch current recipe data to get audit trail

            if (recipeData) {
                const newAuditEntry: AuditTrailEntry = {
                    status: RecipeStatus.Preparation,
                    date: new Date().toISOString(),
                    userId: 'system-dispatch',
                    notes: `Insumos recibidos en recetario. Despacho ID: ${note.id}. Iniciando preparación.`
                };

                const updatedAuditTrail = [...(recipeData.auditTrail || []), newAuditEntry];

                batch.update(recipeDocRef, {
                    status: RecipeStatus.Preparation,
                    auditTrail: updatedAuditTrail,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        await batch.commit();

        toast({
            title: 'Despacho Recibido',
            description: `Se actualizó la nota de despacho y las recetas asociadas pasaron a "En Preparación".`,
        });
        fetchData();
    } catch (error) {
        console.error('Failed to mark dispatch as received:', error);
        toast({
            title: 'Error',
            description: 'No se pudo actualizar el estado del despacho.',
            variant: 'destructive',
        });
    } finally {
        setUpdatingNoteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-slate-600">Cargando módulo de despachos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Gestión de Despachos</h1>
          <p className="text-sm text-muted-foreground">
            Control logístico del envío de insumos Skol a recetarios.
          </p>
        </div>
      </div>
      <Tabs defaultValue="prepare">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex mb-6">
          <TabsTrigger value="prepare">Por Preparar ({itemsToDispatch.length})</TabsTrigger>
          <TabsTrigger value="active">Despachos Activos ({activeDispatches.length})</TabsTrigger>
          <TabsTrigger value="history">Historial ({historicalDispatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="prepare">
            {Object.keys(itemsToDispatchGroupedByPharmacy).length > 0 ? (
                 <Accordion type="multiple" defaultValue={Object.keys(itemsToDispatchGroupedByPharmacy)} className="w-full space-y-4">
                    {Object.entries(itemsToDispatchGroupedByPharmacy).map(([pharmacyId, items]) => {
                        const validItemsForDispatch = items.filter(item => !item.error && item.inventoryItem);
                        const validatedItems = validItemsForDispatch.filter(item => {
                            if (!item.inventoryItem) return false;
                            const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
                            return validationState[itemId]?.isValidated === 'valid';
                        });
                        const canGenerateDispatch = validatedItems.length > 0;
                        const totalItemsCount = items.length;

                        return (
                            <AccordionItem value={pharmacyId} key={pharmacyId} className="border-b-0">
                                <Card>
                                <AccordionTrigger className="text-xl font-semibold text-slate-700 hover:no-underline p-6">
                                    {getPharmacyName(pharmacyId)} ({totalItemsCount} ítems)
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0 space-y-4">
                                {items.map((item) => {
                                    if (item.error || !item.inventoryItem) {
                                        return (
                                            <Card key={`${item.recipe.id}-${item.recipeItem.principalActiveIngredient}`} className="p-4 bg-red-50 border-red-200">
                                                <div className="flex items-center gap-4">
                                                    <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{item.recipeItem.principalActiveIngredient} (Receta: {item.recipe.id})</p>
                                                        <p className="text-sm text-red-700 font-semibold">{item.error || 'Error desconocido.'}</p>
                                                        <p className="text-xs text-slate-600 mt-1">Por favor, verifique que el producto exista en el <Link href="/inventory" className="underline font-medium">inventario</Link>, tenga lotes con stock y esté correctamente configurado.</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    }

                                    const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
                                    const validationStatus = validationState[itemId]?.isValidated || 'pending';
                                    const sortedLots = item.inventoryItem.lots?.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

                                    return (
                                    <Card key={itemId} className={cn('p-4', 
                                        validationStatus === 'valid' ? 'bg-green-50 border-green-200' : 
                                        validationStatus === 'invalid' ? 'bg-red-50 border-red-200' : ''
                                    )}>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                            <div className="md:col-span-2 space-y-1">
                                                <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    {item.inventoryItem.name}
                                                    {item.inventoryItem.requiresRefrigeration && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Snowflake className="h-5 w-5 text-blue-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>¡Atención! Insumo requiere cadena de frío.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </p>
                                                <p className="text-sm text-slate-600">Receta: <span className="font-mono text-primary">{item.recipe.id}</span> ({item.recipeItem.principalActiveIngredient})</p>
                                                <p className="text-sm text-slate-500">Paciente: {item.patient?.name || 'Desconocido'}</p>
                                                <p className="text-base font-bold mt-1 text-slate-700">Despachar: {item.quantityToDispatch} {item.inventoryItem.unit}</p>
                                            </div>
                                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                               <div className="space-y-1">
                                                    <p className="text-xs font-medium text-slate-500">Lote (FEFO)</p>
                                                    <Select onValueChange={(lot) => handleLotChange(itemId, lot)} disabled={validationStatus === 'valid'}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar lote..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sortedLots?.filter(l => l.quantity > 0).map(lot => (
                                                                <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                                                                    {lot.lotNumber} (Disp: {lot.quantity}, Vto: {format(parseISO(lot.expiryDate), 'dd-MM-yy')})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                     <p className="text-xs font-medium text-slate-500">Escanear N° de Lote *</p>
                                                    <Input 
                                                        placeholder="Escanear o tipear lote..." 
                                                        onChange={(e) => handleBarcodeInputChange(itemId, e.target.value)} 
                                                        disabled={validationStatus === 'valid'}
                                                        value={validationState[itemId]?.barcodeInput || ''}
                                                    />
                                                </div>
                                                <Button onClick={() => handleValidateItem(item)} disabled={!validationState[itemId]?.lotNumber || validationStatus === 'valid'}>
                                                    {validationStatus === 'valid' ? <Check className="mr-2 h-4 w-4" /> :
                                                     validationStatus === 'invalid' ? <XCircle className="mr-2 h-4 w-4" /> :
                                                     <ShieldCheck className="mr-2 h-4 w-4" />}
                                                    Validar
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )})}
                                <div className="flex justify-end mt-4">
                                     <Button
                                        disabled={!canGenerateDispatch || isDispatching}
                                        onClick={() => handleGenerateDispatchNote(pharmacyId, items)}
                                    >
                                        {isDispatching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Package className="mr-2 h-4 w-4" />
                                        Generar Nota de Despacho ({validatedItems.length} Ítems)
                                    </Button>
                                </div>
                                </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <PackageCheck className="h-16 w-16 text-slate-400 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700">Todo al día</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            No hay insumos pendientes de preparación para ser despachados.
                        </p>
                    </div>
                </Card>
            )}
        </TabsContent>

        <TabsContent value="active">
             {activeDispatches.length > 0 ? (
                 <div className="space-y-4">
                    {activeDispatches.map(note => (
                         <Card key={note.id}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center flex-wrap gap-2 text-lg font-bold text-slate-800">
                                    <span>Nota de Despacho: <span className="font-mono text-primary">{note.id}</span></span>
                                    <Badge variant="secondary">{getPharmacyName(note.externalPharmacyId)}</Badge>
                                </CardTitle>
                                <p className="text-sm text-slate-500">
                                    Enviado el: {format(new Date(note.createdAt), 'dd MMMM, yyyy HH:mm', { locale: es })}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    {note.items.map((item, index) => (
                                        <li key={index} className="flex flex-col sm:flex-row justify-between p-2 bg-muted/50 rounded-md">
                                            <span className="font-medium text-slate-700">{item.recipeItemName} (Receta: {item.recipeId})</span>
                                            <span className="font-mono text-xs text-slate-500">Lote: {item.lotNumber} | Cant: {item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                             <CardFooter className="bg-muted/50 p-3">
                                <div className="flex justify-end w-full">
                                    <Button variant="outline" onClick={() => handleMarkAsReceived(note.id)} disabled={updatingNoteId === note.id}>
                                        {updatingNoteId === note.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Truck className="mr-2 h-4 w-4"/> Marcar como Recibido
                                    </Button>
                                </div>
                             </CardFooter>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <Package className="h-16 w-16 text-slate-400 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700">Sin Despachos Activos</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Cuando se genere una nota de despacho, aparecerá aquí para su seguimiento.
                        </p>
                    </div>
                </Card>
             )}
        </TabsContent>

        <TabsContent value="history">
             {historicalDispatches.length > 0 ? (
                 <div className="space-y-4">
                    {historicalDispatches.map(note => (
                         <Card key={note.id}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center flex-wrap gap-2 text-lg font-bold text-slate-800">
                                    <span>Nota de Despacho: <span className="font-mono text-primary">{note.id}</span></span>
                                    <Badge variant={note.status === 'Recibido' ? 'default' : 'destructive'}>{note.status}</Badge>
                                </CardTitle>
                                 <p className="text-sm text-slate-500">
                                    Enviado: {format(new Date(note.createdAt), 'dd MMM yyyy')}{note.completedAt ? `, Completado: ${format(new Date(note.completedAt), 'dd MMM yyyy')}`: ''}
                                 </p>
                            </CardHeader>
                             <CardContent>
                                <p className="text-sm text-slate-600">{note.items.length} ítem(s) despachado(s) a {getPharmacyName(note.externalPharmacyId)}.</p>
                             </CardContent>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <History className="h-16 w-16 text-slate-400 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700">Sin Historial de Despachos</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Los despachos completados o cancelados aparecerán en esta sección.
                        </p>
                    </div>
                </Card>
             )}
        </TabsContent>
      </Tabs>
    </>
  );
}

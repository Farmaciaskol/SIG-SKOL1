
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getRecipes,
  getPatients,
  getInventory,
  getExternalPharmacies,
  getDispatchNotes,
  processDispatch,
  Recipe,
  Patient,
  InventoryItem,
  ExternalPharmacy,
  RecipeStatus,
  SkolSuppliedItemsDispatchStatus,
  LotDetail,
  DispatchNote,
  DispatchItem,
  DispatchStatus
} from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CheckCircle, XCircle, Package, History, PackageCheck, Loader2, Truck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ItemForDispatch = {
  recipe: Recipe;
  patient: Patient;
  inventoryItem: InventoryItem;
  recipeItem: any; // RecipeItem type
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
        r.supplySource === 'Insumos de Skol' &&
        (r.skolSuppliedItemsDispatchStatus === SkolSuppliedItemsDispatchStatus.Pending || r.skolSuppliedItemsDispatchStatus === SkolSuppliedItemsDispatchStatus.PartiallyDispatched) &&
        r.status !== RecipeStatus.Cancelled &&
        r.status !== RecipeStatus.Rejected
    );
    
    for (const recipe of recipesToProcess) {
      const patient = patients.find(p => p.id === recipe.patientId);
      if (!patient) continue;

      for (const recipeItem of recipe.items) {
        if (!recipeItem.requiresFractionation) continue;

        // Simple lookup, can be improved with SKU matching in the future
        const inventoryItem = inventory.find(i => 
          i.name.toLowerCase().includes(recipeItem.principalActiveIngredient.toLowerCase())
        );

        if (inventoryItem && inventoryItem.lots && inventoryItem.lots.length > 0) {
          items.push({ recipe, patient, inventoryItem, recipeItem });
        }
      }
    }
    return items;
  }, [loading, recipes, patients, inventory]);


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
    return dispatchNotes.filter(dn => dn.status === DispatchStatus.Active);
  }, [dispatchNotes]);

  const historicalDispatches = useMemo(() => {
     return dispatchNotes.filter(dn => dn.status !== DispatchStatus.Active);
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
    const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
    const state = validationState[itemId];
    if (!state?.barcodeInput || !state?.lotNumber) {
        toast({ title: "Información Faltante", description: "Seleccione un lote y escanee el código de barras.", variant: "destructive" });
        return;
    }

    if (state.barcodeInput === item.inventoryItem.barcode) {
        setValidationState(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], isValidated: 'valid' }
        }));
        toast({ title: "Validación Correcta", description: `${item.inventoryItem.name} ha sido validado.`});
    } else {
         setValidationState(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], isValidated: 'invalid' }
        }));
        toast({ title: "Error de Validación", description: `El código de barras no coincide para ${item.inventoryItem.name}.`, variant: "destructive" });
    }
  };

  const handleGenerateDispatchNote = async (pharmacyId: string, items: ItemForDispatch[]) => {
    setIsDispatching(true);
    try {
        const dispatchItems: DispatchItem[] = [];
        for (const item of items) {
            const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
            const state = validationState[itemId];
            if (!state || state.isValidated !== 'valid' || !state.lotNumber) {
                throw new Error(`Item ${item.inventoryItem.name} no está validado.`);
            }
            // Logic to calculate quantity of base product needed would go here.
            // For now, assuming 1 base unit per recipe item.
            dispatchItems.push({
                recipeId: item.recipe.id,
                inventoryItemId: item.inventoryItem.id,
                recipeItemName: item.recipeItem.principalActiveIngredient,
                lotNumber: state.lotNumber,
                quantity: 1, // Placeholder
            });
        }
        
        await processDispatch(pharmacyId, dispatchItems);

        toast({
            title: "Nota de Despacho Generada",
            description: `Se ha creado la nota de despacho para ${getPharmacyName(pharmacyId)}.`,
        });

        // Reset validation state for the dispatched items
        const newValidationState = { ...validationState };
        items.forEach(item => {
            const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
            delete newValidationState[itemId];
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando módulo de despachos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Despachos</h2>
          <p className="text-muted-foreground">
            Control logístico del envío de insumos Skol a recetarios externos.
          </p>
        </div>
      </div>
      <Tabs defaultValue="prepare">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="prepare">Por Preparar ({Object.keys(itemsToDispatchGroupedByPharmacy).length})</TabsTrigger>
          <TabsTrigger value="active">Despachos Activos ({activeDispatches.length})</TabsTrigger>
          <TabsTrigger value="history">Historial ({historicalDispatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="prepare" className="mt-4">
            {Object.keys(itemsToDispatchGroupedByPharmacy).length > 0 ? (
                 <Accordion type="multiple" defaultValue={Object.keys(itemsToDispatchGroupedByPharmacy)}>
                    {Object.entries(itemsToDispatchGroupedByPharmacy).map(([pharmacyId, items]) => {
                        const allItemsValidated = items.every(item => validationState[`${item.recipe.id}-${item.inventoryItem.id}`]?.isValidated === 'valid');
                        return (
                            <AccordionItem value={pharmacyId} key={pharmacyId}>
                                <AccordionTrigger className="text-lg font-semibold">
                                    {getPharmacyName(pharmacyId)} ({items.length} ítems)
                                </AccordionTrigger>
                                <AccordionContent className="p-2 space-y-4">
                                {items.map((item) => {
                                    const itemId = `${item.recipe.id}-${item.inventoryItem.id}`;
                                    const validationStatus = validationState[itemId]?.isValidated || 'pending';
                                    
                                    return (
                                    <Card key={itemId} className={`p-4 ${validationStatus === 'valid' ? 'bg-green-50' : validationStatus === 'invalid' ? 'bg-red-50' : ''}`}>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                            <div className="md:col-span-2 space-y-1">
                                                <p className="font-bold">{item.inventoryItem.name}</p>
                                                <p className="text-sm">Receta: <span className="font-mono text-primary">{item.recipe.id}</span> ({item.recipeItem.principalActiveIngredient})</p>
                                                <p className="text-sm text-muted-foreground">Paciente: {item.patient.name}</p>
                                            </div>
                                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                               <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Lote</p>
                                                    <Select onValueChange={(lot) => handleLotChange(itemId, lot)} disabled={validationStatus === 'valid'}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar lote..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {item.inventoryItem.lots?.map(lot => (
                                                                <SelectItem key={lot.lotNumber} value={lot.lotNumber}>
                                                                    {lot.lotNumber} (Disp: {lot.quantity}, Vto: {lot.expiryDate})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                     <p className="text-xs font-medium text-muted-foreground">Escanear Producto</p>
                                                    <Input 
                                                        placeholder="Código de barras..." 
                                                        onChange={(e) => handleBarcodeInputChange(itemId, e.target.value)} 
                                                        disabled={validationStatus === 'valid'}
                                                    />
                                                </div>
                                                <Button onClick={() => handleValidateItem(item)} disabled={!validationState[itemId]?.lotNumber || validationStatus === 'valid'}>
                                                    {validationStatus === 'valid' && <CheckCircle className="mr-2 h-4 w-4" />}
                                                    {validationStatus === 'invalid' && <XCircle className="mr-2 h-4 w-4" />}
                                                    Validar
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )})}
                                <div className="flex justify-end mt-4">
                                    <Button disabled={!allItemsValidated || isDispatching} onClick={() => handleGenerateDispatchNote(pharmacyId, items)}>
                                        {isDispatching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Package className="mr-2 h-4 w-4" />
                                        Generar Nota de Despacho
                                    </Button>
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <Card className="text-center py-16 mt-4 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">Todo al día</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            No hay insumos pendientes de preparación para ser despachados.
                        </p>
                    </div>
                </Card>
            )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
             {activeDispatches.length > 0 ? (
                 <div className="space-y-4">
                    {activeDispatches.map(note => (
                         <Card key={note.id}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Nota de Despacho: {note.id}</span>
                                    <Badge variant="secondary">{getPharmacyName(note.externalPharmacyId)}</Badge>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Enviado el: {format(new Date(note.createdAt), 'dd MMMM, yyyy HH:mm', { locale: es })}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm">
                                    {note.items.map((item, index) => (
                                        <li key={index} className="flex justify-between p-2 bg-muted/50 rounded-md">
                                            <span>{item.recipeItemName} (Receta: {item.recipeId})</span>
                                            <span className="font-mono text-xs">Lote: {item.lotNumber}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex justify-end mt-4">
                                    <Button variant="outline"><Truck className="mr-2 h-4 w-4"/> Marcar como Recibido</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">Sin Despachos Activos</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Cuando se genere una nota de despacho, aparecerá aquí para su seguimiento.
                        </p>
                    </div>
                </Card>
             )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
             {historicalDispatches.length > 0 ? (
                 <div className="space-y-4">
                    {historicalDispatches.map(note => (
                         <Card key={note.id}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Nota de Despacho: {note.id}</span>
                                    <Badge variant={note.status === 'Recibido' ? 'default' : 'destructive'}>{note.status}</Badge>
                                </CardTitle>
                                 <p className="text-sm text-muted-foreground">
                                    Enviado: {format(new Date(note.createdAt), 'dd MMM yyyy')}, {note.completedAt ? `Completado: ${format(new Date(note.completedAt), 'dd MMM yyyy')}`: ''}
                                </p>
                            </CardHeader>
                             <CardContent>
                                <p className="text-sm text-muted-foreground">{note.items.length} items despachados a {getPharmacyName(note.externalPharmacyId)}.</p>
                             </CardContent>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <History className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">Sin Historial de Despachos</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Los despachos completados o cancelados aparecerán en esta sección.
                        </p>
                    </div>
                </Card>
             )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

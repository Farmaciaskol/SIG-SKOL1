
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
  getUsers
} from '@/lib/data';
import type {
  Recipe,
  Patient,
  InventoryItem,
  ExternalPharmacy,
  DispatchNote,
  DispatchItem,
  AuditTrailEntry,
  User,
  RecipeItem,
} from '@/lib/types';
import {
  RecipeStatus,
  SkolSuppliedItemsDispatchStatus,
  DispatchStatus,
} from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Package, History, PackageCheck, Loader2, Truck, AlertTriangle, Check, ShieldCheck, FileWarning, Snowflake, Printer, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

type ItemForDispatch = {
  recipe: Recipe;
  patient?: Patient;
  inventoryItem?: InventoryItem;
  recipeItem: RecipeItem;
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

const PrintableDispatchNote = ({ note, pharmacy, onClose, getInventoryItem, getPatientName }: { 
    note: DispatchNote | null; 
    pharmacy: ExternalPharmacy | undefined; 
    onClose: () => void;
    getInventoryItem: (id: string) => InventoryItem | undefined;
    getPatientName: (id: string) => string;
}) => {
    if (!note || !pharmacy) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={!!note} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <div className="printable-area bg-white text-black p-8 font-sans">
                    <header className="flex justify-between items-center border-b-2 border-black pb-4">
                        <div className="w-40 h-auto">
                            <Image
                                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                                alt="Skol Pharmacy Logo"
                                width={160}
                                height={44}
                                className="object-contain"
                            />
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-bold">NOTA DE DESPACHO</h1>
                            <p className="font-mono text-lg mt-1">Folio: {note.folio || note.id}</p>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 gap-8 my-6 text-sm">
                        <div>
                            <h2 className="font-bold mb-2">DE:</h2>
                            <p className="font-semibold">FARMACIA SKOL</p>
                            <p>Av. Irrazabal 635, local 3, Ñuñoa</p>
                            <p>Santiago, Chile</p>
                        </div>
                        <div>
                            <h2 className="font-bold mb-2">PARA:</h2>
                            <p className="font-semibold">{pharmacy.name}</p>
                            <p>{pharmacy.address || 'Dirección no especificada'}</p>
                        </div>
                    </section>
                    
                    <section className="grid grid-cols-2 gap-8 my-6 text-sm">
                        <div><span className="font-bold">Fecha de Emisión:</span> {format(parseISO(note.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</div>
                        <div><span className="font-bold">Generado por:</span> {note.dispatcherName}</div>
                    </section>

                    <section className="my-6">
                        <Table className="text-black">
                            <TableHeader className="bg-gray-100">
                                <TableRow>
                                    <TableHead className="text-black font-bold">Receta ID</TableHead>
                                    <TableHead className="text-black font-bold">Paciente</TableHead>
                                    <TableHead className="text-black font-bold">Producto (Insumo)</TableHead>
                                    <TableHead className="text-black font-bold">P. Activo</TableHead>
                                    <TableHead className="text-black font-bold">Lote</TableHead>
                                    <TableHead className="text-black font-bold text-right">Cantidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {note.items.map((item, index) => {
                                    const inventoryItem = getInventoryItem(item.inventoryItemId);
                                    return (
                                    <TableRow key={index} className="border-gray-300">
                                        <TableCell className="font-mono">{item.recipeId}</TableCell>
                                        <TableCell>{getPatientName(item.recipeId)}</TableCell>
                                        <TableCell>{inventoryItem?.name || 'N/A'}</TableCell>
                                        <TableCell>{inventoryItem?.activePrinciple || 'N/A'}</TableCell>
                                        <TableCell>{item.lotNumber}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </section>
                    
                    <footer className="mt-16 pt-8 border-t-2 border-dashed border-gray-400 flex justify-center text-center text-sm">
                        <div className="w-1/2">
                            <div className="border-b border-gray-500 w-full mb-2 h-16"></div>
                            <p className="font-bold">RECIBIDO POR</p>
                            <p>{pharmacy.name}</p>
                        </div>
                    </footer>
                </div>
                <DialogFooter className="flex justify-end gap-2 p-6 border-t no-print">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function DispatchManagementPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [externalPharmacies, setExternalPharmacies] = useState<ExternalPharmacy[]>([]);
  const [dispatchNotes, setDispatchNotes] = useState<DispatchNote[]>([]);
  const [validationState, setValidationState] = useState<ValidationState>({});
  
  // States for modals
  const [printingNote, setPrintingNote] = useState<DispatchNote | null>(null);
  const [receivingNote, setReceivingNote] = useState<DispatchNote | null>(null);

  // States for Reception Dialog
  const [receptionChecklist, setReceptionChecklist] = useState<Record<string, boolean>>({});
  const [receiverName, setReceiverName] = useState('');
  const [isConfirmingReception, setIsConfirmingReception] = useState(false);


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
        continue;
      }

      for (const recipeItem of recipe.items) {
        if (!recipeItem?.principalActiveIngredient || !recipeItem.requiresFractionation || !recipeItem.sourceInventoryItemId) continue;

        const isAlreadyInActiveDispatch = dispatchNotes.some(dn => 
            dn.status === DispatchStatus.Active &&
            dn.items.some(item => item.recipeId === recipe.id && item.recipeItemName === recipeItem.principalActiveIngredient)
        );

        if (isAlreadyInActiveDispatch) continue;
        
        const inventoryItem = inventory.find(i => i.id === recipeItem.sourceInventoryItemId);

        if (inventoryItem) {
            if (inventoryItem.quantity <= 0) {
                items.push({ recipe, patient, inventoryItem, recipeItem, error: `Stock insuficiente (0) para ${inventoryItem.name}.` });
                continue;
            }
            if (inventoryItem.itemsPerBaseUnit && inventoryItem.doseValue) {
                const recipeTotalPA = Number(recipeItem.concentrationValue) * Number(recipeItem.totalQuantityValue);
                const inventoryTotalPAperUnit = inventoryItem.doseValue * inventoryItem.itemsPerBaseUnit;

                if (isNaN(recipeTotalPA) || inventoryTotalPAperUnit <= 0) {
                    items.push({ recipe, patient, inventoryItem, recipeItem, error: 'Valores inválidos en receta o insumo para calcular fraccionamiento.' });
                } else {
                    const quantityToDispatch = Math.ceil(recipeTotalPA / inventoryTotalPAperUnit);
                    if (inventoryItem.quantity < quantityToDispatch) {
                        items.push({ recipe, patient, inventoryItem, recipeItem, quantityToDispatch, error: `Stock insuficiente. Se requieren ${quantityToDispatch}, disponibles: ${inventoryItem.quantity}.` });
                    } else {
                        items.push({ recipe, patient, inventoryItem, recipeItem, quantityToDispatch });
                    }
                }
            } else {
                 items.push({ recipe, patient, inventoryItem, recipeItem, error: 'Insumo no configurado para fraccionamiento (P.A. o Unidades/Envase).' });
            }
        } else {
            items.push({ recipe, patient, inventoryItem: undefined, recipeItem, error: 'Insumo base no encontrado en el inventario. Verifique la configuración de la receta.' });
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
        toast({ title: "Información Faltante", description: "Seleccione un lote y escanee el código de barras del producto.", variant: "destructive" });
        return;
    }

    if (state.barcodeInput === item.inventoryItem.barcode) {
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
        toast({ title: "Error de Validación", description: `El código de barras escaneado no coincide con el producto ${item.inventoryItem.name}.`, variant: "destructive" });
    }
  };

  const handleGenerateDispatchNote = async (pharmacyId: string, items: ItemForDispatch[]) => {
    if (!user) {
        toast({ title: "Error de autenticación", description: "Debe iniciar sesión para generar una nota de despacho.", variant: "destructive" });
        return;
    }
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
        
        await processDispatch(pharmacyId, dispatchItems, user.uid, user.displayName || "Usuario del Sistema");

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
  const getInventoryItem = (id: string) => inventory.find(i => i.id === id);
  const getPatientName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return 'N/A';
    return patients.find(p => p.id === recipe.patientId)?.name || 'N/A';
  }
  
  const handleOpenReceptionDialog = (note: DispatchNote) => {
    const initialChecklist = note.items.reduce((acc, item) => {
        const uniqueKey = `${item.recipeId}-${item.inventoryItemId}-${item.lotNumber}`;
        acc[uniqueKey] = false;
        return acc;
    }, {} as Record<string, boolean>);
    setReceptionChecklist(initialChecklist);
    setReceiverName('');
    setReceivingNote(note);
  };
  
  const handleReceptionChecklistChange = (itemId: string, checked: boolean) => {
    setReceptionChecklist(prev => ({ ...prev, [itemId]: checked }));
  };

  const allItemsReceived = receivingNote ? Object.keys(receptionChecklist).length > 0 && Object.values(receptionChecklist).every(Boolean) : false;
  const canConfirmReception = allItemsReceived && receiverName.trim() !== '';

  const handleConfirmReception = async () => {
    if (!db || !receivingNote || !user) return;
    setIsConfirmingReception(true);

    try {
        const batch = writeBatch(db);

        const noteRef = doc(db, 'dispatchNotes', receivingNote.id);
        batch.update(noteRef, {
            status: DispatchStatus.Received,
            completedAt: new Date().toISOString(),
            receivedByName: receiverName,
        });

        const uniqueRecipeIds = [...new Set(receivingNote.items.map(item => item.recipeId))];
        for (const recipeId of uniqueRecipeIds) {
            const recipeDocRef = doc(db, "recipes", recipeId);
            const recipeData = await getRecipe(recipeId);

            if (recipeData) {
                const newAuditEntry: AuditTrailEntry = {
                    status: RecipeStatus.Preparation,
                    date: new Date().toISOString(),
                    userId: user.uid,
                    notes: `Insumos recibidos por ${receiverName}. Despacho ID: ${receivingNote.folio || receivingNote.id}. Iniciando preparación.`
                };
                batch.update(recipeDocRef, {
                    status: RecipeStatus.Preparation,
                    auditTrail: [...(recipeData.auditTrail || []), newAuditEntry],
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
        setReceivingNote(null);
    } catch (error) {
        console.error('Failed to mark dispatch as received:', error);
        toast({
            title: 'Error',
            description: 'No se pudo actualizar el estado del despacho.',
            variant: 'destructive',
        });
    } finally {
        setIsConfirmingReception(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando módulo de despachos...</p>
      </div>
    );
  }

  return (
    <>
      <PrintableDispatchNote 
        note={printingNote}
        pharmacy={externalPharmacies.find(p => p.id === printingNote?.externalPharmacyId)}
        onClose={() => setPrintingNote(null)}
        getInventoryItem={getInventoryItem}
        getPatientName={getPatientName}
      />
      <Dialog open={!!receivingNote} onOpenChange={(open) => !open && setReceivingNote(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Confirmar Recepción de Despacho</DialogTitle>
                <DialogDescription>
                    Verifique que todos los ítems han sido recibidos y registre quién recepciona.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
                <h4 className="font-medium text-foreground">Ítems del Despacho</h4>
                <div className="space-y-3">
                    {receivingNote?.items.map(item => {
                        const uniqueKey = `${item.recipeId}-${item.inventoryItemId}-${item.lotNumber}`;
                        return (
                            <div key={uniqueKey} className="flex items-center space-x-3 p-2 bg-muted/50 rounded-md">
                                <Checkbox 
                                    id={uniqueKey}
                                    checked={receptionChecklist[uniqueKey] || false}
                                    onCheckedChange={(checked) => handleReceptionChecklistChange(uniqueKey, !!checked)}
                                />
                                <label htmlFor={uniqueKey} className="text-sm font-medium leading-none cursor-pointer">
                                   {item.quantity} x {getInventoryItem(item.inventoryItemId)?.name || 'N/A'} (Lote: {item.lotNumber})
                                </label>
                            </div>
                        )
                    })}
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label htmlFor="receiver-name" className="font-medium">Nombre de quien recibe *</Label>
                    <Input 
                        id="receiver-name"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setReceivingNote(null)}>Cancelar</Button>
                <Button onClick={handleConfirmReception} disabled={!canConfirmReception || isConfirmingReception}>
                    {isConfirmingReception && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Recepción
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Gestión de Despachos</h1>
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
                                <AccordionTrigger className="text-xl font-semibold text-foreground hover:no-underline p-6">
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
                                                        <p className="font-bold text-foreground">{item.recipeItem.principalActiveIngredient} (Receta: {item.recipe.id})</p>
                                                        <p className="text-sm text-red-700 font-semibold">{item.error || 'Error desconocido.'}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Por favor, verifique que el producto exista en el <Link href="/inventory" className="underline font-medium">inventario</Link>, tenga lotes con stock y esté correctamente configurado.</p>
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
                                                <p className="text-lg font-bold text-foreground flex items-center gap-2">
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
                                                <p className="text-sm text-muted-foreground">Receta: <span className="font-mono text-primary">{item.recipe.id}</span> ({item.recipeItem.principalActiveIngredient})</p>
                                                <p className="text-sm text-muted-foreground">Paciente: {item.patient?.name || 'Desconocido'}</p>
                                                <p className="text-base font-bold mt-1 text-foreground">Despachar: {item.quantityToDispatch} {item.inventoryItem.unit}</p>
                                            </div>
                                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                               <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Lote (FEFO)</p>
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
                                                     <p className="text-xs font-medium text-muted-foreground">Escanear Código de Barras *</p>
                                                    <Input 
                                                        placeholder="Escanear o tipear código..." 
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
                        <PackageCheck className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold text-foreground">Todo al día</h2>
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
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <CardTitle className="text-lg font-bold text-foreground">
                                      Nota de Despacho: <span className="font-mono text-primary">{note.folio || note.id}</span>
                                  </CardTitle>
                                  <Badge variant="secondary">{getPharmacyName(note.externalPharmacyId)}</Badge>
                                </div>
                                <CardDescription>
                                    Enviado el: {format(new Date(note.createdAt), 'dd MMMM, yyyy HH:mm', { locale: es })} por {note.dispatcherName}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <h4 className="text-sm font-semibold mb-2">Items Despachados:</h4>
                                <ul className="space-y-2 text-sm">
                                    {note.items.map((item, index) => (
                                        <li key={index} className="flex flex-col sm:flex-row justify-between p-2 bg-muted/50 rounded-md">
                                            <div>
                                              <span className="font-medium text-foreground">{getInventoryItem(item.inventoryItemId)?.name || 'N/A'}</span>
                                              <p className="text-xs text-muted-foreground">Receta: <Link className="font-mono text-primary hover:underline" href={`/recipes/${item.recipeId}`}>{item.recipeId}</Link></p>
                                            </div>
                                            <span className="font-mono text-xs text-muted-foreground mt-1 sm:mt-0">Lote: {item.lotNumber} | Cant: {item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                             <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                                <Button variant="outline" size="sm" onClick={() => setPrintingNote(note)}>
                                  <Printer className="mr-2 h-4 w-4"/> Imprimir
                                </Button>
                                <Button onClick={() => handleOpenReceptionDialog(note)} disabled={isConfirmingReception}>
                                    <Truck className="mr-2 h-4 w-4"/> Confirmar Recepción
                                </Button>
                             </CardFooter>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold text-foreground">Sin Despachos Activos</h2>
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
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <CardTitle className="text-lg font-bold text-foreground">
                                      Nota de Despacho: <span className="font-mono text-primary">{note.folio || note.id}</span>
                                  </CardTitle>
                                  <Badge variant={note.status === 'Recibido' ? 'default' : 'destructive'}>{note.status}</Badge>
                                </div>
                                <CardDescription>
                                    Enviado: {format(new Date(note.createdAt), 'dd MMM yyyy')}{note.completedAt ? `, Recibido: ${format(new Date(note.completedAt), 'dd MMM yyyy')}`: ''}
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-2">
                                <p className="text-sm text-muted-foreground">{note.items.length} ítem(s) despachado(s) a {getPharmacyName(note.externalPharmacyId)}.</p>
                                {note.receivedByName && (
                                    <p className="text-sm text-muted-foreground">Recibido por: <span className="font-medium text-foreground">{note.receivedByName}</span></p>
                                )}
                             </CardContent>
                              <CardFooter className="bg-muted/50 p-3 flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => setPrintingNote(note)}>
                                  <Printer className="mr-2 h-4 w-4"/> Reimprimir
                                </Button>
                             </CardFooter>
                        </Card>
                    ))}
                 </div>
             ) : (
                <Card className="text-center py-16 shadow-none border-dashed">
                    <div className="flex flex-col items-center justify-center">
                        <History className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold text-foreground">Sin Historial de Despachos</h2>
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

    
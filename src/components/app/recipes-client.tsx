

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  UserSquare,
  FileClock,
  Inbox,
  Snowflake,
  Archive,
  ClipboardCopy,
  DollarSign,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';
import {
  deleteRecipe,
  updateRecipe,
  logControlledMagistralDispensation,
  batchSendRecipesToExternal
} from '@/lib/data';
import type {
  Recipe,
  Patient,
  Doctor,
  ExternalPharmacy,
  AuditTrailEntry,
} from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { useToast } from '@/hooks/use-toast';
import { MAX_REPREPARATIONS, statusConfig } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';


// --- HELPER COMPONENTS (defined outside the main component for clarity and performance) ---

const StatCard = ({ title, value, icon: Icon, onClick, active = false }: { title: string; value: string | number; icon: React.ElementType; onClick: () => void; active?: boolean }) => (
  <Card className={cn("hover:shadow-md transition-shadow cursor-pointer", active && "ring-2 ring-primary")} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

const calculateTotalCycles = (recipe: Recipe): number => {
    if (!recipe.dueDate || !recipe.createdAt || !recipe.items?.[0]) {
      return MAX_REPREPARATIONS + 1;
    }
  
    try {
      const prescriptionLifespanInDays = differenceInDays(parseISO(recipe.dueDate), parseISO(recipe.createdAt));
      if (prescriptionLifespanInDays <= 0) return 1;
  
      const item = recipe.items[0];
      const durationValue = parseInt(item.treatmentDurationValue, 10);
      if (isNaN(durationValue)) return MAX_REPREPARATIONS + 1;
  
      let cycleDurationInDays = 0;
  
      switch (item.treatmentDurationUnit) {
        case 'días':
          cycleDurationInDays = durationValue;
          break;
        case 'semanas':
          cycleDurationInDays = durationValue * 7;
          break;
        case 'meses':
          cycleDurationInDays = durationValue * 30;
          break;
        default:
          cycleDurationInDays = 30; // Fallback for unknown units
      }
  
      if (cycleDurationInDays <= 0) return 1;
  
      const estimatedCyclesByDate = Math.floor(prescriptionLifespanInDays / cycleDurationInDays);
      const finalEstimatedCycles = Math.max(1, estimatedCyclesByDate);
      return Math.min(finalEstimatedCycles, MAX_REPREPARATIONS + 1);
    } catch (e) {
      console.error("Error calculating total cycles for recipe", recipe.id, e);
      return MAX_REPREPARATIONS + 1;
    }
};

const SendToPharmacyDialog = ({ recipe, pharmacy, patients, isOpen, onClose, onConfirm, isSubmitting }: { 
    recipe: Recipe | null; 
    pharmacy: ExternalPharmacy | undefined; 
    patients: Patient[]; 
    isOpen: boolean; 
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}) => {
    const { toast } = useToast();

    const descriptiveFilename = useMemo(() => {
        if (!recipe) return 'receta.jpg';
        const sanitize = (str: string) => str.replace(/ /g, '_').replace(/[^\w-.]/g, '');
        const patientName = sanitize(patients.find(p => p.id === recipe.patientId)?.name || 'paciente');
        const activeIngredient = sanitize(recipe.items[0]?.principalActiveIngredient || 'preparado');
        const url = recipe.prescriptionImageUrl || '';
        const extensionMatch = url.match(/\.(jpg|jpeg|png|pdf|webp)/i);
        const extension = extensionMatch ? extensionMatch[1] : 'jpg';
        return `${patientName}_${activeIngredient}.${extension}`;
    }, [recipe, patients]);

    const emailBody = useMemo(() => {
        if (!recipe || !pharmacy) return '';
        const patient = patients.find(p => p.id === recipe.patientId);
        const item = recipe.items[0];
        const safetyStockLine = item.safetyStockDays && item.safetyStockDays > 0 ? `\n- Incluye dosis de seguridad para ${item.safetyStockDays} día(s) adicional(es).` : '';
        return `Estimados ${pharmacy.name},\n\nSolicitamos la preparación del siguiente preparado magistral:\n\n- Paciente: ${patient?.name || 'N/A'}\n- Receta ID: ${recipe.id}\n- Preparado: ${item.principalActiveIngredient} ${item.concentrationValue}${item.concentrationUnit}\n- Posología: ${item.usageInstructions}\n- Cantidad a preparar: ${item.totalQuantityValue} ${item.totalQuantityUnit}${safetyStockLine}\n\nPor favor, encontrar la receta adjunta.\n\nSaludos cordiales,\nEquipo Farmacia Skol`;
    }, [recipe, pharmacy, patients]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: "El texto se ha copiado al portapapeles." });
    };

    if (!recipe || !pharmacy) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Generar Correo para Recetario</DialogTitle>
                    <DialogDescription>Copie esta información y envíela por correo a <span className="font-semibold text-primary">{pharmacy.email || 'la farmacia'}</span>.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Asunto</Label>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={`Solicitud de Preparado Magistral - Receta ${recipe.id}`} />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(`Solicitud de Preparado Magistral - Receta ${recipe.id}`)}><ClipboardCopy /></Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Cuerpo del Correo</Label>
                        <div className="relative">
                            <Textarea readOnly value={emailBody} className="h-64" />
                            <Button variant="outline" size="icon" className="absolute top-2 right-2" onClick={() => copyToClipboard(emailBody)}><ClipboardCopy /></Button>
                        </div>
                    </div>
                    {recipe.prescriptionImageUrl && (
                        <div className="space-y-2">
                            <Label>Adjunto</Label>
                            <Button variant="link" asChild className="p-0 h-auto justify-start">
                                <a href={recipe.prescriptionImageUrl} target="_blank" rel="noopener noreferrer" download={descriptiveFilename}>Descargar Imagen de la Receta</a>
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Marcar como Enviado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SendBatchDialog = ({ recipes: recipesToSend, isOpen, onClose, onConfirm, isSubmitting, getPharmacy, getPatientName }: { 
    recipes: Recipe[]; 
    isOpen: boolean; 
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    getPharmacy: (id?: string) => ExternalPharmacy | undefined;
    getPatientName: (id: string) => string;
}) => {
    const { toast } = useToast();

    const handleCopyHtml = (pharmacyName: string, recipes: Recipe[]) => {
        const getEmailHtml = () => {
            const tableRows = recipes.map(r => {
                const item = r.items[0];
                const details = item ? `${item.principalActiveIngredient} ${item.concentrationValue}${item.concentrationUnit}` : 'Preparado sin detalles';
                return `<tr><td style="padding: 5px; border: 1px solid #ddd;">${r.id}</td><td style="padding: 5px; border: 1px solid #ddd;">${getPatientName(r.patientId)}</td><td style="padding: 5px; border: 1px solid #ddd;">${details}</td></tr>`;
            }).join('');
    
            const table = `<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;"><thead><tr><th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;">Receta ID</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;">Paciente</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;">Preparado</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    
            const hasAttachments = recipes.some(r => r.prescriptionImageUrl);
            const attachmentLinks = hasAttachments ? recipes.filter(r => r.prescriptionImageUrl).map(r => `<li><a href="${r.prescriptionImageUrl}">Receta ID: ${r.id}</a></li>`).join('') : '';
            const attachmentSection = hasAttachments ? `<br><p><strong>Adjuntos:</strong></p><ul>${attachmentLinks}</ul>` : '';
    
            return `
                <p>Estimados ${pharmacyName},</p>
                <p>Solicitamos la preparación de las siguientes recetas:</p>
                ${table}
                ${attachmentSection}
                <br>
                <p>Saludos cordiales,<br/>Equipo Farmacia Skol</p>
            `;
        };
    
        const html = getEmailHtml();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const plainText = tempDiv.innerText;
    
        try {
            const blob = new Blob([html], { type: 'text/html' });
            const plainBlob = new Blob([plainText], { type: 'text/plain' });
            const item = new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob });
            navigator.clipboard.write([item]).then(() => {
                toast({ title: "Contenido del correo copiado", description: "Puede pegarlo en su cliente de correo." });
            });
        } catch (e) {
            console.error('Failed to copy rich text, falling back to plain text.', e);
            navigator.clipboard.writeText(plainText).then(() => {
                toast({ title: "Contenido del correo copiado (texto plano)", description: "Puede pegarlo en su cliente de correo." });
            });
        }
    };

    const groupedRecipes = useMemo(() => {
        if (!recipesToSend.length) return [];
        const groups: Record<string, Recipe[]> = {};
        for (const recipe of recipesToSend) {
            const id = recipe.externalPharmacyId || 'unknown';
            if (!groups[id]) {
                groups[id] = [];
            }
            groups[id].push(recipe);
        }
        return Object.entries(groups);
    }, [recipesToSend]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Generar Correos para Envío en Lote</DialogTitle>
                    <DialogDescription>
                        Se generará un correo por cada recetario. Copie la información y envíela. Luego, confirme para actualizar el estado de las recetas.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Accordion type="multiple" defaultValue={groupedRecipes.map(([id]) => id)} className="w-full">
                        {groupedRecipes.map(([pharmacyId, recipes]) => {
                            const pharmacy = getPharmacy(pharmacyId);
                            const pharmacyName = pharmacy?.name || "Recetario Desconocido";
                            const subject = `Solicitud de Preparados Magistrales - Lote ${format(new Date(), 'dd-MM-yyyy')}`;
                            const hasAttachments = recipes.some(r => r.prescriptionImageUrl);
                            
                            return (
                                <AccordionItem value={pharmacyId} key={pharmacyId}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <span>Para: {pharmacyName}</span>
                                            <Badge>{recipes.length} receta(s)</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 space-y-4">
                                        <div className="space-y-1">
                                            <Label>Destinatario</Label>
                                            <Input readOnly value={pharmacy?.email || 'No disponible'} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Asunto</Label>
                                            <Input readOnly value={subject} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Contenido del Correo</Label>
                                            <div className="p-4 border rounded-md bg-muted/30 space-y-4">
                                                <p className="text-sm">Estimados ${pharmacyName},</p>
                                                <p className="text-sm">Solicitamos la preparación de las siguientes recetas:</p>
                                                
                                                <div className="border rounded-md overflow-hidden bg-background">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Receta ID</TableHead>
                                                                <TableHead>Paciente</TableHead>
                                                                <TableHead>Preparado</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {recipes.map(r => {
                                                                const item = r.items[0];
                                                                const details = item ? `${item.principalActiveIngredient} ${item.concentrationValue}${item.concentrationUnit}` : 'Preparado sin detalles';
                                                                return (
                                                                    <TableRow key={r.id}>
                                                                        <TableCell className="font-mono">{r.id}</TableCell>
                                                                        <TableCell>{getPatientName(r.patientId)}</TableCell>
                                                                        <TableCell>{details}</TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {hasAttachments && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-semibold">Adjuntos:</p>
                                                        <ul className="list-disc list-inside text-sm space-y-1">
                                                            {recipes.filter(r => r.prescriptionImageUrl).map(r => (
                                                                <li key={r.id}>
                                                                    <a href={r.prescriptionImageUrl} target="_blank" rel="noopener noreferrer" download={`receta_${r.id}.jpg`} className="text-primary hover:underline">
                                                                        Receta ID: {r.id}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <p className="text-sm">Saludos cordiales,<br/>Equipo Farmacia Skol</p>
                                            </div>
                                            <Button variant="outline" className="w-full mt-2" onClick={() => handleCopyHtml(pharmacyName, recipes)}>
                                                <ClipboardCopy className="mr-2 h-4 w-4" />
                                                Copiar Correo Completo
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Marcar todo como Enviado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- MAIN COMPONENT ---

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
  
  const getPatientName = (patientId: string) => patients.find((p) => p.id === patientId)?.name || 'N/A';
  const getPharmacy = (pharmacyId?: string) => externalPharmacies.find((p) => p.id === pharmacyId);
  const getDoctorName = (doctorId: string) => doctors.find((d) => d.id === doctorId)?.name || 'N/A';

  useEffect(() => {
    setRecipes(initialRecipes);
    setPatients(initialPatients);
    setDoctors(initialDoctors);
    setExternalPharmacies(initialExternalPharmacies);
  }, [initialRecipes, initialPatients, initialDoctors, initialExternalPharmacies]);

  const handleUpdateStatus = async (recipe: Recipe, newStatus: RecipeStatus, notes?: string) => {
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
  
  const handleReceptionChecklistChange = (key: keyof typeof receptionChecklist, value: boolean) => {
    setReceptionChecklist(prev => ({ ...prev, [key]: value }));
  };

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
    if (!recipeToReprepare) return;
    
    if (!user) {
        toast({ title: 'Error de Autenticación', description: 'Debe iniciar sesión para realizar esta acción.', variant: 'destructive' });
        return;
    }
    
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
        auditTrail: [...(recipeToReprepare.auditTrail || []), reprepareAuditEntry]
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
  }, [recipes, searchTerm, statusFilter, doctorFilter, pharmacyFilter, dateRange, patients]);

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

  const RecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const totalCycles = calculateTotalCycles(recipe);
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;
    const cycleLimitReached = dispensedCount >= totalCycles;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${totalCycles} ciclos estimado alcanzado.`;

    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const isArchivable = [RecipeStatus.Rejected, RecipeStatus.Cancelled, RecipeStatus.Dispensed].includes(recipe.status) || isExpired;

    return (
        <div className="flex items-center justify-end gap-1">
            {recipe.status === RecipeStatus.PendingValidation && (
                <>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}>
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Validar</p></TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToReject(recipe)}>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Rechazar</p></TooltipContent></Tooltip></TooltipProvider>
                </>
            )}
            
            {recipe.status === RecipeStatus.Validated && (
                recipe.supplySource === 'Insumos de Skol' ? (
                     <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dispatch-management`}><Truck className="h-4 w-4 text-blue-600" /></Link>
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Ir a Despachos</p></TooltipContent></Tooltip></TooltipProvider>
                ) : (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToSend(recipe)}>
                            <Send className="h-4 w-4 text-cyan-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Enviar a Recetario</p></TooltipContent></Tooltip></TooltipProvider>
                )
            )}

            {recipe.status === RecipeStatus.SentToExternal && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRecipeToReceive(recipe)}>
                        <PackageCheck className="h-4 w-4 text-indigo-600" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Recepcionar Preparado</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            
             {recipe.status === RecipeStatus.ReceivedAtSkol && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}>
                        <Package className="h-4 w-4 text-orange-600" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Marcar para Retiro</p></TooltipContent></Tooltip></TooltipProvider>
            )}

            {recipe.status === RecipeStatus.ReadyForPickup && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}>
                        <CheckCheck className="h-4 w-4 text-green-600" />
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
                         <DropdownMenuItem disabled={!canReprepare} onSelect={() => canReprepare && setRecipeToReprepare(recipe)}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center w-full">
                                            <Copy className="mr-2 h-4 w-4" />
                                            <span>Re-preparar</span>
                                        </div>
                                    </TooltipTrigger>
                                    {!canReprepare && disabledReprepareTooltip && (
                                    <TooltipContent>
                                        <p>{disabledReprepareTooltip}</p>
                                    </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                         </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {isArchivable && (
                        <DropdownMenuItem className="text-gray-600 focus:text-gray-700 focus:bg-gray-100" onClick={() => setRecipeToArchive(recipe)}>
                            <Archive className="mr-2 h-4 w-4" />Archivar
                        </DropdownMenuItem>
                    )}
                    {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                        <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => setRecipeToCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular Receta</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setRecipeToDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
  };

  const MobileRecipeActions = ({ recipe }: { recipe: Recipe }) => {
    const totalCycles = calculateTotalCycles(recipe);
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;
    const cycleLimitReached = dispensedCount >= totalCycles;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${totalCycles} ciclos estimado alcanzado.`;

    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const isArchivable = [RecipeStatus.Rejected, RecipeStatus.Cancelled, RecipeStatus.Dispensed].includes(recipe.status) || isExpired;

    const ActionButton = () => {
      switch (recipe.status) {
        case RecipeStatus.PendingValidation:
          return null;
        case RecipeStatus.Validated:
          return recipe.supplySource === 'Insumos de Skol' 
            ? <Button size="sm" asChild><Link href="/dispatch-management"><Truck className="mr-2 h-4 w-4 text-white" />Ir a Despacho</Link></Button>
            : <Button size="sm" onClick={() => setRecipeToSend(recipe)}><Send className="mr-2 h-4 w-4 text-white" />Enviar</Button>;
        case RecipeStatus.SentToExternal:
          return <Button size="sm" onClick={() => setRecipeToReceive(recipe)}><PackageCheck className="mr-2 h-4 w-4 text-white" />Recepcionar</Button>;
        case RecipeStatus.ReceivedAtSkol:
          return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.ReadyForPickup)}><Package className="mr-2 h-4 w-4 text-white" />Marcar Retiro</Button>;
        case RecipeStatus.ReadyForPickup:
          return <Button size="sm" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Dispensed)}><CheckCheck className="mr-2 h-4 w-4 text-white" />Dispensar</Button>;
        case RecipeStatus.Dispensed:
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button size="sm" onClick={() => setRecipeToReprepare(recipe)} disabled={!canReprepare}>
                      <Copy className="mr-2 h-4 w-4" />Re-preparar
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canReprepare && disabledReprepareTooltip && (
                  <TooltipContent>
                    <p>{disabledReprepareTooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        default:
          return <Button size="sm" onClick={() => setRecipeToView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</Button>;
      }
    };

    return (
      <div className="flex justify-end items-center w-full gap-2">
        {recipe.status === RecipeStatus.PendingValidation ? (
          <>
            <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600 flex-1" onClick={() => setRecipeToReject(recipe)}>
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button size="sm" className="flex-1" onClick={() => handleUpdateStatus(recipe, RecipeStatus.Validated, 'Receta validada por farmacéutico.')}>
              <ShieldCheck className="mr-2 h-4 w-4 text-white" />
              Validar
            </Button>
          </>
        ) : (
          <div className="flex-1">
            <ActionButton />
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="flex-shrink-0">
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
            {recipe.status === RecipeStatus.Dispensed && (
              <DropdownMenuItem disabled={!canReprepare} onSelect={() => canReprepare && setRecipeToReprepare(recipe)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Re-preparar</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isArchivable && (
                <DropdownMenuItem className="text-gray-600 focus:text-gray-700 focus:bg-gray-100" onClick={() => setRecipeToArchive(recipe)}>
                    <Archive className="mr-2 h-4 w-4" />Archivar
                </DropdownMenuItem>
            )}
            {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
              <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => setRecipeToCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular Receta</DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setRecipeToDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight font-headline">Gestión de Recetas</h1>
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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mt-6">
        <StatCard 
          title="Pend. Validación" 
          value={stats.pendingValidation} 
          icon={FileClock}
          onClick={() => setStatusFilter(RecipeStatus.PendingValidation)}
          active={statusFilter === RecipeStatus.PendingValidation}
        />
        <StatCard 
          title="En Preparación" 
          value={stats.inPreparation} 
          icon={FlaskConical}
          onClick={() => setStatusFilter(RecipeStatus.Preparation)}
          active={statusFilter === RecipeStatus.Preparation}
        />
        <StatCard 
          title="Para Retiro" 
          value={stats.readyForPickup} 
          icon={Package}
          onClick={() => setStatusFilter(RecipeStatus.ReadyForPickup)}
          active={statusFilter === RecipeStatus.ReadyForPickup}
        />
        <StatCard 
          title="Próximas a Vencer" 
          value={stats.expiringOrExpired} 
          icon={AlertTriangle}
          onClick={() => setStatusFilter('expiring')}
          active={statusFilter === 'expiring'}
        />
        <StatCard 
          title="Rechazadas" 
          value={stats.rejected} 
          icon={XCircle}
          onClick={() => setStatusFilter(RecipeStatus.Rejected)}
          active={statusFilter === RecipeStatus.Rejected}
        />
      </div>

      <Card className="mt-6">
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
                    <SelectItem value="expiring">Próximas a Vencer</SelectItem>
                    {Object.values(RecipeStatus).filter(s => s !== RecipeStatus.PendingReviewPortal).map((status) => (
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


      {filteredRecipes.length === 0 ? (
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
            <Card className="hidden w-full md:block mt-6">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="p-4"><Checkbox onCheckedChange={toggleSelectAll} checked={allOnPageSelected} /></TableHead>
                            <TableHead>ID Receta</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Preparado</TableHead>
                            <TableHead>Fecha Creación</TableHead>
                            <TableHead>Estado / Logística</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paginatedRecipes.map((recipe) => {
                            const StatusIcon = statusConfig[recipe.status]?.icon || FileX;
                            const isPaymentPending = recipe.paymentStatus === 'Pendiente' && (recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup || recipe.status === RecipeStatus.Dispensed);
                            const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
                            const totalCycles = calculateTotalCycles(recipe);
                            const showCycleCount = ![RecipeStatus.Archived, RecipeStatus.Rejected, RecipeStatus.Cancelled].includes(recipe.status);
                            const currentCycle = Math.min(dispensedCount + 1, totalCycles);
                            return (
                                <TableRow key={recipe.id} className={cn("hover:bg-muted/50", selectedRecipes.includes(recipe.id) && "bg-muted/50")}>
                                <TableCell className="p-4"><Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)}/></TableCell>
                                <TableCell className="font-mono">
                                    <Link href={`/recipes/${recipe.id}`} className="text-muted-foreground hover:text-primary hover:underline">
                                        {recipe.id}
                                    </Link>
                                </TableCell>
                                <TableCell className="font-medium">{getPatientName(recipe.patientId)}</TableCell>
                                <TableCell className="max-w-[300px]">
                                    {recipe.items.length > 0 ? (
                                        <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground flex items-center gap-2 truncate" title={`${recipe.items[0].principalActiveIngredient} ${recipe.items[0].concentrationValue}${recipe.items[0].concentrationUnit}`}>
                                            {recipe.items[0].principalActiveIngredient}{' '}
                                            {recipe.items[0].concentrationValue}
                                            {recipe.items[0].concentrationUnit}
                                            {recipe.items.some(i => i.isRefrigerated) && <Snowflake className="h-4 w-4 text-blue-500" />}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate" title={recipe.items[0].usageInstructions}>
                                            {recipe.items[0].usageInstructions}
                                        </span>
                                        {recipe.items.length > 1 && <span className="text-xs font-bold text-muted-foreground mt-1">+ {recipe.items.length - 1} más</span>}
                                        </div>
                                    ) : ( 'N/A' )}
                                </TableCell>
                                <TableCell>{format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                    <Badge className={cn("font-normal", statusConfig[recipe.status]?.badge)}>
                                        <StatusIcon className="h-3 w-3 mr-1.5" />
                                        {statusConfig[recipe.status]?.text || recipe.status}
                                    </Badge>
                                    {showCycleCount && (
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger asChild><Badge variant="secondary" className="font-mono">{`${currentCycle}/${totalCycles}`}</Badge></TooltipTrigger>
                                            <TooltipContent><p>Ciclos de preparación (Estimado)</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                    )}
                                    {isPaymentPending && (
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger asChild><span><DollarSign className="h-5 w-5 text-amber-600" /></span></TooltipTrigger>
                                            <TooltipContent><p>Pago pendiente para esta receta.</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                    )}
                                    {recipe.status === RecipeStatus.PendingReviewPortal && (
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger asChild><span><UserSquare className="h-5 w-5 text-purple-600" /></span></TooltipTrigger>
                                            <TooltipContent><p>Receta subida desde el Portal de Pacientes</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                    )}
                                    {recipe.items.some(item => item.requiresFractionation) && (
                                        <TooltipProvider><Tooltip>
                                            <TooltipTrigger asChild><span><Split className="h-5 w-5 text-orange-600" /></span></TooltipTrigger>
                                            <TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent>
                                        </Tooltip></TooltipProvider>
                                    )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right"><RecipeActions recipe={recipe} /></TableCell>
                                </TableRow>
                            )
                        })}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter className="flex items-center justify-between px-4 py-2 border-t">
                    <div className="text-xs text-muted-foreground">{selectedRecipes.length} de {paginatedRecipes.length} fila(s) seleccionadas.</div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                        <span className="text-sm">Página {currentPage} de {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button>
                    </div>
                </CardFooter>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:hidden mt-6">
                {paginatedRecipes.map((recipe) => {
                    const isPaymentPending = recipe.paymentStatus === 'Pendiente' && (recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup || recipe.status === RecipeStatus.Dispensed);
                    const totalCycles = calculateTotalCycles(recipe);
                    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
                    const showCycleCount = ![RecipeStatus.Archived, RecipeStatus.Rejected, RecipeStatus.Cancelled].includes(recipe.status);
                    const currentCycle = Math.min(dispensedCount + 1, totalCycles);
                    return (
                    <Card key={recipe.id} className={cn(selectedRecipes.includes(recipe.id) && "ring-2 ring-primary")}>
                    <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)} className="mt-1 shrink-0"/>
                                <div className="flex-1">
                                    <CardTitle className="text-lg leading-tight">
                                        <Link href={`/patients/${recipe.patientId}`} className="hover:underline">{getPatientName(recipe.patientId)}</Link>
                                    </CardTitle>
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                        <CardDescription className="text-xs">Receta <Link href={`/recipes/${recipe.id}`} className="font-mono text-muted-foreground hover:text-primary hover:underline">{recipe.id}</Link></CardDescription>
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn("font-normal text-xs text-center whitespace-nowrap", statusConfig[recipe.status]?.badge)}>{statusConfig[recipe.status]?.text || recipe.status}</Badge>
                                            {showCycleCount && (<Badge variant="secondary" className="font-mono text-xs">{`${currentCycle}/${totalCycles}`}</Badge>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {isPaymentPending && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><DollarSign className="h-4 w-4 text-amber-600" /></span></TooltipTrigger><TooltipContent><p>Pago pendiente</p></TooltipContent></Tooltip></TooltipProvider>)}
                                {recipe.status === RecipeStatus.PendingReviewPortal && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><UserSquare className="h-4 w-4 text-purple-600" /></span></TooltipTrigger><TooltipContent><p>Receta del Portal</p></TooltipContent></Tooltip></TooltipProvider>)}
                                {recipe.items.some(item => item.requiresFractionation) && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><Split className="h-4 w-4 text-orange-600" /></span></TooltipTrigger><TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent></Tooltip></TooltipProvider>)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-2">
                        {recipe.items.length > 0 ? (
                        <div>
                            <p className="font-semibold text-foreground flex items-center gap-2" title={`${recipe.items[0].principalActiveIngredient} ${recipe.items[0].concentrationValue}${recipe.items[0].concentrationUnit}`}>{recipe.items[0].principalActiveIngredient}{' '}{recipe.items[0].concentrationValue}{recipe.items[0].concentrationUnit}{recipe.items.some(i => i.isRefrigerated) && <Snowflake className="h-4 w-4 text-blue-500" />}</p>
                            <p className="text-sm text-muted-foreground truncate" title={recipe.items[0].usageInstructions}>{recipe.items[0].usageInstructions}</p>
                            {recipe.items.length > 1 && (<p className="text-xs font-bold text-muted-foreground mt-1">+ {recipe.items.length - 1} más</p>)}
                        </div>
                        ) : (<p className="text-sm text-muted-foreground">Sin preparado</p>)}
                        <p className="text-xs text-muted-foreground pt-1">Creada: {format(new Date(recipe.createdAt), "d MMM yyyy", { locale: es })}</p>
                    </CardContent>
                    <CardFooter className="p-3 bg-muted/50"><MobileRecipeActions recipe={recipe} /></CardFooter>
                    </Card>
                )})}
            </div>
             <div className="flex items-center justify-between pt-4 md:hidden">
                <p className="text-sm text-muted-foreground">{filteredRecipes.length} resultados</p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button>
                </div>
            </div>
        </>
      )}

      {/* DIALOGS */}
      <SendToPharmacyDialog recipe={recipeToSend} pharmacy={getPharmacy(recipeToSend?.externalPharmacyId)} patients={patients} isOpen={!!recipeToSend} onClose={() => setRecipeToSend(null)} onConfirm={handleConfirmSend} isSubmitting={isSubmitting} />
      <SendBatchDialog
        recipes={recipesToSendBatch}
        isOpen={recipesToSendBatch.length > 0}
        onClose={() => setRecipesToSendBatch([])}
        onConfirm={handleConfirmBatchSend}
        isSubmitting={isSubmitting}
        getPharmacy={getPharmacy}
        getPatientName={getPatientName}
      />
      <Dialog open={!!recipeToView} onOpenChange={(open) => !open && setRecipeToView(null)}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="text-xl font-semibold">Detalle Receta: {recipeToView?.id}</DialogTitle><DialogDescription>Información completa de la receta y su historial.</DialogDescription></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1 pr-4"><div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground">Paciente:</h3><p className="text-muted-foreground">{getPatientName(recipeToView?.patientId || '')}</p></div>
                    <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground">Médico:</h3><p className="text-muted-foreground">{getDoctorName(recipeToView?.doctorId || '')}</p></div>
                    <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground">Recetario:</h3><p className="text-muted-foreground">{getPharmacy(recipeToView?.externalPharmacyId)?.name || 'N/A'}</p></div>
                    <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground">Estado Actual:</h3>{recipeToView && <Badge>{statusConfig[recipeToView.status]?.text || recipeToView.status}</Badge>}</div>
                </div>
                <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground">Items:</h3>{recipeToView?.items.map((item, index) => ( <div key={index} className="text-sm p-3 border rounded-md bg-muted/50"><p className="font-medium text-foreground flex items-center gap-2">{item.principalActiveIngredient} {item.concentrationValue}{item.concentrationUnit} {item.isRefrigerated && <Snowflake className="h-4 w-4 text-blue-500" />}</p><p className="text-muted-foreground">{item.usageInstructions}</p></div>))}</div>
                <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground">Historial de Auditoría:</h3><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{recipeToView?.auditTrail?.slice().reverse().map((entry, index) => (<TableRow key={index}><TableCell>{format(parseISO(entry.date), 'dd-MM-yy HH:mm')}</TableCell><TableCell>{statusConfig[entry.status]?.text || entry.status}</TableCell><TableCell>{entry.notes}</TableCell></TableRow>))}</TableBody></Table></div>
            </div></div><DialogFooter><Button variant="outline" onClick={() => setRecipeToView(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Estás seguro que deseas eliminar esta receta?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. La receta con ID <span className="font-bold font-mono text-foreground">{recipeToDelete?.id}</span> será eliminada permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setRecipeToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!recipeToReject} onOpenChange={(open) => {if (!open) {setRecipeToReject(null); setReason('');}}}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Rechazar Receta: {recipeToReject?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo del rechazo. Este quedará registrado en el historial de la receta.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea" className="text-sm font-medium text-foreground">Motivo del Rechazo *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Dosis inconsistente con la indicación."/></div><DialogFooter><Button variant="ghost" onClick={() => {setRecipeToReject(null); setReason('');}}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmReject} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Rechazo</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToCancel} onOpenChange={(open) => {if (!open) {setRecipeToCancel(null); setReason('');}}}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Anular Receta: {recipeToCancel?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo de la anulación. Esta acción es irreversible.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea" className="text-sm font-medium text-foreground">Motivo de la Anulación *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Solicitado por el paciente."/></div><DialogFooter><Button variant="ghost" onClick={() => {setRecipeToCancel(null); setReason('');}}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmCancel} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Anulación</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToReprepare} onOpenChange={(open) => { if (!open) { setRecipeToReprepare(null); setControlledFolio(''); } }}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Re-preparar Receta: {recipeToReprepare?.id}</DialogTitle></DialogHeader>{recipeToReprepare?.isControlled ? (<div className="space-y-4"><DialogDescription>Esta es una receta controlada. Para re-preparar, debe ingresar el folio de la nueva receta física/electrónica.</DialogDescription><div className="grid gap-2 py-2"><Label htmlFor="controlled-folio" className="mb-1 text-sm font-medium text-foreground">Nuevo Folio de Receta Controlada *</Label><Input id="controlled-folio" value={controlledFolio} onChange={(e) => setControlledFolio(e.target.value)} placeholder="Ej: A12345678"/></div></div>) : (<DialogDescription>¿Está seguro que desea iniciar un nuevo ciclo para esta receta? La receta volverá al estado 'Pendiente Validación'.</DialogDescription>)}<DialogFooter><Button variant="ghost" onClick={() => setRecipeToReprepare(null)}>Cancelar</Button><Button onClick={handleConfirmReprepare} disabled={isSubmitting || (recipeToReprepare?.isControlled && !controlledFolio.trim())}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Re-preparación</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!recipeToReceive} onOpenChange={(open) => {if (!open) { setRecipeToReceive(null); setInternalLot(''); setPreparationExpiry(undefined); setReceptionChecklist({ etiqueta: false, vencimiento: false, aspecto: false, cadenaFrio: false }); setTransportCost('0'); }}}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Recepcionar Preparado: {recipeToReceive?.id}</DialogTitle>
            <DialogDescription>Ingrese la información y complete el checklist de calidad para el preparado recibido desde el recetario externo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="internal-lot" className="text-sm font-medium text-foreground">Lote Interno Skol *</Label>
                    <Input id="internal-lot" value={internalLot} onChange={(e) => setInternalLot(e.target.value)} placeholder="Lote asignado por Skol"/>
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Fecha de Vencimiento del Preparado *</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !preparationExpiry && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {preparationExpiry ? format(preparationExpiry, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={preparationExpiry} onSelect={setPreparationExpiry} initialFocus/>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="transport-cost" className="text-sm font-medium">Costo de Despacho (CLP)</Label>
                  <Input id="transport-cost" type="number" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} placeholder="0"/>
                  <p className="text-xs text-muted-foreground mt-1">
                      Ingrese este costo solo para el <strong>primer</strong> preparado de una entrega consolidada. Deje en 0 para los demás.
                  </p>
                </div>
            </div>

            <Separator />

            <div className="space-y-4 rounded-lg">
                <h4 className="font-semibold text-foreground">Checklist de Recepción de Calidad *</h4>
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <Checkbox id="chk-etiqueta" checked={receptionChecklist.etiqueta} onCheckedChange={(checked) => handleReceptionChecklistChange('etiqueta', !!checked)} />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="chk-etiqueta" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Etiqueta Correcta</label>
                            <p className="text-sm text-muted-foreground">El nombre del paciente y principio activo coinciden.</p>
                        </div>
                    </div>
                     <div className="flex items-start space-x-3">
                        <Checkbox id="chk-vencimiento" checked={receptionChecklist.vencimiento} onCheckedChange={(checked) => handleReceptionChecklistChange('vencimiento', !!checked)} />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="chk-vencimiento" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Vencimiento y Lote Asignados</label>
                            <p className="text-sm text-muted-foreground">Se ha ingresado el lote interno y vencimiento del preparado.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <Checkbox id="chk-aspecto" checked={receptionChecklist.aspecto} onCheckedChange={(checked) => handleReceptionChecklistChange('aspecto', !!checked)} />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="chk-aspecto" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Aspecto y Envase Adecuados</label>
                            <p className="text-sm text-muted-foreground">El preparado tiene la apariencia, color y envase esperados.</p>
                        </div>
                    </div>
                    {recipeToReceive?.items.some(i => i.isRefrigerated) && (
                         <div className="flex items-start space-x-3 p-3 rounded-md bg-sky-50 border border-sky-200">
                            <Checkbox id="chk-frio" checked={receptionChecklist.cadenaFrio} onCheckedChange={(checked) => handleReceptionChecklistChange('cadenaFrio', !!checked)} />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="chk-frio" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sky-800">Cadena de Frío Verificada</label>
                                <p className="text-sm text-sky-700">El preparado se recibió y mantuvo en condiciones de refrigeración.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={() => setRecipeToReceive(null)}>Cancelar</Button>
            <Button onClick={handleConfirmReceive} disabled={!internalLot || !preparationExpiry || !isReceptionChecklistComplete || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Recepcionar
            </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!recipeToPrint} onOpenChange={(open) => !open && setRecipeToPrint(null)}><DialogContent><DialogHeader><DialogTitle className="text-xl font-semibold">Imprimir Etiqueta: {recipeToPrint?.id}</DialogTitle><DialogDescription>Vista previa de la etiqueta para el paciente.</DialogDescription></DialogHeader><div className="my-6 p-4 border rounded-lg bg-muted/50 space-y-2 font-mono text-sm"><p><span className="font-semibold">SKOL Pharmacy</span></p><p>Paciente: {getPatientName(recipeToPrint?.patientId || '')}</p><p>Receta: {recipeToPrint?.id}</p><p>Producto: {recipeToPrint?.items[0]?.principalActiveIngredient} {recipeToPrint?.items[0]?.concentrationValue}{recipeToPrint?.items[0]?.concentrationUnit}</p><p className="pt-2">Instrucciones: {recipeToPrint?.items[0]?.usageInstructions}</p><p className="pt-2">Vencimiento: {recipeToPrint?.preparationExpiryDate ? format(parseISO(recipeToPrint.preparationExpiryDate), 'dd-MM-yyyy') : 'N/A'}</p><p>Lote: {recipeToPrint?.internalPreparationLot || 'N/A'}</p></div><DialogFooter><Button variant="outline" onClick={() => setRecipeToPrint(null)}>Cerrar</Button><Button onClick={() => toast({title: 'Imprimiendo...', description: 'La funcionalidad de impresión real no está implementada.'})}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isDeleteBatchAlertOpen} onOpenChange={setIsDeleteBatchAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar {selectedRecipes.length} recetas?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Las recetas seleccionadas serán eliminadas permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBatchDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <AlertDialog open={!!recipeToArchive} onOpenChange={(open) => !open && setRecipeToArchive(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Archivar esta receta?</AlertDialogTitle>
                <AlertDialogDescription>La receta <span className="font-bold font-mono text-foreground">{recipeToArchive?.id}</span> será archivada y no aparecerá en las vistas principales. Podrá encontrarla usando el filtro de estado "Archivada".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRecipeToArchive(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmArchive} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar y Archivar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedRecipes.length > 0 && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-lg z-50 shadow-2xl">
            <CardContent className="p-3 flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{selectedRecipes.length} receta(s) seleccionada(s)</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenBatchSendDialog}>
                        <Send className="mr-2 h-4 w-4"/>
                        Enviar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Función no disponible', description: 'La exportación a CSV se implementará pronto.' })}>Exportar</Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteBatchAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </div>
            </CardContent>
        </Card>
      )}
    </>
  );
};

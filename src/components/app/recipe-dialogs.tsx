
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { statusConfig } from '@/lib/constants';
import type { Recipe, Patient, ExternalPharmacy, AuditTrailEntry } from '@/lib/types';
import { Loader2, ClipboardCopy, Calendar as CalendarIcon, Snowflake } from 'lucide-react';

// --- Type Definitions for Dialog Props ---

type SendToPharmacyDialogProps = {
  recipe: Recipe | null;
  pharmacy: ExternalPharmacy | undefined;
  patients: Patient[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
};

type SendBatchDialogProps = {
    recipes: Recipe[]; 
    isOpen: boolean; 
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    getPharmacy: (id?: string) => ExternalPharmacy | undefined;
    getPatientName: (id: string) => string;
};

type ViewRecipeDialogProps = {
    recipeToView: Recipe | null;
    getPatientName: (id: string) => string;
    getDoctorName: (id: string) => string;
    getPharmacy: (id?: string) => ExternalPharmacy | undefined;
    onOpenChange: (open: boolean) => void;
};

type RejectRecipeDialogProps = {
    recipeToReject: Recipe | null;
    reason: string;
    setReason: (reason: string) => void;
    onOpenChange: (open: boolean) => void;
    handleConfirmReject: () => void;
    isSubmitting: boolean;
};

type CancelRecipeDialogProps = {
    recipeToCancel: Recipe | null;
    reason: string;
    setReason: (reason: string) => void;
    onOpenChange: (open: boolean) => void;
    handleConfirmCancel: () => void;
    isSubmitting: boolean;
};

type ReprepareDialogProps = {
    recipeToReprepare: Recipe | null;
    onOpenChange: (open: boolean) => void;
    handleConfirmReprepare: () => void;
    isSubmitting: boolean;
    controlledFolio: string;
    setControlledFolio: (folio: string) => void;
    ReprepareMessage: React.ElementType;
};

type ReceiveDialogProps = {
    recipeToReceive: Recipe | null;
    onOpenChange: (open: boolean) => void;
    handleConfirmReceive: () => void;
    isSubmitting: boolean;
    internalLot: string;
    setInternalLot: (lot: string) => void;
    preparationExpiry?: Date;
    setPreparationExpiry: (date?: Date) => void;
    transportCost: string;
    setTransportCost: (cost: string) => void;
    receptionChecklist: { etiqueta: boolean; vencimiento: boolean; aspecto: boolean; cadenaFrio: boolean; };
    handleReceptionChecklistChange: (key: keyof ReceiveDialogProps['receptionChecklist'], value: boolean) => void;
    isReceptionChecklistComplete: boolean;
};

type PrintDialogProps = {
    recipeToPrint: Recipe | null;
    getPatientName: (id: string) => string;
    onOpenChange: (open: boolean) => void;
};

type AlertDialogProps = {
    recipe: Recipe | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    title: string;
    description: React.ReactNode;
};

type DeleteBatchAlertDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    count: number;
};

// --- Dialog Components ---

function SendToPharmacyDialog(props: SendToPharmacyDialogProps) {
    const { recipe, pharmacy, patients, isOpen, onClose, onConfirm, isSubmitting } = props;
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
    
    const subject = useMemo(() => {
        if (!recipe) return '';
        const urgencyPrefix = recipe.isUrgentRepreparation ? '[URGENTE] ' : '';
        return `${urgencyPrefix}Solicitud de Preparado Magistral - Receta ${recipe.id}`;
    }, [recipe]);

    const emailBody = useMemo(() => {
        if (!recipe || !pharmacy) return '';
        const patient = patients.find(p => p.id === recipe.patientId);
        const item = recipe.items[0];
        const safetyStockLine = item.safetyStockDays && item.safetyStockDays > 0 ? `\n- Incluye dosis de seguridad para ${item.safetyStockDays} día(s) adicional(es).` : '';
        const urgencyLine = recipe.isUrgentRepreparation ? `\n\n**NOTA URGENTE: Por favor, priorizar esta preparación. El tiempo de entrega límite es de 48 horas.**` : '';
        return `Estimados ${pharmacy.name},\n\nSolicitamos la preparación del siguiente preparado magistral:\n\n- Paciente: ${patient?.name || 'N/A'}\n- Receta ID: ${recipe.id}\n- Preparado: ${item.principalActiveIngredient} ${item.concentrationValue}${item.concentrationUnit}\n- Posología: ${item.usageInstructions}\n- Cantidad a preparar: ${item.totalQuantityValue} ${item.totalQuantityUnit}${safetyStockLine}${urgencyLine}\n\nPor favor, encontrar la receta adjunta.\n\nSaludos cordiales,\nEquipo Farmacia Skol`;
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
                            <Input readOnly value={subject} />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(subject)}><ClipboardCopy /></Button>
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

function SendBatchDialog(props: SendBatchDialogProps) {
    const { recipes: recipesToSend, isOpen, onClose, onConfirm, isSubmitting, getPharmacy, getPatientName } = props;
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

function ViewRecipeDialog(props: ViewRecipeDialogProps) {
    const { recipeToView, getPatientName, getDoctorName, getPharmacy, onOpenChange } = props;
    return (
        <Dialog open={!!recipeToView} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Detalle Receta: {recipeToView?.id}</DialogTitle>
                    <DialogDescription>Información completa de la receta y su historial.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><h3 className="text-sm font-semibold">Paciente:</h3><p>{getPatientName(recipeToView?.patientId || '')}</p></div>
                            <div><h3 className="text-sm font-semibold">Médico:</h3><p>{getDoctorName(recipeToView?.doctorId || '')}</p></div>
                            <div><h3 className="text-sm font-semibold">Recetario:</h3><p>{getPharmacy(recipeToView?.externalPharmacyId)?.name || 'N/A'}</p></div>
                            <div><h3 className="text-sm font-semibold">Estado:</h3>{recipeToView && <Badge>{statusConfig[recipeToView.status]?.text || recipeToView.status}</Badge>}</div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold">Items:</h3>
                            {recipeToView?.items.map((item, index) => (
                                <div key={index} className="text-sm p-4 border rounded-lg bg-muted/50 space-y-3">
                                    <p className="font-bold text-base text-primary flex items-center gap-2">
                                        {item.principalActiveIngredient} {item.concentrationValue}{item.concentrationUnit}
                                        {item.isRefrigerated && <Snowflake className="h-4 w-4 text-blue-500" />}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                            <p className="text-muted-foreground font-semibold">Forma Farmacéutica</p>
                                            <p className="text-foreground">{item.pharmaceuticalForm}</p>
                                        </div>
                                         <div>
                                            <p className="text-muted-foreground font-semibold">Cantidad a Preparar</p>
                                            <p className="text-foreground">{item.totalQuantityValue} {item.totalQuantityUnit}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground font-semibold">Posología</p>
                                            <p className="text-foreground">{item.dosageValue} {item.dosageUnit} cada {item.frequency} horas</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold text-sm">Instrucciones de Uso</p>
                                        <p className="text-foreground">{item.usageInstructions}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2"><h3 className="text-sm font-semibold">Historial de Auditoría:</h3><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader><TableBody>{recipeToView?.auditTrail?.slice().reverse().map((entry: AuditTrailEntry, index: number) => (<TableRow key={index}><TableCell>{format(parseISO(entry.date), 'dd-MM-yy HH:mm')}</TableCell><TableCell>{statusConfig[entry.status]?.text || entry.status}</TableCell><TableCell>{entry.notes}</TableCell></TableRow>))}</TableBody></Table></div>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RejectRecipeDialog(props: RejectRecipeDialogProps) {
    const { recipeToReject, reason, setReason, onOpenChange, handleConfirmReject, isSubmitting } = props;
    return (
        <Dialog open={!!recipeToReject} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Rechazar Receta: {recipeToReject?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo del rechazo.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea">Motivo del Rechazo *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Dosis inconsistente con la indicación."/></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmReject} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Rechazo</Button></DialogFooter></DialogContent>
        </Dialog>
    );
}

function CancelRecipeDialog(props: CancelRecipeDialogProps) {
    const { recipeToCancel, reason, setReason, onOpenChange, handleConfirmCancel, isSubmitting } = props;
    return (
        <Dialog open={!!recipeToCancel} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Anular Receta: {recipeToCancel?.id}</DialogTitle><DialogDescription>Por favor, ingrese el motivo de la anulación.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><Label htmlFor="reason-textarea">Motivo de la Anulación *</Label><Textarea id="reason-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Solicitado por el paciente."/></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmCancel} disabled={!reason.trim() || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Anulación</Button></DialogFooter></DialogContent>
        </Dialog>
    );
}

function ReprepareDialog(props: ReprepareDialogProps) {
    const { recipeToReprepare, onOpenChange, handleConfirmReprepare, isSubmitting, controlledFolio, setControlledFolio, ReprepareMessage } = props;
    return (
        <Dialog open={!!recipeToReprepare} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Re-preparar Receta: {recipeToReprepare?.id}</DialogTitle></DialogHeader>
                <div className="py-2"><ReprepareMessage /></div>
                {recipeToReprepare?.isControlled && (
                    <div className="grid gap-2 py-2"><Label htmlFor="controlled-folio">Nuevo Folio de Receta Controlada *</Label><Input id="controlled-folio" value={controlledFolio} onChange={(e) => setControlledFolio(e.target.value)} placeholder="Ej: A12345678"/></div>
                )}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmReprepare} disabled={isSubmitting || (recipeToReprepare?.isControlled && !controlledFolio.trim())}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Re-preparación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ReceiveDialog(props: ReceiveDialogProps) {
    const { recipeToReceive, onOpenChange, handleConfirmReceive, isSubmitting, internalLot, setInternalLot, preparationExpiry, setPreparationExpiry, transportCost, setTransportCost, receptionChecklist, handleReceptionChecklistChange, isReceptionChecklistComplete } = props;
    return (
        <Dialog open={!!recipeToReceive} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Recepcionar Preparado: {recipeToReceive?.id}</DialogTitle><DialogDescription>Ingrese la información y complete el checklist de calidad para el preparado recibido.</DialogDescription></DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="internal-lot">Lote Interno Skol *</Label><Input id="internal-lot" value={internalLot} onChange={(e) => setInternalLot(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Vencimiento Preparado *</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !preparationExpiry && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{preparationExpiry ? format(preparationExpiry, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={preparationExpiry} onSelect={setPreparationExpiry} initialFocus /></PopoverContent></Popover></div>
                        <div className="md:col-span-2 space-y-2"><Label htmlFor="transport-cost">Costo de Despacho (CLP)</Label><Input id="transport-cost" type="number" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} placeholder="0"/><p className="text-xs text-muted-foreground mt-1">Ingrese solo para el primer preparado de una entrega consolidada.</p></div>
                    </div>
                    <Separator />
                    <div className="space-y-4"><h4 className="font-semibold">Checklist de Recepción *</h4>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3"><Checkbox id="chk-etiqueta" checked={receptionChecklist.etiqueta} onCheckedChange={(checked) => handleReceptionChecklistChange('etiqueta', !!checked)} /><div className="grid gap-1.5 leading-none"><label htmlFor="chk-etiqueta" className="text-sm font-medium">Etiqueta Correcta</label><p className="text-sm text-muted-foreground">El nombre del paciente y principio activo coinciden.</p></div></div>
                            <div className="flex items-start space-x-3"><Checkbox id="chk-vencimiento" checked={receptionChecklist.vencimiento} onCheckedChange={(checked) => handleReceptionChecklistChange('vencimiento', !!checked)} /><div className="grid gap-1.5 leading-none"><label htmlFor="chk-vencimiento" className="text-sm font-medium">Vencimiento y Lote Asignados</label><p className="text-sm text-muted-foreground">Se ha ingresado el lote interno y vencimiento.</p></div></div>
                            <div className="flex items-start space-x-3"><Checkbox id="chk-aspecto" checked={receptionChecklist.aspecto} onCheckedChange={(checked) => handleReceptionChecklistChange('aspecto', !!checked)} /><div className="grid gap-1.5 leading-none"><label htmlFor="chk-aspecto" className="text-sm font-medium">Aspecto y Envase Adecuados</label><p className="text-sm text-muted-foreground">El preparado tiene la apariencia, color y envase esperados.</p></div></div>
                            {recipeToReceive?.items.some(i => i.isRefrigerated) && (<div className="flex items-start space-x-3 p-3 rounded-md bg-sky-50 border border-sky-200"><Checkbox id="chk-frio" checked={receptionChecklist.cadenaFrio} onCheckedChange={(checked) => handleReceptionChecklistChange('cadenaFrio', !!checked)} /><div className="grid gap-1.5 leading-none"><label htmlFor="chk-frio" className="text-sm font-medium text-sky-800">Cadena de Frío Verificada</label><p className="text-sm text-sky-700">El preparado se recibió y mantuvo en refrigeración.</p></div></div>)}
                        </div>
                    </div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleConfirmReceive} disabled={!internalLot || !preparationExpiry || !isReceptionChecklistComplete || isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Recepcionar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PrintDialog(props: PrintDialogProps) {
    const { recipeToPrint, getPatientName, onOpenChange } = props;
    const { toast } = useToast();
    return (
        <Dialog open={!!recipeToPrint} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Imprimir Etiqueta: {recipeToPrint?.id}</DialogTitle><DialogDescription>Vista previa de la etiqueta para el paciente.</DialogDescription></DialogHeader><div className="my-6 p-4 border rounded-lg bg-muted/50 space-y-2 font-mono text-sm"><p><span className="font-semibold">SKOL Pharmacy</span></p><p>Paciente: {getPatientName(recipeToPrint?.patientId || '')}</p><p>Receta: {recipeToPrint?.id}</p><p>Producto: {recipeToPrint?.items[0]?.principalActiveIngredient} {recipeToPrint?.items[0]?.concentrationValue}{recipeToPrint?.items[0]?.concentrationUnit}</p><p className="pt-2">Instrucciones: {recipeToPrint?.items[0]?.usageInstructions}</p><p className="pt-2">Vencimiento: {recipeToPrint?.preparationExpiryDate ? format(parseISO(recipeToPrint.preparationExpiryDate), 'dd-MM-yyyy') : 'N/A'}</p><p>Lote: {recipeToPrint?.internalPreparationLot || 'N/A'}</p></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button><Button onClick={() => toast({title: 'Imprimiendo...', description: 'La funcionalidad de impresión real no está implementada.'})}>Imprimir</Button></DialogFooter></DialogContent>
        </Dialog>
    );
}

function GenericAlertDialog(props: AlertDialogProps) {
    const { recipe, onOpenChange, onConfirm, isSubmitting, title, description } = props;
    return (
        <AlertDialog open={!!recipe} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DeleteBatchAlertDialog(props: DeleteBatchAlertDialogProps) {
    const { isOpen, onOpenChange, onConfirm, isSubmitting, count } = props;
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar {count} recetas?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Las recetas seleccionadas serán eliminadas permanentemente.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

type ReprepareMessageDialogProps = {
  daysSinceDispensation: number | null;
  urgencyStatus: 'early' | 'normal' | 'urgent';
};

const ReprepareMessageDialog = ({ daysSinceDispensation, urgencyStatus }: ReprepareMessageDialogProps) => {
    if (daysSinceDispensation === null) {
      return <DialogDescription>¿Está seguro que desea iniciar un nuevo ciclo para esta receta? La receta volverá al estado 'Pendiente Validación'.</DialogDescription>;
    }
    if (urgencyStatus === 'early') {
      return <p className="text-amber-600 font-semibold">Alerta: Han pasado solo {daysSinceDispensation} día(s) desde la última dispensación. ¿Continuar de todas formas?</p>;
    }
    if (urgencyStatus === 'normal') {
      return <p className="text-green-600 font-semibold">Han pasado {daysSinceDispensation} día(s). Es un buen momento para preparar el siguiente ciclo. ¿Desea continuar?</p>;
    }
    if (urgencyStatus === 'urgent') {
      return <p className="text-red-600 font-semibold">Urgente: Han pasado {daysSinceDispensation} día(s) desde la última dispensación. Esta solicitud se marcará como urgente.</p>;
    }
    return null;
};


// --- Main Exported Component ---
type RecipeDialogsProps = {
    // State and setters
    recipeToView: Recipe | null; setRecipeToView: (r: Recipe | null) => void;
    recipeToDelete: Recipe | null; setRecipeToDelete: (r: Recipe | null) => void;
    recipeToReject: Recipe | null; setRecipeToReject: (r: Recipe | null) => void;
    recipeToCancel: Recipe | null; setRecipeToCancel: (r: Recipe | null) => void;
    recipeToReprepare: Recipe | null; setRecipeToReprepare: (r: Recipe | null) => void;
    recipeToReceive: Recipe | null; setRecipeToReceive: (r: Recipe | null) => void;
    recipeToPrint: Recipe | null; setRecipeToPrint: (r: Recipe | null) => void;
    recipeToArchive: Recipe | null; setRecipeToArchive: (r: Recipe | null) => void;
    recipeToSend: Recipe | null; setRecipeToSend: (r: Recipe | null) => void;
    recipesToSendBatch: Recipe[]; setRecipesToSendBatch: (rs: Recipe[]) => void;
    isSubmitting: boolean;
    reason: string; setReason: (r: string) => void;
    controlledFolio: string; setControlledFolio: (f: string) => void;
    internalLot: string; setInternalLot: (l: string) => void;
    preparationExpiry?: Date; setPreparationExpiry: (d?: Date) => void;
    transportCost: string; setTransportCost: (c: string) => void;
    receptionChecklist: { etiqueta: boolean; vencimiento: boolean; aspecto: boolean; cadenaFrio: boolean; };
    daysSinceDispensation: number | null;
    urgencyStatus: 'early' | 'normal' | 'urgent';
    isDeleteBatchAlertOpen: boolean; setIsDeleteBatchAlertOpen: (open: boolean) => void;
    selectedRecipesCount: number;

    // Handlers
    handleConfirmSend: () => void;
    handleConfirmBatchSend: () => void;
    handleConfirmReject: () => void;
    handleConfirmCancel: () => void;
    handleConfirmReprepare: () => void;
    handleConfirmReceive: () => void;
    isReceptionChecklistComplete: boolean;
    handleConfirmArchive: () => void;
    handleConfirmDelete: () => void;
    handleBatchDelete: () => void;

    // Data getters
    patients: Patient[];
    doctors: Doctor[];
    externalPharmacies: ExternalPharmacy[];
    getPatientName: (id: string) => string;
    getDoctorName: (id: string) => string;
    getPharmacy: (id?: string) => ExternalPharmacy | undefined;
};

export function RecipeDialogs(props: RecipeDialogsProps) {
    const {
        recipeToView, setRecipeToView,
        recipeToDelete, setRecipeToDelete,
        recipeToReject, setRecipeToReject,
        recipeToCancel, setRecipeToCancel,
        recipeToReprepare, setRecipeToReprepare,
        recipeToReceive, setRecipeToReceive,
        recipeToPrint, setRecipeToPrint,
        recipeToArchive, setRecipeToArchive,
        recipeToSend, setRecipeToSend,
        recipesToSendBatch, setRecipesToSendBatch,
        isSubmitting,
        reason, setReason,
        controlledFolio, setControlledFolio,
        internalLot, setInternalLot,
        preparationExpiry, setPreparationExpiry,
        transportCost, setTransportCost,
        receptionChecklist,
        daysSinceDispensation, urgencyStatus,
        isDeleteBatchAlertOpen, setIsDeleteBatchAlertOpen,
        selectedRecipesCount,
        handleConfirmSend, handleConfirmBatchSend, handleConfirmReject,
        handleConfirmCancel, handleConfirmReprepare, handleConfirmReceive,
        isReceptionChecklistComplete, handleConfirmArchive, handleConfirmDelete, handleBatchDelete,
        patients, getPatientName, getDoctorName, getPharmacy
    } = props;

    return (
        <>
            <SendToPharmacyDialog recipe={recipeToSend} pharmacy={getPharmacy(recipeToSend?.externalPharmacyId)} patients={patients} isOpen={!!recipeToSend} onClose={() => setRecipeToSend(null)} onConfirm={handleConfirmSend} isSubmitting={isSubmitting} />
            <SendBatchDialog recipes={recipesToSendBatch} isOpen={recipesToSendBatch.length > 0} onClose={() => setRecipesToSendBatch([])} onConfirm={handleConfirmBatchSend} isSubmitting={isSubmitting} getPharmacy={getPharmacy} getPatientName={getPatientName} />
            <ViewRecipeDialog recipeToView={recipeToView} onOpenChange={(open) => !open && setRecipeToView(null)} getPatientName={getPatientName} getDoctorName={getDoctorName} getPharmacy={getPharmacy} />
            <RejectRecipeDialog recipeToReject={recipeToReject} reason={reason} setReason={setReason} onOpenChange={(open) => {if (!open) {setRecipeToReject(null); setReason('');}}} handleConfirmReject={handleConfirmReject} isSubmitting={isSubmitting} />
            <CancelRecipeDialog recipeToCancel={recipeToCancel} reason={reason} setReason={setReason} onOpenChange={(open) => {if (!open) {setRecipeToCancel(null); setReason('');}}} handleConfirmCancel={handleConfirmCancel} isSubmitting={isSubmitting} />
            <ReprepareDialog recipeToReprepare={recipeToReprepare} onOpenChange={(open) => { if (!open) { setRecipeToReprepare(null); setControlledFolio(''); } }} handleConfirmReprepare={handleConfirmReprepare} isSubmitting={isSubmitting} controlledFolio={controlledFolio} setControlledFolio={setControlledFolio} ReprepareMessage={() => <ReprepareMessageDialog daysSinceDispensation={daysSinceDispensation} urgencyStatus={urgencyStatus} />} />
            <ReceiveDialog recipeToReceive={recipeToReceive} onOpenChange={(open) => {if (!open) { setRecipeToReceive(null); setInternalLot(''); setPreparationExpiry(undefined); setReceptionChecklist({ etiqueta: false, vencimiento: false, aspecto: false, cadenaFrio: false }); setTransportCost('0'); }}} handleConfirmReceive={handleConfirmReceive} isSubmitting={isSubmitting} internalLot={internalLot} setInternalLot={setInternalLot} preparationExpiry={preparationExpiry} setPreparationExpiry={setPreparationExpiry} transportCost={transportCost} setTransportCost={setTransportCost} receptionChecklist={receptionChecklist} handleReceptionChecklistChange={(key, value) => setReceptionChecklist(prev => ({ ...prev, [key]: value }))} isReceptionChecklistComplete={isReceptionChecklistComplete} />
            <PrintDialog recipeToPrint={recipeToPrint} getPatientName={getPatientName} onOpenChange={(open) => !open && setRecipeToPrint(null)} />
            <GenericAlertDialog recipe={recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)} onConfirm={handleConfirmDelete} isSubmitting={isSubmitting} title="¿Eliminar esta receta?" description={<>Esta acción no se puede deshacer. La receta <span className="font-bold font-mono text-foreground">{recipeToDelete?.id}</span> será eliminada permanentemente.</>} />
            <GenericAlertDialog recipe={recipeToArchive} onOpenChange={(open) => !open && setRecipeToArchive(null)} onConfirm={handleConfirmArchive} isSubmitting={isSubmitting} title="¿Archivar esta receta?" description={<>La receta <span className="font-bold font-mono text-foreground">{recipeToArchive?.id}</span> será archivada y no aparecerá en las vistas principales.</>} />
            <DeleteBatchAlertDialog isOpen={isDeleteBatchAlertOpen} onOpenChange={setIsDeleteBatchAlertOpen} onConfirm={handleBatchDelete} isSubmitting={isSubmitting} count={selectedRecipesCount} />
        </>
    );
}

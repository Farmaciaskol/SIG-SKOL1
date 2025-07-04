
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getDashboardData, getMedicationInfo, sendMessageFromPatient, submitNewPrescription, requestRepreparationFromPortal } from '@/lib/patient-actions';
import { Patient, Recipe, PatientMessage, ProactivePatientStatus } from '@/lib/types';
import { Loader2, AlertTriangle, CheckCircle, Clock, FileText, Bot, Send, MessageSquare, Upload, X, Repeat, CreditCard, ChevronRight, Package, FileUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const StatusOverviewCard = ({ patient, recipes, readyForPickupCount }: { patient: Patient, recipes: Recipe[], readyForPickupCount: number }) => {
    const mainTreatment = useMemo(() => {
        const activeMagistrals = recipes.filter(r => r.status !== 'Dispensada' && r.status !== 'Anulada' && r.status !== 'Rechazada');
        return activeMagistrals.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    }, [recipes]);

    const nextDueDate = useMemo(() => {
        const dueDates = recipes
            .filter(r => r.status !== 'Dispensada' && r.dueDate && r.status !== 'Archivada' && r.status !== 'Anulada' && r.status !== 'Rechazada')
            .map(r => parseISO(r.dueDate))
            .sort((a, b) => a.getTime() - b.getTime());
        return dueDates[0];
    }, [recipes]);

    const items = [
        { icon: FileText, title: "Tratamiento Principal", value: mainTreatment?.items[0]?.principalActiveIngredient || "Ninguno", },
        { icon: Package, title: "Preparados para Retiro", value: `${readyForPickupCount} listo(s)`, },
        { icon: Clock, title: "Próximo Vencimiento Receta", value: nextDueDate ? format(nextDueDate, 'dd MMMM, yyyy', {locale: es}) : 'N/A', },
    ];
    
    const hasImportantAlert = patient.proactiveStatus === ProactivePatientStatus.URGENT || patient.proactiveStatus === ProactivePatientStatus.ATTENTION;
    
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Resumen de tu Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasImportantAlert && (
                    <div className={cn(
                        "p-3 rounded-lg border-l-4",
                        patient.proactiveStatus === ProactivePatientStatus.URGENT ? "bg-red-50 border-red-500 text-red-800" : "bg-yellow-50 border-yellow-500 text-yellow-800"
                    )}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 mt-0.5"/>
                            <div>
                                <p className="font-bold">Alerta Importante</p>
                                <p className="text-sm">{patient.proactiveMessage}</p>
                            </div>
                        </div>
                    </div>
                )}
                <ul className="divide-y">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-full">
                                   <item.icon className="h-5 w-5 text-muted-foreground"/>
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{item.title}</p>
                                    <p className="text-sm text-muted-foreground">{item.value}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

const QuickAccessListItem = ({ icon: Icon, title, description, onClick, disabled = false }: { icon: React.ElementType, title: string, description: string, onClick?: () => void, disabled?: boolean }) => (
    <li
        onClick={!disabled ? onClick : undefined}
        className={cn(
            "flex items-center justify-between py-4",
            !disabled && "cursor-pointer hover:bg-muted/50 -mx-6 px-6",
            disabled && "opacity-50"
        )}
    >
        <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-full">
                <Icon className="h-5 w-5 text-muted-foreground"/>
            </div>
            <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
        {!disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </li>
);

const PrescriptionUploadDialog = ({ isOpen, onOpenChange, patientId, onUploadSuccess, userId }: { isOpen: boolean; onOpenChange: (open: boolean) => void; patientId: string; onUploadSuccess: () => void; userId?: string; }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!imageFile) {
      toast({ title: "Error", description: "Por favor, selecciona una imagen.", variant: "destructive" });
      return;
    }
     if (!userId) {
      toast({ title: "Error de Sesión", description: "No se pudo verificar su sesión. Por favor, recargue la página.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await submitNewPrescription(patientId, imageFile, userId);
      toast({
        title: "Receta Enviada",
        description: "Hemos recibido tu receta y la procesaremos pronto.",
      });
      onOpenChange(false);
      onUploadSuccess();
    } catch (error) {
        console.error("Upload failed:", error);
        const errorMessage = error instanceof Error ? error.message : "No se pudo enviar la receta. Intente de nuevo.";
        toast({ title: "Error al Subir", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  useEffect(() => {
    if(!isOpen) {
        setPreviewImage(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar Nueva Receta</DialogTitle>
          <DialogDescription>Sube una foto clara de tu receta médica para que la procesemos.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div
            className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary relative"
            onClick={() => fileInputRef.current?.click()}
            >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
            {previewImage ? (
                <>
                <Image src={previewImage} alt="Vista previa" width={200} height={150} className="rounded-md object-contain max-h-32" />
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 rounded-full h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X className="h-4 w-4" />
                </Button>
                </>
            ) : (
                <div className="text-center">
                <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Clic o arrastra para subir</p>
                </div>
            )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={isUploading || !imageFile}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? 'Enviando...' : 'Enviar Receta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function PatientPortalDashboardPage() {
    const { patient } = usePatientAuth();
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [dashboardData, setDashboardData] = useState<{
        readyForPickup: Recipe[];
        activeMagistralRecipes: Recipe[];
        messages: PatientMessage[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const [isMedInfoOpen, setIsMedInfoOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [isRecipeManagerOpen, setIsRecipeManagerOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedMed, setSelectedMed] = useState({ name: '', info: '' });
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [isFetchingMedInfo, setIsFetchingMedInfo] = useState(false);

    const fetchData = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const data = await getDashboardData(patient.id);
            setDashboardData(data);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los datos del portal.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [patient, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleManageRecipe = (recipe: Recipe) => {
      setSelectedRecipe(recipe);
      setIsRecipeManagerOpen(true);
    };

    if (loading || !patient || !dashboardData) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Bienvenido al Portal</h1>
                <p className="text-lg text-muted-foreground">Hola, {patient.name}</p>
            </div>
            
            <StatusOverviewCard patient={patient} recipes={dashboardData.activeMagistralRecipes} readyForPickupCount={dashboardData.readyForPickup.length} />

            <Card>
                <CardHeader>
                    <CardTitle>Acceso Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="divide-y">
                        <QuickAccessListItem icon={Upload} title="Cargar Nueva Receta" description="Sube una foto de tu nueva receta médica." onClick={() => setIsUploadOpen(true)} />
                        <QuickAccessListItem icon={MessageSquare} title="Acceso a Chat con Soporte" description="Comunícate con nuestro equipo." onClick={() => setIsMessagingOpen(true)} />
                        <QuickAccessListItem icon={CreditCard} title="Consultar Saldos y Pagos" description="Esta función estará disponible próximamente." disabled={true} />
                    </ul>
                </CardContent>
            </Card>

              {/* Mis Recetas */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Mis Recetas Magistrales</CardTitle>
                  <CardDescription>Gestiona la re-preparación de tus recetas vigentes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboardData.activeMagistralRecipes.length > 0 ? (
                    <ul className="divide-y">
                        {dashboardData.activeMagistralRecipes.map(recipe => {
                            return (
                                <li key={recipe.id} className="flex items-center justify-between p-4">
                                  <div>
                                    <p className="font-semibold text-foreground">{recipe.items[0]?.principalActiveIngredient || 'Receta Magistral'}</p>
                                    <p className="text-xs text-muted-foreground">Vence: {format(parseISO(recipe.dueDate), 'dd-MM-yyyy')}</p>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => handleManageRecipe(recipe)}>Gestionar <ChevronRight className="h-4 w-4 ml-1"/></Button>
                                </li>
                            )
                        })}
                    </ul>
                  ) : (
                     <p className="p-4 text-sm text-muted-foreground">No tienes recetas magistrales activas.</p>
                  )}
                </CardContent>
              </Card>
            
            <Dialog open={isMedInfoOpen} onOpenChange={setIsMedInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Bot /> Información sobre: {selectedMed.name}</DialogTitle>
                        <DialogDescription>Generado por IA. Esto no reemplaza el consejo profesional.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 whitespace-pre-wrap">
                        {isFetchingMedInfo ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : selectedMed.info}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsMedInfoOpen(false)}>Entendido</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMessagingOpen} onOpenChange={setIsMessagingOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Mensajería Segura</DialogTitle>
                    <DialogDescription>Comunícate con nuestro equipo para dudas no urgentes.</DialogDescription>
                  </DialogHeader>
                  <SecureMessagingModal patientId={patient.id} initialMessages={dashboardData.messages} />
                </DialogContent>
            </Dialog>

            <RecipeManagementDialog
              isOpen={isRecipeManagerOpen}
              onOpenChange={setIsRecipeManagerOpen}
              recipe={selectedRecipe}
              patientId={patient.id}
              onSuccess={fetchData}
              userId={user?.uid}
            />

            <PrescriptionUploadDialog
                isOpen={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                patientId={patient.id}
                userId={user?.uid}
                onUploadSuccess={fetchData}
            />

        </div>
    );
}

const SecureMessagingModal = ({ patientId, initialMessages }: { patientId: string; initialMessages: PatientMessage[] }) => {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    React.useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsSending(true);
        try {
            const sentMessage = await sendMessageFromPatient(patientId, newMessage);
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage("");

            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: `auto-${Date.now()}`,
                    patientId,
                    content: "Hemos recibido tu mensaje. Nuestro equipo te responderá a la brevedad.",
                    sender: 'pharmacist',
                    createdAt: new Date().toISOString(),
                    read: true
                }]);
            }, 1000);

        } catch (error) {
            toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30 rounded-md">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'patient' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                           <p>{msg.content}</p>
                           <p className={`text-xs mt-1 ${msg.sender === 'patient' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(parseISO(msg.createdAt), 'HH:mm')}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 flex items-center gap-2">
                <Textarea 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Escribe tu consulta..."
                    disabled={isSending}
                />
                <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
};


function RecipeManagementDialog({ isOpen, onOpenChange, recipe, patientId, onSuccess, userId }: { isOpen: boolean; onOpenChange: (open: boolean) => void; recipe: Recipe | null; patientId: string; onSuccess: () => void; userId?: string; }) {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  
  if (!recipe) return null;

  const cycleCount = recipe.auditTrail?.filter(t => t.status === 'Dispensada').length || 0;
  const isExpired = new Date(recipe.dueDate) < new Date();
  const cycleLimitReached = cycleCount >= (MAX_REPREPARATIONS + 1);
  const canRequest = recipe.status === 'Dispensada' && !isExpired && !cycleLimitReached;

  let disabledMessage = '';
  if (isExpired) disabledMessage = 'Esta receta ha vencido. Por favor, cargue una nueva.';
  else if (cycleLimitReached) disabledMessage = 'Ha alcanzado el límite de preparaciones para esta receta.';
  else if (recipe.status !== 'Dispensada') disabledMessage = 'Ya hay una preparación en curso o pendiente para esta receta.';


  const handleRequestRepreparation = async () => {
    if (!userId) {
        toast({ title: "Error de Sesión", description: "No se pudo verificar su sesión. Por favor, recargue la página.", variant: "destructive" });
        return;
    }
    setIsRequesting(true);
    try {
      await requestRepreparationFromPortal(recipe.id, patientId, userId);
      toast({
        title: "Solicitud Enviada",
        description: "Hemos notificado a la farmacia. Recibirás una actualización cuando tu preparado esté listo.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to request repreparation:", error);
      toast({ title: "Error en la Solicitud", description: error instanceof Error ? error.message : "Ocurrió un error inesperado.", variant: "destructive" });
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar Receta</DialogTitle>
          <DialogDescription>
            Detalles de tu receta de {recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Estado Actual:</span>
            <Badge variant="secondary">{recipe.status}</Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Vencimiento Receta Original:</span>
            <span className="font-medium">{format(parseISO(recipe.dueDate), 'dd MMMM, yyyy', { locale: es })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Ciclos de Preparación Usados:</span>
            <span className="font-medium">{cycleCount} de {MAX_REPREPARATIONS + 1}</span>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Acciones</h4>
            <Button className="w-full" onClick={handleRequestRepreparation} disabled={!canRequest || isRequesting}>
              {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat className="mr-2 h-4 w-4" />}
              Solicitar Preparación de Ciclo
            </Button>
            {disabledMessage && (
              <p className="text-xs text-center text-destructive">{disabledMessage}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

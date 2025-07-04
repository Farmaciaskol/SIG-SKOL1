
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getDashboardData, getMedicationInfo, sendMessageFromPatient, submitNewPrescription, requestRepreparationFromPortal } from '@/lib/patient-actions';
import { Patient, Recipe, PatientMessage, ProactivePatientStatus } from '@/lib/types';
import { Loader2, AlertTriangle, CheckCircle, Clock, FileText, Bot, Send, MessageSquare, Upload, X, FileUp, Repeat } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

const ProactiveActionCard = ({ patient }: { patient: Patient }) => {
    const statusConfig = {
        [ProactivePatientStatus.URGENT]: {
            icon: AlertTriangle,
            color: 'text-red-600 bg-red-50 border-red-500',
            title: 'Acción Urgente Requerida'
        },
        [ProactivePatientStatus.ATTENTION]: {
            icon: Clock,
            color: 'text-yellow-600 bg-yellow-50 border-yellow-500',
            title: 'Atención Requerida'
        },
        [ProactivePatientStatus.OK]: {
            icon: CheckCircle,
            color: 'text-green-600 bg-green-50 border-green-500',
            title: 'Todo en Orden'
        }
    };

    const config = statusConfig[patient.proactiveStatus] || statusConfig[ProactivePatientStatus.OK];

    return (
        <Card className={`border-l-4 ${config.color}`}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-4">
                <config.icon className={`h-8 w-8 ${config.color.split(' ')[0]}`} />
                <div>
                    <CardTitle>{config.title}</CardTitle>
                    <CardDescription className="text-base">{patient.proactiveMessage}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    );
};

const ActionCard = ({ title, value, icon: Icon, onClick }: { title: string; value: string | number; icon: React.ElementType; onClick?: () => void }) => (
  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const PrescriptionUploadCard = ({ patientId, onUploadSuccess, userId }: { patientId: string; onUploadSuccess: () => void; userId?: string; }) => {
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
      setPreviewImage(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (error) {
        console.error("Upload failed:", error);
        const errorMessage = error instanceof Error ? error.message : "No se pudo enviar la receta. Intente de nuevo.";
        toast({ title: "Error al Subir", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="p-4">
        <CardTitle>Cargar Nueva Receta</CardTitle>
        <CardDescription>Sube una foto clara de tu receta médica para que la procesemos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center gap-4 p-4">
        <div
          className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary relative"
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
          {previewImage ? (
            <>
              <Image src={previewImage} alt="Vista previa" width={150} height={100} className="rounded-md object-contain max-h-24" />
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 rounded-full h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="text-center">
              <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Clic o arrastra para subir</p>
            </div>
          )}
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !imageFile} className="w-full md:w-auto">
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isUploading ? 'Enviando...' : 'Enviar Receta'}
        </Button>
      </CardContent>
    </Card>
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

    const handleShowMedInfo = async (medName: string) => {
        setSelectedMed({ name: medName, info: '' });
        setIsMedInfoOpen(true);
        setIsFetchingMedInfo(true);
        try {
            const result = await getMedicationInfo(medName);
            setSelectedMed({ name: medName, info: result });
        } catch (error) {
             toast({ title: "Error de IA", description: "No se pudo obtener la información.", variant: "destructive" });
             setSelectedMed({ name: medName, info: 'No se pudo cargar la información en este momento.' });
        } finally {
            setIsFetchingMedInfo(false);
        }
    };
    
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

    const { readyForPickup, activeMagistralRecipes, messages } = dashboardData;
    const unreadMessages = messages.filter(m => m.sender === 'pharmacist' && !m.read).length;
    const activeCommercialMeds = patient.commercialMedications || [];
    const allActiveTreatments = [
      ...activeMagistralRecipes.map(r => ({ type: 'magistral' as const, name: r.items[0]?.principalActiveIngredient || 'Preparado Magistral', details: r.items[0] ? `${r.items[0].concentrationValue}${r.items[0].concentrationUnit}` : '', recipe: r })),
      ...activeCommercialMeds.map(name => ({ type: 'commercial' as const, name, details: '', recipe: null }))
    ];


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Bienvenido, {patient.name}</h1>
                <p className="text-muted-foreground">Este es tu portal personal para gestionar tus tratamientos con Farmacia Skol.</p>
            </div>
            
            <ProactiveActionCard patient={patient} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ActionCard title="Preparados para Retiro" value={readyForPickup.length} icon={FileText} />
                <ActionCard title="Mensajes Nuevos" value={unreadMessages} icon={MessageSquare} onClick={() => setIsMessagingOpen(true)} />
                <PrescriptionUploadCard patientId={patient.id} onUploadSuccess={fetchData} userId={user?.uid} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mis Tratamientos */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Mis Tratamientos Activos</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {allActiveTreatments.length > 0 ? (
                    <ul className="space-y-3">
                      {allActiveTreatments.map((med, index) => (
                        <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-semibold text-foreground">{med.name}</p>
                            <p className="text-xs text-muted-foreground">{med.type === 'magistral' ? `Preparado Magistral ${med.details}`: 'Medicamento Comercial'}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleShowMedInfo(med.name)}>
                              <Bot className="mr-2 h-4 w-4"/> Más Info
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No tienes tratamientos activos registrados.</p>
                  )}
                </CardContent>
              </Card>

              {/* Mis Recetas */}
              <Card>
                <CardHeader className="p-4">
                  <CardTitle>Mis Recetas Magistrales</CardTitle>
                  <CardDescription>Gestiona la re-preparación de tus recetas vigentes.</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {activeMagistralRecipes.length > 0 ? (
                    <ul className="space-y-3">
                        {activeMagistralRecipes.map(recipe => {
                            return (
                                <li key={recipe.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div>
                                    <p className="font-semibold text-foreground">{recipe.items[0]?.principalActiveIngredient || 'Receta Magistral'}</p>
                                    <p className="text-xs text-muted-foreground">Vence: {format(parseISO(recipe.dueDate), 'dd-MM-yyyy')}</p>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => handleManageRecipe(recipe)}>Gestionar</Button>
                                </li>
                            )
                        })}
                    </ul>
                  ) : (
                     <p className="text-muted-foreground">No tienes recetas magistrales activas.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
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
                  <SecureMessagingModal patientId={patient.id} initialMessages={messages} />
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

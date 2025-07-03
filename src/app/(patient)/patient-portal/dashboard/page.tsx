
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getDashboardData, getMedicationInfo, submitPatientMessage } from '@/lib/actions';
import { Patient, Recipe, PatientMessage, ProactivePatientStatus } from '@/lib/types';
import { Loader2, AlertTriangle, CheckCircle, Clock, FileText, Bot, Send, MessageSquare, Copy, Upload, X, Image as ImageIcon, FileUp, CirclePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { submitNewPrescription } from '@/lib/actions';
import Image from 'next/image';
import React from 'react';
import { Input } from '@/components/ui/input';

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
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
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
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const PrescriptionUploadCard = ({ patientId, onUploadSuccess }: { patientId: string; onUploadSuccess: () => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!previewImage) {
      toast({ title: "Error", description: "Por favor, selecciona una imagen.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await submitNewPrescription(patientId, previewImage);
      toast({
        title: "Receta Enviada",
        description: "Hemos recibido tu receta y la procesaremos pronto.",
      });
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (error) {
      toast({ title: "Error al Subir", description: "No se pudo enviar la receta.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Cargar Nueva Receta</CardTitle>
        <CardDescription>Sube una foto clara de tu receta médica para que la procesemos.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center gap-4">
        <div
          className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary relative"
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
          {previewImage ? (
            <>
              <Image src={previewImage} alt="Vista previa" width={150} height={100} className="rounded-md object-contain max-h-24" />
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 rounded-full h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
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
        <Button onClick={handleUpload} disabled={isUploading || !previewImage} className="w-full md:w-auto">
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isUploading ? 'Enviando...' : 'Enviar Receta'}
        </Button>
      </CardContent>
    </Card>
  );
};


export default function PatientPortalDashboardPage() {
    const { patient } = usePatientAuth();
    const { toast } = useToast();
    const [dashboardData, setDashboardData] = useState<{
        readyForPickup: Recipe[];
        activeMagistralRecipes: Recipe[];
        messages: PatientMessage[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const [isMedInfoOpen, setIsMedInfoOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [selectedMed, setSelectedMed] = useState({ name: '', info: '' });
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
      ...activeMagistralRecipes.map(r => ({ type: 'magistral', name: r.items[0]?.principalActiveIngredient || 'Preparado Magistral', details: r.items[0] ? `${r.items[0].concentrationValue}${r.items[0].concentrationUnit}` : '' })),
      ...activeCommercialMeds.map(name => ({ type: 'commercial', name, details: '' }))
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
                <PrescriptionUploadCard patientId={patient.id} onUploadSuccess={fetchData} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mis Tratamientos */}
              <Card>
                <CardHeader>
                  <CardTitle>Mis Tratamientos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  {allActiveTreatments.length > 0 ? (
                    <ul className="space-y-3">
                      {allActiveTreatments.map((med, index) => (
                        <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-semibold text-slate-800">{med.name}</p>
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
                <CardHeader>
                  <CardTitle>Mis Recetas Magistrales</CardTitle>
                  <CardDescription>Aquí puedes ver la vigencia de tus recetas originales.</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeMagistralRecipes.length > 0 ? (
                    <ul className="space-y-3">
                        {activeMagistralRecipes.map(recipe => {
                            const cycleCount = recipe.auditTrail?.filter(t => t.status === 'Dispensada').length || 0;
                            return (
                                <li key={recipe.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div>
                                    <p className="font-semibold text-slate-800">{recipe.items[0]?.principalActiveIngredient || 'Receta Magistral'}</p>
                                    <p className="text-xs text-muted-foreground">Vence: {format(parseISO(recipe.dueDate), 'dd-MM-yyyy')}</p>
                                  </div>
                                  <Badge>Ciclo {cycleCount + 1}/{MAX_REPREPARATIONS + 1}</Badge>
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
            
            {/* Medication Info Modal */}
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

             {/* Secure Messaging Modal */}
            <Dialog open={isMessagingOpen} onOpenChange={setIsMessagingOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Mensajería Segura</DialogTitle>
                    <DialogDescription>Comunícate con nuestro equipo para dudas no urgentes.</DialogDescription>
                  </DialogHeader>
                  <SecureMessagingModal patientId={patient.id} initialMessages={messages} />
                </DialogContent>
            </Dialog>

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
            const sentMessage = await submitPatientMessage(patientId, newMessage);
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage("");

            // Simulate auto-reply
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

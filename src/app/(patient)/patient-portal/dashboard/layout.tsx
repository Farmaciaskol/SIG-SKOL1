
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Bell, Loader2, LogOut, User, Settings, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { PatientMessage, ProactivePatientStatus } from '@/lib/types';
import { getAvatar } from '@/components/app/predefined-avatars';
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getMessagesForPatient, markMessagesAsRead } from '@/lib/data';
import { sendMessageFromPatient } from '@/lib/patient-actions';

const SecureMessagingModal = ({ patientId, initialMessages, onMessageSent }: { patientId: string; initialMessages: PatientMessage[]; onMessageSent: (messages: PatientMessage[]) => void; }) => {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    React.useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    React.useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsSending(true);
        try {
            const sentMessage = await sendMessageFromPatient(patientId, newMessage);
            const updatedMessagesWithSent = [...messages, sentMessage];
            setMessages(updatedMessagesWithSent);
            onMessageSent(updatedMessagesWithSent);
            setNewMessage("");

            setTimeout(() => {
                const autoReply = {
                    id: `auto-${Date.now()}`,
                    patientId,
                    content: "Hemos recibido tu mensaje. Nuestro equipo te responderá a la brevedad.",
                    sender: 'pharmacist' as 'pharmacist',
                    createdAt: new Date().toISOString(),
                    read: true
                };
                const finalMessages = [...updatedMessagesWithSent, autoReply];
                setMessages(finalMessages);
                onMessageSent(finalMessages);
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


function AuthGuard({ children }: { children: React.ReactNode }) {
  const { patient, loading, logout } = usePatientAuth();
  const router = useRouter();

  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!patient) return;
    try {
      const freshMessages = await getMessagesForPatient(patient.id);
      setMessages(freshMessages);
      setUnreadCount(freshMessages.filter(m => m.sender === 'pharmacist' && !m.read).length);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los mensajes.", variant: "destructive" });
    }
  }, [patient, toast]);

  useEffect(() => {
    if (patient) {
      fetchMessages();
    }
  }, [patient, fetchMessages]);

  useEffect(() => {
    if (!loading && !patient) {
      router.push('/patient-portal/login');
    }
  }, [patient, loading, router]);
  
  const handleOpenMessaging = async () => {
    setIsMessagingOpen(true);
    if (unreadCount > 0 && patient) {
        try {
            await markMessagesAsRead(patient.id, 'patient');
            await fetchMessages(); // Refresh messages and unread count
        } catch (error) {
            toast({ title: "Error", description: "No se pudo marcar el mensaje como leído.", variant: "destructive" });
        }
    }
  };


  if (loading || !patient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  const hasAlerts = patient.proactiveStatus === ProactivePatientStatus.URGENT || patient.proactiveStatus === ProactivePatientStatus.ATTENTION;

  const DisplayAvatar = patient.avatar
    ? getAvatar(patient.avatar)
    : (
        <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
      );

  return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-8">
             <Link href="/patient-portal/dashboard">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                    alt="Skol Pharmacy Logo"
                    width={120}
                    height={33}
                    className="object-contain"
                    priority
                />
            </Link>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9" onClick={handleOpenMessaging}>
                    <MessageSquare className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0">
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Mensajería</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
                        <Bell className="h-5 w-5" />
                        {hasAlerts && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                        <span className="sr-only">Notificaciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {hasAlerts ? (
                        <DropdownMenuItem className="flex-col items-start whitespace-normal">
                             <p className="font-bold mb-1">Alerta Importante</p>
                             <p className="text-sm text-muted-foreground">{patient.proactiveMessage}</p>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem disabled>
                             <p className="text-sm text-muted-foreground p-2 text-center">No hay notificaciones nuevas.</p>
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                       <Avatar className="h-9 w-9">
                          {DisplayAvatar}
                        </Avatar>
                      <span className="sr-only">Toggle user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{patient.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/patient-portal/dashboard/profile"><User className="mr-2 h-4 w-4" />Mi Perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled><Settings className="mr-2 h-4 w-4" />Configuración</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      logout();
                      router.push('/patient-portal/login');
                    }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
        <Dialog open={isMessagingOpen} onOpenChange={setIsMessagingOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mensajería Segura</DialogTitle>
              <DialogDescription>Comunícate con nuestro equipo para dudas no urgentes.</DialogDescription>
            </DialogHeader>
            <SecureMessagingModal 
                patientId={patient.id} 
                initialMessages={messages} 
                onMessageSent={(newMsgs) => {
                    setMessages(newMsgs);
                    setUnreadCount(newMsgs.filter(m => m.sender === 'pharmacist' && !m.read).length);
                }}
            />
          </DialogContent>
        </Dialog>
      </div>
  );
}

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
}

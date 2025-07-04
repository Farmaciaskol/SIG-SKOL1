
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getAllMessages,
  getPatients,
  sendMessageFromPharmacist,
  markMessagesAsRead,
} from '@/lib/data';
import type { PatientMessage, Patient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, Search, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, parseISO, isToday, isYesterday, formatRelative } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

type Conversation = {
  patientId: string;
  patientName: string;
  patientRut?: string;
  lastMessage: PatientMessage;
  unreadCount: number;
};

const ConversationList = ({ conversations, selectedConversation, onSelect, searchTerm, setSearchTerm }: {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientRut?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por paciente..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations.map(c => (
            <div
              key={c.patientId}
              onClick={() => onSelect(c)}
              className={cn(
                "flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50",
                selectedConversation?.patientId === c.patientId && "bg-muted"
              )}
            >
              <Avatar>
                <AvatarFallback>{c.patientName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-semibold truncate">{c.patientName}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(parseISO(c.lastMessage.createdAt), new Date(), { locale: es })}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-muted-foreground truncate">{c.lastMessage.content}</p>
                  {c.unreadCount > 0 && (
                    <Badge variant="destructive" className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                      {c.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground">No se encontraron conversaciones.</div>
        )}
      </div>
    </div>
  );
};

const MessageThread = ({ conversation, messages, onSendMessage }: {
  conversation: Conversation;
  messages: PatientMessage[];
  onSendMessage: (content: string) => void;
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    await onSendMessage(newMessage);
    setNewMessage("");
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-4">
        <Avatar>
          <AvatarFallback>{conversation.patientName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <p className="font-semibold">{conversation.patientName}</p>
            <p className="text-sm text-muted-foreground">{conversation.patientRut}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'pharmacist' ? "justify-end" : "justify-start")}>
            {msg.sender === 'patient' && <Avatar className="h-8 w-8"><AvatarFallback>{conversation.patientName.charAt(0)}</AvatarFallback></Avatar>}
            <div className={cn(
                "max-w-[75%] p-3 rounded-lg",
                msg.sender === 'pharmacist' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <p className="text-sm">{msg.content}</p>
              <p className={cn("text-xs mt-1.5", msg.sender === 'pharmacist' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {format(parseISO(msg.createdAt), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background flex items-center gap-4">
        <Textarea 
          placeholder="Escriba su mensaje..." 
          className="flex-1"
          rows={1}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
          }}
          disabled={isSending}
        />
        <Button onClick={handleSend} disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
        </Button>
      </div>
    </div>
  );
};

export default function MessagingPage() {
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allMessages, setAllMessages] = useState<PatientMessage[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [messagesData, patientsData] = await Promise.all([
                getAllMessages(),
                getPatients()
            ]);
            setAllMessages(messagesData.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
            setPatients(patientsData);
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los mensajes.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const groupedMessages: Record<string, PatientMessage[]> = {};
        allMessages.forEach(msg => {
            if (!groupedMessages[msg.patientId]) {
                groupedMessages[msg.patientId] = [];
            }
            groupedMessages[msg.patientId].push(msg);
        });

        const convos: Conversation[] = Object.entries(groupedMessages).map(([patientId, messages]) => {
            const patient = patients.find(p => p.id === patientId);
            return {
                patientId,
                patientName: patient?.name || 'Paciente Desconocido',
                patientRut: patient?.rut,
                lastMessage: messages[messages.length - 1],
                unreadCount: messages.filter(m => m.sender === 'patient' && !m.read).length
            };
        }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

        setConversations(convos);

    }, [allMessages, patients]);

    const handleSelectConversation = useCallback(async (conversation: Conversation) => {
        setSelectedConversation(conversation);
        if (conversation.unreadCount > 0) {
            try {
                await markMessagesAsRead(conversation.patientId, 'pharmacist');
                await fetchData(); // Refresh data to update unread counts
            } catch (error) {
                toast({ title: "Error", description: "No se pudo marcar el mensaje como leído.", variant: "destructive" });
            }
        }
    }, [fetchData, toast]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!selectedConversation) return;

        try {
            const sentMessage = await sendMessageFromPharmacist(selectedConversation.patientId, content);
            setAllMessages(prev => [...prev, sentMessage]);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
        }
    }, [selectedConversation, toast]);

    const messagesForSelectedConversation = useMemo(() => {
        if (!selectedConversation) return [];
        return allMessages.filter(m => m.patientId === selectedConversation.patientId);
    }, [allMessages, selectedConversation]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Cargando mensajería...</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Mensajería Segura</h1>
                <p className="text-sm text-muted-foreground">
                    Comunícate directamente con los pacientes que han iniciado una conversación.
                </p>
                </div>
            </div>
            <Card className="h-[calc(100vh-200px)]">
                <CardContent className="p-0 h-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full">
                        <div className="col-span-1 h-full">
                           <ConversationList 
                             conversations={conversations}
                             selectedConversation={selectedConversation}
                             onSelect={handleSelectConversation}
                             searchTerm={searchTerm}
                             setSearchTerm={setSearchTerm}
                           />
                        </div>
                        <div className="hidden md:block md:col-span-2 lg:col-span-3 h-full">
                            {selectedConversation ? (
                                <MessageThread
                                  conversation={selectedConversation}
                                  messages={messagesForSelectedConversation}
                                  onSendMessage={handleSendMessage}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <MessageSquare className="h-16 w-16 mb-4"/>
                                    <p className="text-lg font-medium">Seleccione una conversación</p>
                                    <p className="text-sm">Elija una conversación de la lista para ver los mensajes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}

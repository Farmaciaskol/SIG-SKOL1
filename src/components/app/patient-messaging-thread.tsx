
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getMessagesForPatient, markMessagesAsRead } from '@/lib/data';
import { sendMessageFromPatient } from '@/lib/patient-actions';
import type { PatientMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatar } from '@/components/app/predefined-avatars';

export const PatientMessagingThread = () => {
    const { patient, firebaseUser } = usePatientAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<PatientMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const fetchMessages = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const freshMessages = await getMessagesForPatient(patient.id);
            setMessages(freshMessages);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudieron cargar los mensajes.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [patient, toast]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!patient || !newMessage.trim()) return;
        setIsSending(true);
        try {
            await sendMessageFromPatient(patient.id, newMessage);
            setNewMessage('');
            await fetchMessages(); // Refresh messages after sending
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo enviar el mensaje.', variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    };
    
    const DisplayAvatar = patient?.avatar ? getAvatar(patient.avatar) : (<AvatarFallback>{patient?.name.charAt(0)}</AvatarFallback>);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex items-end gap-2', msg.sender === 'patient' ? 'justify-end' : 'justify-start')}>
                        {msg.sender === 'pharmacist' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>F</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn('max-w-[80%] p-3 rounded-lg', msg.sender === 'patient' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={cn('text-xs mt-1.5', msg.sender === 'patient' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                {format(parseISO(msg.createdAt), 'HH:mm')}
                            </p>
                        </div>
                         {msg.sender === 'patient' && (
                            <Avatar className="h-8 w-8">
                                {DisplayAvatar}
                            </Avatar>
                        )}
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
                    <span className="sr-only">Enviar</span>
                </Button>
            </div>
        </div>
    );
};

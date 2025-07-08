'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bell, Loader2, LogOut, User, Settings, MessageSquare, Send, Home, FileText, Pill, UserCircle, ShoppingBag, History } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getMessagesForPatient, markMessagesAsRead } from '@/lib/data';
import { sendMessageFromPatient } from '@/lib/patient-actions';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { PatientMessagingThread } from '@/components/app/patient-messaging-thread';


const BottomNavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: React.ElementType, label: string, isActive: boolean }) => (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 text-xs w-full">
        <Icon className={cn("h-6 w-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground')} />
        <span className={cn("transition-colors", isActive ? 'text-primary font-bold' : 'text-muted-foreground')}>{label}</span>
    </Link>
)

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { patient, loading, logout } = usePatientAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { toast } = useToast();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    : ( <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback> );

  const navItems = [
      { href: '/patient-portal/dashboard', icon: Home, label: 'Inicio' },
      { href: '/patient-portal/dashboard/new-order', icon: ShoppingBag, label: 'Pedir' },
      { href: '/patient-portal/dashboard/orders', icon: History, label: 'Mis Pedidos' },
      { href: '/patient-portal/dashboard/profile', icon: UserCircle, label: 'Mi Perfil' },
  ];

  return (
      <div className="min-h-screen bg-muted/40 pb-20 md:pb-0">
        {/* --- Header --- */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-8">
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
                <Sheet open={isMessagingOpen} onOpenChange={setIsMessagingOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9" onClick={handleOpenMessaging}>
                        <MessageSquare className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0">
                                {unreadCount}
                            </Badge>
                        )}
                        <span className="sr-only">Mensajería</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="p-0 flex flex-col">
                     <SheetHeader className="p-6 pb-4 border-b">
                        <SheetTitle>Mensajería Segura</SheetTitle>
                        <SheetDescription>Comunícate con nuestro equipo para dudas no urgentes.</SheetDescription>
                    </SheetHeader>
                    <PatientMessagingThread />
                  </SheetContent>
                </Sheet>
                
                <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                  <SheetTrigger asChild>
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
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Notificaciones</SheetTitle>
                    </SheetHeader>
                     <div className="py-4">
                        {hasAlerts ? (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                                 <p className="font-bold mb-1 text-yellow-800">Alerta Importante</p>
                                 <p className="text-sm text-yellow-700">{patient.proactiveMessage}</p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <p>No hay notificaciones nuevas.</p>
                            </div>
                        )}
                     </div>
                  </SheetContent>
                </Sheet>
                
                 <Avatar className="h-9 w-9 border-2 border-primary/20">
                    {DisplayAvatar}
                </Avatar>
            </div>
        </header>
        
        {/* --- Main Content --- */}
        <main className="p-4 md:p-8">{children}</main>
        
        {/* --- Bottom Navigation --- */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40 md:hidden">
            <div className="flex items-center justify-around h-full">
                {navItems.map(item => (
                    <BottomNavItem key={item.href} {...item} isActive={pathname === item.href} />
                ))}
            </div>
        </nav>
      </div>
  );
}

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
}

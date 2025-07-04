
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bell, Loader2, LogOut, User, Settings } from 'lucide-react';
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
import { ProactivePatientStatus } from '@/lib/types';
import { getAvatar } from '@/components/app/predefined-avatars';


function AuthGuard({ children }: { children: React.ReactNode }) {
  const { patient, loading, logout } = usePatientAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !patient) {
      router.push('/patient-portal/login');
    }
  }, [patient, loading, router]);

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
      </div>
  );
}

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
}

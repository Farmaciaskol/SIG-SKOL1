
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, LogOut, User, Settings } from 'lucide-react';
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

  return (
      <div className="min-h-screen bg-muted/40">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-8">
             <Link href="/patient-portal/dashboard">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                    alt="Skol Pharmacy Logo"
                    width={100}
                    height={28}
                    priority
                />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
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
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
  );
}

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
}

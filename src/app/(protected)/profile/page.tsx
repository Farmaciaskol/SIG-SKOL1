
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getUsers, getRoles } from '@/lib/data';
import type { User, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Mail, Shield } from 'lucide-react';

export default function ProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.email) {
        try {
          const [allUsers, allRoles] = await Promise.all([getUsers(), getRoles()]);
          const foundUser = allUsers.find(u => u.email === user.email);
          if (foundUser) {
            setAppUser(foundUser);
            const role = allRoles.find(r => r.id === foundUser.roleId);
            setUserRole(role?.name || 'Rol no definido');
          } else {
             toast({ title: 'Error', description: 'No se encontró el perfil de usuario en la base de datos.', variant: 'destructive' });
          }
        } catch (error) {
           toast({ title: 'Error', description: 'No se pudieron cargar los datos del perfil.', variant: 'destructive' });
        }
      }
      setLoading(false);
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading, toast]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
         <h2 className="text-xl font-semibold">Perfil no encontrado</h2>
         <p className="text-muted-foreground mt-2">No se pudo cargar la información del perfil del usuario.</p>
         <Button asChild className="mt-4"><Link href="/dashboard">Volver al Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline">Mi Perfil</h1>
          <p className="text-muted-foreground">Tu información de usuario en el sistema.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
            <Avatar className="w-24 h-24 text-3xl mb-4">
                <AvatarFallback>{appUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{appUser.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-4 text-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">{appUser.email}</span>
            </div>
            <div className="flex items-center gap-4 text-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">{userRole}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

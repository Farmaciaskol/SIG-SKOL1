
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getUsers, getRoles, updateUser } from '@/lib/data';
import type { User, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Mail, Shield, Save, Palette } from 'lucide-react';
import { PREDEFINED_AVATARS, getAvatar } from '@/components/app/predefined-avatars';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PlaceholderUserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="9" r="4" />
    <path d="M12 14c-3.866 0-7 3.134-7 7v1h14v-1c0-3.866-3.134-7-7-7z" />
  </svg>
);

export default function ProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchUserData = useCallback(async () => {
    if (user?.email) {
      setLoading(true);
      try {
        const [allUsers, allRoles] = await Promise.all([getUsers(), getRoles()]);
        const foundUser = allUsers.find(u => u.email === user.email);
        if (foundUser) {
          setAppUser(foundUser);
          setSelectedAvatar(foundUser.avatar);
          const role = allRoles.find(r => r.id === foundUser.roleId);
          setUserRole(role?.name || 'Rol no definido');
        } else {
           toast({ title: 'Error', description: 'No se encontró el perfil de usuario en la base de datos.', variant: 'destructive' });
        }
      } catch (error) {
         toast({ title: 'Error', description: 'No se pudieron cargar los datos del perfil.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, toast]);


  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  
  const handleSaveAvatar = async () => {
    if (!appUser || selectedAvatar === undefined) return;
    setIsSaving(true);
    try {
        await updateUser(appUser.id, { avatar: selectedAvatar });
        toast({ title: 'Avatar Actualizado', description: 'Tu nuevo avatar ha sido guardado.' });
        setIsAvatarDialogOpen(false);
        await fetchUserData(); // Refresh user data to show new avatar everywhere
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));
    } catch(error) {
        toast({ title: 'Error', description: 'No se pudo guardar el avatar.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };


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
  
  const DisplayAvatar = appUser.avatar
    ? getAvatar(appUser.avatar)
    : (
        <AvatarFallback className="bg-primary text-primary-foreground">
            <PlaceholderUserIcon className="h-12 w-12" />
        </AvatarFallback>
      );

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
            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                <div className="relative group">
                    <Avatar className="w-24 h-24 text-3xl mb-4">
                        {DisplayAvatar}
                    </Avatar>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="absolute bottom-4 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Palette className="mr-2 h-4 w-4"/> Cambiar
                        </Button>
                    </DialogTrigger>
                </div>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Elige tu Avatar</DialogTitle>
                        <DialogDescription>Selecciona una imagen de la lista para personalizar tu perfil.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                        {Object.entries(PREDEFINED_AVATARS).map(([id, svg]) => (
                            <div
                                key={id}
                                onClick={() => setSelectedAvatar(id)}
                                className={cn(
                                    "p-2 border-2 rounded-lg cursor-pointer transition-all",
                                    selectedAvatar === id ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-muted-foreground/50"
                                )}
                            >
                            <div className="aspect-square">{svg}</div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAvatarDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveAvatar} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Save className="mr-2 h-4 w-4"/>
                            Guardar Avatar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

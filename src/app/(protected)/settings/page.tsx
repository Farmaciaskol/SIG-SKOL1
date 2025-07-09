'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getAppSettings, updateAppSettings, getUsers, getRoles, deleteUser } from '@/lib/data';
import type { AppSettings, User, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Save, X, MoreHorizontal, Pencil, Trash2, Search, Users, Shield, Settings } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatar } from '@/components/app/predefined-avatars';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { RoleManagerDialog } from '@/components/app/role-manager-dialog';
import { UserFormDialog } from '@/components/app/user-form-dialog';
import { cn } from '@/lib/utils';

// ===== AppSettingsTab Component and its helpers =====

const SettingsListEditor = ({
  title,
  values,
  onAdd,
  onRemove,
}: {
  title: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {values.map((value, index) => (
            <Badge key={index} variant="secondary" className="text-sm font-normal py-1 pr-1">
              {value}
              <button onClick={() => onRemove(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Añadir nuevo valor..."
          />
          <Button type="button" size="icon" onClick={handleAdd}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


const AppSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<AppSettings>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAppSettings();
      if (data) setSettings(data);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las configuraciones.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateList = (key: keyof AppSettings, newList: string[]) => {
      setSettings(prev => ({...prev, [key]: newList }));
  };
  
  const handleSaveSettings = async () => {
      setIsSaving(true);
      try {
          await updateAppSettings(settings);
          toast({ title: 'Configuración Guardada', description: 'Los cambios han sido guardados exitosamente.' });
          fetchData();
      } catch(error) {
          toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
      } finally {
          setIsSaving(false);
      }
  };

  if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Cargando configuraciones...</p>
        </div>
      );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsListEditor 
          title="Formas Farmacéuticas"
          values={settings.pharmaceuticalForms || []}
          onAdd={(val) => handleUpdateList('pharmaceuticalForms', [...(settings.pharmaceuticalForms || []), val])}
          onRemove={(index) => handleUpdateList('pharmaceuticalForms', (settings.pharmaceuticalForms || []).filter((_, i) => i !== index))}
        />
         <SettingsListEditor 
          title="Unidades de Concentración"
          values={settings.concentrationUnits || []}
          onAdd={(val) => handleUpdateList('concentrationUnits', [...(settings.concentrationUnits || []), val])}
          onRemove={(index) => handleUpdateList('concentrationUnits', (settings.concentrationUnits || []).filter((_, i) => i !== index))}
        />
         <SettingsListEditor 
          title="Unidades de Dosis"
          values={settings.dosageUnits || []}
          onAdd={(val) => handleUpdateList('dosageUnits', [...(settings.dosageUnits || []), val])}
          onRemove={(index) => handleUpdateList('dosageUnits', (settings.dosageUnits || []).filter((_, i) => i !== index))}
        />
         <SettingsListEditor 
          title="Unidades de Duración de Tratamiento"
          values={settings.treatmentDurationUnits || []}
          onAdd={(val) => handleUpdateList('treatmentDurationUnits', [...(settings.treatmentDurationUnits || []), val])}
          onRemove={(index) => handleUpdateList('treatmentDurationUnits', (settings.treatmentDurationUnits || []).filter((_, i) => i !== index))}
        />
         <SettingsListEditor 
          title="Unidades de Cantidad a Preparar"
          values={settings.quantityToPrepareUnits || []}
          onAdd={(val) => handleUpdateList('quantityToPrepareUnits', [...(settings.quantityToPrepareUnits || []), val])}
          onRemove={(index) => handleUpdateList('quantityToPrepareUnits', (settings.quantityToPrepareUnits || []).filter((_, i) => i !== index))}
        />
      </div>
       <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios Generales
            </Button>
        </div>
    </div>
  );
};


// ===== User Management Tab Components and its helpers =====

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-foreground">{value}</div>
        </CardContent>
    </Card>
);

const PlaceholderUserIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="9" r="4" />
      <path d="M12 14c-3.866 0-7 3.134-7 7v1h14v-1c0-3.866-3.134-7-7-7z" />
    </svg>
);

const UserActions = ({ user, onEdit, onDelete }: { user: User, onEdit: (u: User) => void, onDelete: (u: User) => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Menú</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);


const UserManagementTab = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
        const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
        setUsers(usersData);
        setRoles(rolesData);
        } catch (error) {
        console.error("Failed to fetch user management data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de usuarios.', variant: 'destructive' });
        } finally {
        setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleOpenUserForm = (user: User | null) => {
        setEditingUser(user);
        setIsUserFormOpen(true);
    }
    
    const onUserFormSuccess = () => {
        setIsUserFormOpen(false);
        fetchData();
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
        await deleteUser(userToDelete.id);
        toast({ title: 'Usuario Eliminado', description: `${userToDelete.name} ha sido eliminado.` });
        setUserToDelete(null);
        fetchData();
        } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar el usuario.', variant: 'destructive' });
        }
    }

    const getRoleName = (roleId: string) => {
        return roles.find(r => r.id === roleId)?.name || 'Sin Rol';
    };
    
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando usuarios...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <StatCard title="Total de Usuarios" value={users.length} icon={Users} />
                <StatCard title="Roles Definidos" value={roles.length} icon={Shield} />
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre o email..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" onClick={() => setIsRoleManagerOpen(true)}>
                    <Shield className="mr-2 h-4 w-4"/> Gestionar Roles
                </Button>
                <Button onClick={() => handleOpenUserForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="text-right">
                                <span className="sr-only">Acciones</span>
                            </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => {
                                const UserAvatar = getAvatar(user.avatar);
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    {UserAvatar ? UserAvatar : <AvatarFallback><PlaceholderUserIcon className="h-5 w-5"/></AvatarFallback>}
                                                </Avatar>
                                                <span>{user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                        <Badge variant="secondary">{getRoleName(user.roleId)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <UserActions user={user} onEdit={handleOpenUserForm} onDelete={setUserToDelete} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <UserFormDialog 
                user={editingUser}
                roles={roles}
                isOpen={isUserFormOpen}
                onOpenChange={setIsUserFormOpen}
                onSuccess={onUserFormSuccess}
            />
            
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al usuario <span className="font-bold">{userToDelete?.name}</span> del sistema.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <RoleManagerDialog roles={roles} isOpen={isRoleManagerOpen} onOpenChange={setIsRoleManagerOpen} onSuccess={fetchData} />
        </div>
    );
};


// ===== Main Page Component =====

const settingsNav = [
  { name: 'General', href: '/settings?tab=general', tab: 'general', icon: Settings },
  { name: 'Usuarios y Roles', href: '/settings?tab=users', tab: 'users', icon: Users },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Gestione la configuración general, usuarios y roles del sistema.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <nav className="lg:col-span-1">
          <ul className="space-y-1">
            {settingsNav.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    activeTab === item.tab
                      ? 'bg-secondary text-secondary-foreground'
                      : 'hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-4">
          <Card>
            <CardContent className="p-6">
              {activeTab === 'general' && <AppSettingsTab />}
              {activeTab === 'users' && <UserManagementTab />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

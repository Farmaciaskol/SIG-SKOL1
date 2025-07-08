

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAppSettings, updateAppSettings, getUsers, getRoles, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole } from '@/lib/data';
import type { AppSettings, User, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Save, X, MoreHorizontal, Pencil, Trash2, Search, Users, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERMISSIONS } from '@/lib/constants';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatar } from '@/components/app/predefined-avatars';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const userFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  roleId: z.string().min(1, { message: 'Debe seleccionar un rol.' }),
});
type UserFormValues = z.infer<typeof userFormSchema>;

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

const PERMISSION_GROUP_TRANSLATIONS: Record<string, string> = {
  RECIPES: 'Recetas',
  PATIENTS: 'Pacientes',
  USERS: 'Usuarios',
  SETTINGS: 'Configuración',
};

const PERMISSION_ACTION_TRANSLATIONS: Record<string, string> = {
  CREATE: 'Crear',
  READ: 'Leer / Ver',
  UPDATE: 'Actualizar / Editar',
  DELETE: 'Eliminar',
  VALIDATE: 'Validar',
};

const RoleManagerDialog = ({ roles, isOpen, onOpenChange, onSuccess }: {
    roles: Role[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) => {
    const { toast } = useToast();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
    const [editedName, setEditedName] = useState('');
    const [newRoleName, setNewRoleName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    useEffect(() => {
        if (selectedRole) {
            setEditedName(selectedRole.name);
            setEditedPermissions(selectedRole.permissions);
        } else {
            setEditedName('');
            setEditedPermissions([]);
        }
    }, [selectedRole]);

    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setEditedPermissions(prev =>
            checked ? [...prev, permissionId] : prev.filter(p => p !== permissionId)
        );
    };

    const handleSave = async () => {
        if (!selectedRole && !newRoleName.trim()) {
            toast({ title: 'Error', description: 'El nombre del nuevo rol no puede estar vacío.', variant: 'destructive' });
            return;
        }
        if (selectedRole && !editedName.trim()) {
            toast({ title: 'Error', description: 'El nombre del rol no puede estar vacío.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            if (selectedRole) {
                await updateRole(selectedRole.id, { name: editedName, permissions: editedPermissions });
                toast({ title: 'Rol Actualizado', description: `Se guardaron los cambios para el rol ${editedName}.` });
            } else {
                const newRoleId = await addRole({ name: newRoleName, permissions: editedPermissions });
                toast({ title: 'Rol Creado', description: `Se ha creado el rol ${newRoleName}.` });
                setNewRoleName('');
            }
            onSuccess();
        } catch (error) {
            toast({ title: 'Error', description: `No se pudo guardar el rol. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!roleToDelete) return;
        setIsSaving(true);
        try {
            await deleteRole(roleToDelete.id);
            toast({ title: 'Rol Eliminado', description: `El rol ${roleToDelete.name} ha sido eliminado.` });
            setSelectedRole(null);
            onSuccess();
        } catch (error) {
            toast({ title: 'Error', description: `No se pudo eliminar el rol. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
            setRoleToDelete(null);
        }
    }

    const currentRoleName = selectedRole ? editedName : newRoleName;
    const currentPermissions = editedPermissions;
    const canSave = selectedRole ? (selectedRole.name !== editedName || JSON.stringify(selectedRole.permissions) !== JSON.stringify(editedPermissions)) : newRoleName.trim() !== '';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Gestionar Roles y Permisos</DialogTitle>
                    <DialogDescription>Cree, edite o elimine roles, y asigne permisos específicos para cada uno.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
                    <Card className="md:col-span-1 flex flex-col">
                        <CardHeader className="p-4 border-b">
                            <h3 className="text-lg font-semibold">Roles</h3>
                        </CardHeader>
                        <CardContent className="p-2 flex-1 overflow-y-auto">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={cn("w-full text-left p-2 rounded-md hover:bg-muted", selectedRole?.id === role.id && "bg-muted font-semibold")}
                                >
                                    {role.name}
                                </button>
                            ))}
                        </CardContent>
                        <CardFooter className="p-2 border-t">
                            <Button variant="outline" className="w-full" onClick={() => setSelectedRole(null)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Nuevo Rol
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="md:col-span-2 flex flex-col">
                        <CardHeader className="p-4 border-b">
                            {selectedRole ? (
                                <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="text-lg font-semibold h-9" />
                            ) : (
                                <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nombre del Nuevo Rol..." className="text-lg font-semibold h-9" />
                            )}
                        </CardHeader>
                        <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
                            <h4 className="font-medium text-foreground">Permisos</h4>
                            {Object.entries(PERMISSIONS).map(([group, permissions]) => (
                                <div key={group}>
                                    <h5 className="capitalize font-semibold mb-2 text-primary">{PERMISSION_GROUP_TRANSLATIONS[group] || group.toLowerCase()}</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                                        {Object.entries(permissions).map(([name, id]) => (
                                            <div key={id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={id}
                                                    checked={currentPermissions.includes(id)}
                                                    onCheckedChange={(checked) => handlePermissionChange(id, !!checked)}
                                                />
                                                <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                                                    {PERMISSION_ACTION_TRANSLATIONS[name] || name.toLowerCase().replace(/_/g, ' ')}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="mt-4" />
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="p-4 border-t flex justify-between">
                            {selectedRole ? (
                                <Button variant="destructive" onClick={() => setRoleToDelete(selectedRole)} disabled={isSaving}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Eliminar Rol
                                </Button>
                            ) : <div></div>}
                            <Button onClick={handleSave} disabled={!canSave || isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/> {selectedRole ? 'Guardar Cambios' : 'Crear Rol'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                 <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar el rol "{roleToDelete?.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el rol.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

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

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: { name: '', email: '', roleId: '' },
    });

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
        form.reset(user ? { name: user.name, email: user.email, roleId: user.roleId } : { name: '', email: '', roleId: '' });
        setIsUserFormOpen(true);
    }

    const onUserSubmit = async (data: UserFormValues) => {
        try {
        if (editingUser) {
            await updateUser(editingUser.id, data);
            toast({ title: 'Usuario Actualizado', description: `El usuario ${data.name} ha sido actualizado.` });
        } else {
            await addUser(data);
            toast({ title: 'Usuario Creado', description: `El usuario ${data.name} ha sido añadido.` });
        }
        setIsUserFormOpen(false);
        fetchData();
        } catch(error) {
        toast({ title: 'Error', description: `No se pudo guardar el usuario. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        }
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

            <Dialog open={isUserFormOpen} onOpenChange={(open) => { if (!open) setEditingUser(null); setIsUserFormOpen(open); }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle className="text-primary">{editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
                    <DialogDescription>
                        {editingUser ? 'Actualice los datos del usuario.' : 'Complete el formulario para registrar un nuevo usuario en el sistema.'}
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onUserSubmit)} className="space-y-4 py-2">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Ej: Ana Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="ej: email@dominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField
                                control={form.control}
                                name="roleId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rol</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un rol..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsUserFormOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
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
export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Configuración</h1>
                    <p className="text-sm text-muted-foreground">
                    Gestione la configuración general, usuarios y roles del sistema.
                    </p>
                </div>
            </div>
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="general">Configuración General</TabsTrigger>
                    <TabsTrigger value="users">Usuarios y Roles</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-6">
                    <AppSettingsTab />
                </TabsContent>
                <TabsContent value="users" className="mt-6">
                    <UserManagementTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}


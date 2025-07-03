
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Role, getUsers, getRoles, addUser, updateUser, deleteUser } from '@/lib/data';
import { PlusCircle, MoreHorizontal, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

const userFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  roleId: z.string().min(1, { message: 'Debe seleccionar un rol.' }),
});
type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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
  
  const handleOpenForm = (user: User | null) => {
    setEditingUser(user);
    form.reset(user ? { name: user.name, email: user.email, roleId: user.roleId } : { name: '', email: '', roleId: '' });
    setIsFormOpen(true);
  }

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, data);
        toast({ title: 'Usuario Actualizado', description: `El usuario ${data.name} ha sido actualizado.` });
      } else {
        await addUser(data);
        toast({ title: 'Usuario Creado', description: `El usuario ${data.name} ha sido añadido.` });
      }
      setIsFormOpen(false);
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

  const UserActions = ({ user }: { user: User }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenForm(user)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-headline">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground">Añade, edita y gestiona los roles y permisos de los usuarios del sistema.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? (
             <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : (
            <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
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
                        {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                            <Badge variant="secondary">{getRoleName(user.roleId)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <UserActions user={user} />
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {users.map((user) => (
                        <Card key={user.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle>{user.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="md:hidden">
                                        <UserActions user={user} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Rol Asignado</span>
                                <Badge variant="secondary">{getRoleName(user.roleId)}</Badge>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setEditingUser(null); setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
            <DialogDescription>
                {editingUser ? 'Actualice los datos del usuario.' : 'Complete el formulario para registrar un nuevo usuario en el sistema.'}
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
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
    </>
  );
}

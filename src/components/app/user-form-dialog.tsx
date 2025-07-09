'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Role, addUser, updateUser } from '@/lib/data';
import { Loader2 } from 'lucide-react';

const userFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  roleId: z.string().min(1, { message: 'Debe seleccionar un rol.' }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  user?: User | null;
  roles: Role[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function UserFormDialog({ user, roles, isOpen, onOpenChange, onSuccess }: UserFormDialogProps) {
    const { toast } = useToast();
    const isEditMode = !!user;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: { name: '', email: '', roleId: '' },
    });

    useEffect(() => {
        if (isOpen && user) {
            form.reset({ name: user.name, email: user.email, roleId: user.roleId });
        } else if (isOpen) {
            form.reset({ name: '', email: '', roleId: '' });
        }
    }, [isOpen, user, form]);

    const onSubmit = async (data: UserFormValues) => {
        try {
            if (isEditMode && user) {
                await updateUser(user.id, data);
                toast({ title: 'Usuario Actualizado', description: `El usuario ${data.name} ha sido actualizado.` });
            } else {
                await addUser(data);
                toast({ title: 'Usuario Creado', description: `El usuario ${data.name} ha sido añadido.` });
            }
            onSuccess();
        } catch(error) {
            toast({ title: 'Error', description: `No se pudo guardar el usuario. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        }
    };
    
    const { isSubmitting } = form.formState;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-primary">{isEditMode ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Actualice los datos del usuario.' : 'Complete el formulario para registrar un nuevo usuario en el sistema.'}
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
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

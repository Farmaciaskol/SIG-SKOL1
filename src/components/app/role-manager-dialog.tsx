'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { addRole, deleteRole, updateRole, Role } from '@/lib/data';
import { PERMISSIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export const RoleManagerDialog = ({ roles, isOpen, onOpenChange, onSuccess }: {
    roles: Role[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) => {
    const { toast } = useToast();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [currentFormData, setCurrentFormData] = useState<{ name: string; permissions: string[] }>({ name: '', permissions: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    useEffect(() => {
        if (selectedRole) {
            setCurrentFormData({ name: selectedRole.name, permissions: selectedRole.permissions });
        } else {
            setCurrentFormData({ name: '', permissions: [] });
        }
    }, [selectedRole]);
    
    useEffect(() => {
      if(!isOpen) {
        setSelectedRole(null);
      }
    }, [isOpen]);

    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setCurrentFormData(prev => ({
            ...prev,
            permissions: checked ? [...prev.permissions, permissionId] : prev.permissions.filter(p => p !== permissionId)
        }));
    };
    
    const handleNameChange = (newName: string) => {
        setCurrentFormData(prev => ({ ...prev, name: newName }));
    };

    const handleSave = async () => {
        if (!currentFormData.name.trim()) {
            toast({ title: 'Error', description: 'El nombre del rol no puede estar vacío.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            if (selectedRole) {
                await updateRole(selectedRole.id, currentFormData);
                toast({ title: 'Rol Actualizado', description: `Se guardaron los cambios para el rol ${currentFormData.name}.` });
            } else {
                await addRole(currentFormData);
                toast({ title: 'Rol Creado', description: `Se ha creado el rol ${currentFormData.name}.` });
                setCurrentFormData({ name: '', permissions: [] }); // Reset for next new role
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
            if (selectedRole?.id === roleToDelete.id) {
                setSelectedRole(null);
            }
            onSuccess();
        } catch (error) {
            toast({ title: 'Error', description: `No se pudo eliminar el rol. ${error instanceof Error ? error.message : ''}`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
            setRoleToDelete(null);
        }
    }

    const isPristine = selectedRole 
        ? selectedRole.name === currentFormData.name && JSON.stringify(selectedRole.permissions.slice().sort()) === JSON.stringify(currentFormData.permissions.slice().sort())
        : !currentFormData.name.trim();

    const canSave = !isPristine;

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
                            <Input
                                value={currentFormData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Nombre del Nuevo Rol..."
                                className="text-lg font-semibold h-9"
                            />
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
                                                    checked={currentFormData.permissions.includes(id)}
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

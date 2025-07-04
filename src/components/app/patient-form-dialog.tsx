
'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Patient, addPatient, updatePatient } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';


const patientFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  rut: z.string().min(1, { message: 'El RUT es requerido.' }),
  email: z.string().email({ message: 'Email inválido.' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['Masculino', 'Femenino', 'Otro']),
  isChronic: z.boolean().default(false),
  allergies: z.string().optional(),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }).optional().or(z.literal('')),
}).refine(data => {
    // If a password is provided, an email must also be provided.
    return !data.password || (!!data.password && !!data.email);
}, {
    message: "El email es requerido si se ingresa una contraseña.",
    path: ["email"], // Show error on email field
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

interface PatientFormDialogProps {
  patient?: Patient | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function PatientFormDialog({ patient, isOpen, onOpenChange, onSuccess }: PatientFormDialogProps) {
    const { toast } = useToast();
    const isEditMode = !!patient;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            name: '', rut: '', email: '', phone: '', address: '',
            gender: 'Masculino', isChronic: false, allergies: '', password: ''
        },
    });

    useEffect(() => {
        if (isOpen && patient) {
            form.reset({
                name: patient.name,
                rut: patient.rut,
                email: patient.email || '',
                phone: patient.phone || '',
                address: patient.address || '',
                gender: patient.gender || 'Masculino',
                isChronic: patient.isChronic || false,
                allergies: patient.allergies?.join(', ') || '',
                password: '',
            });
        } else if (isOpen && !patient) {
            form.reset({
                name: '', rut: '', email: '', phone: '', address: '',
                gender: 'Masculino', isChronic: false, allergies: '', password: ''
            });
        }
    }, [isOpen, patient, form]);

    const onSubmit = async (values: PatientFormValues) => {
        setIsSubmitting(true);
        try {
            const dataToSave = {
                ...values,
                allergies: values.allergies?.split(',').map(s => s.trim()).filter(Boolean),
            };

            if (isEditMode && patient) {
                await updatePatient(patient.id, dataToSave);
                toast({ title: 'Paciente Actualizado', description: 'Los datos del paciente se han guardado.' });
            } else {
                await addPatient(dataToSave as any);
                toast({ title: 'Paciente Creado', description: 'El nuevo paciente ha sido registrado.' });
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save patient:", error);
            toast({ title: 'Error', description: 'No se pudo guardar el paciente.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Actualice los datos del paciente.' : 'Complete el formulario para registrar un nuevo paciente.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="rut" render={({ field }) => (
                                <FormItem><FormLabel>RUT *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="gender" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Género</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Masculino">Masculino</SelectItem>
                                            <SelectItem value="Femenino">Femenino</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        
                        <FormField control={form.control} name="isChronic" render={({ field }) => (
                            <FormItem className="flex flex-row items-end space-x-2 space-y-0 h-10">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="!mt-0">Es Paciente Crónico</FormLabel>
                            </FormItem>
                        )}/>
                       
                        <FormField control={form.control} name="allergies" render={({ field }) => (
                            <FormItem><FormLabel>Alergias Conocidas</FormLabel><FormControl><Textarea placeholder="Separadas por comas. Ej: Penicilina, AINEs" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>

                         <Separator className="my-6"/>

                        <div>
                            <h3 className="text-lg font-medium mb-1">Credenciales de Acceso al Portal</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Estas credenciales son opcionales. Si ingresa una contraseña, el email es obligatorio.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email (Usuario)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? 'Guardar Cambios' : 'Crear Paciente'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

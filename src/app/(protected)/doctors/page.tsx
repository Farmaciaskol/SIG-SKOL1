
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { getDoctors, getPatients, getRecipes, addDoctor, updateDoctor, deleteDoctor } from '@/lib/data';
import type { Doctor, Patient, Recipe } from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { PlusCircle, Search, Phone, Mail, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
import { useToast } from '@/hooks/use-toast';

type DoctorWithStats = Doctor & {
  patientsAssociated: number;
  activeRecipes: number;
  correctEmissionRate: number;
  chronicComplianceRate: number;
  patients: Patient[];
};

const doctorFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  specialty: z.string().min(1, { message: 'La especialidad es requerida.' }),
  license: z.string().optional(),
  rut: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Email inválido.' }).optional().or(z.literal('')),
});

type DoctorFormValues = z.infer<typeof doctorFormSchema>;

const DoctorCard = ({ doctor, onEdit, onDelete }: { 
  doctor: DoctorWithStats;
  onEdit: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
}) => {
    const { toast } = useToast();
    const getProgressColor = (value: number) => {
      if (isNaN(value)) return 'bg-gray-300';
      const roundedValue = Math.round(value);
      if (roundedValue >= 90) return 'bg-green-500';
      if (roundedValue >= 50) return 'bg-yellow-400';
      return 'bg-red-500';
    };

    const formatPercentage = (value: number) => {
      if (isNaN(value)) return 'N/A';
      return `${Math.round(value)}%`;
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="p-4">
            <CardTitle className="text-lg font-bold text-foreground truncate" title={doctor.name}>{doctor.name}</CardTitle>
            <p className="text-sm font-medium text-primary truncate" title={doctor.specialty}>{doctor.specialty}</p>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 p-4">
            <div>
                <p className="text-xs text-muted-foreground">Reg: {doctor.license || 'N/A'} | RUT: {doctor.rut || 'N/A'}</p>
                <div className="mt-4 space-y-2">
                {doctor.phone && (
                    <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{doctor.phone}</span>
                    </div>
                )}
                {doctor.email && (
                    <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{doctor.email}</span>
                    </div>
                )}
                </div>
            </div>
            <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-foreground">{doctor.patientsAssociated}</p>
                    <p className="text-xs text-muted-foreground">Pacientes Asociados</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-foreground">{doctor.activeRecipes}</p>
                    <p className="text-xs text-muted-foreground">Recetas Activas</p>
                </div>
                </div>
            </div>
            <div className="border-t pt-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Calidad y Cumplimiento
                </h3>
                <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">Emisión Correcta</p>
                    <p className="font-semibold text-foreground">{formatPercentage(doctor.correctEmissionRate)}</p>
                </div>
                <Progress
                    value={isNaN(doctor.correctEmissionRate) ? 0 : doctor.correctEmissionRate}
                    aria-label={`${formatPercentage(doctor.correctEmissionRate)} de emisión correcta`}
                    indicatorClassName={getProgressColor(doctor.correctEmissionRate)}
                />
                </div>
                <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">Cumplimiento Crónicos</p>
                    <p className="font-semibold text-foreground">{formatPercentage(doctor.chronicComplianceRate)}</p>
                </div>
                <Progress
                    value={isNaN(doctor.chronicComplianceRate) ? 0 : doctor.chronicComplianceRate}
                    aria-label={`${formatPercentage(doctor.chronicComplianceRate)} de cumplimiento crónico`}
                    indicatorClassName={getProgressColor(doctor.chronicComplianceRate)}
                />
                </div>
            </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 flex justify-between items-center">
                 <Button asChild>
                    <Link href={`/doctors/${doctor.id}`}>Ver Detalle</Link>
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(doctor)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600" onClick={() => onDelete(doctor)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default function DoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const { toast } = useToast();

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: { name: '', specialty: '', license: '', rut: '', phone: '', email: '' },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorsData, patientsData, recipesData] = await Promise.all([
        getDoctors(),
        getPatients(),
        getRecipes(),
      ]);
      setDoctors(doctorsData);
      setPatients(patientsData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos del panel de médicos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openFormForNew = () => {
    form.reset({ name: '', specialty: '', license: '', rut: '', phone: '', email: '' });
    setEditingDoctor(null);
    setIsFormOpen(true);
  };
  
  const openFormForEdit = (doctor: Doctor) => {
    form.reset(doctor);
    setEditingDoctor(doctor);
    setIsFormOpen(true);
  };

  const onSubmit = async (data: DoctorFormValues) => {
    try {
      if (editingDoctor) {
        await updateDoctor(editingDoctor.id, data);
        toast({ title: 'Médico Actualizado', description: 'Los datos del médico han sido actualizados.' });
      } else {
        await addDoctor(data);
        toast({ title: 'Médico Añadido', description: 'El nuevo médico ha sido registrado.' });
      }
      form.reset();
      setIsFormOpen(false);
      setEditingDoctor(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo guardar el médico. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    try {
      await deleteDoctor(doctorToDelete.id);
      toast({ title: 'Médico Eliminado', description: `${doctorToDelete.name} ha sido eliminado.` });
      setDoctorToDelete(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo eliminar el médico. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  }

  const doctorStats = useMemo<DoctorWithStats[]>(() => {
    if (loading) {
      return [];
    }

    return doctors.map((doctor) => {
      const doctorRecipes = recipes.filter((r) => r.doctorId === doctor.id);
      const doctorPatientIds = [...new Set(doctorRecipes.map((r) => r.patientId))];
      const doctorPatients = patients.filter(p => doctorPatientIds.includes(p.id));

      const activeRecipes = doctorRecipes.filter(
        (r) => ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected].includes(r.status)
      ).length;

      const totalRecipes = doctorRecipes.length;
      const rejectedRecipes = doctorRecipes.filter((r) => r.status === RecipeStatus.Rejected).length;
      const correctEmissionRate = totalRecipes > 0 ? ((totalRecipes - rejectedRecipes) / totalRecipes) * 100 : NaN;

      const chronicDoctorPatients = doctorPatients.filter(p => p.isChronic);
      const chronicPatientsWithActiveRecipe = chronicDoctorPatients.filter(p => 
        doctorRecipes.some(r => r.patientId === p.id && ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected].includes(r.status))
      ).length;
      const chronicComplianceRate = chronicDoctorPatients.length > 0 ? (chronicPatientsWithActiveRecipe / chronicDoctorPatients.length) * 100 : NaN;

      return {
        ...doctor,
        patientsAssociated: doctorPatientIds.length,
        activeRecipes,
        correctEmissionRate,
        chronicComplianceRate,
        patients: doctorPatients,
      };
    });
  }, [doctors, patients, recipes, loading]);

  const filteredDoctors = useMemo(() => {
    if (!searchTerm) {
      return doctorStats;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return doctorStats.filter((doctor) =>
      doctor.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      doctor.specialty.toLowerCase().includes(lowerCaseSearchTerm) ||
      doctor.license?.toLowerCase().includes(lowerCaseSearchTerm) ||
      doctor.rut?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [doctorStats, searchTerm]);
  
  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Cargando médicos...</p></div>;
  }
  
  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Gestión de Médicos</h1>
          <p className="text-sm text-muted-foreground">
            Panel de control para gestionar la relación con los prescriptores.
          </p>
        </div>
        <Button onClick={openFormForNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Médico
        </Button>
      </div>

      <Card className="mb-6">
          <CardContent className="p-4">
              <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                  type="search"
                  placeholder="Buscar por nombre, especialidad, N° colegiatura o RUT..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </CardContent>
      </Card>
      
      {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} onEdit={openFormForEdit} onDelete={setDoctorToDelete} />
              ))}
          </div>
      ) : (
          <Card className="text-center py-16 mt-8 shadow-none border-dashed">
              <div className="flex flex-col items-center justify-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No se encontraron médicos</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                  Intenta ajustar tu búsqueda o crea un nuevo médico para empezar.
              </p>
              <Button className="mt-6" onClick={openFormForNew}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Médico
              </Button>
              </div>
          </Card>
      )}

      {/* --- Add/Edit Dialog --- */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) setEditingDoctor(null);
        setIsFormOpen(open);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
              <DialogTitle>{editingDoctor ? 'Editar Médico' : 'Añadir Nuevo Médico'}</DialogTitle>
              <DialogDescription>
                  {editingDoctor ? 'Actualice los datos del médico.' : 'Complete el formulario para registrar un nuevo médico prescriptor.'}
              </DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre Completo *</FormLabel><FormControl><Input placeholder="Ej: Dr. Ricardo Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel>Especialidad *</FormLabel><FormControl><Input placeholder="Ej: Dermatología" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="license" render={({ field }) => (
                        <FormItem><FormLabel>N° Colegiatura</FormLabel><FormControl><Input placeholder="Ej: 12345" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="rut" render={({ field }) => (
                        <FormItem><FormLabel>RUT</FormLabel><FormControl><Input placeholder="Ej: 12.345.678-9" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej: +56912345678" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="Ej: email@dominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  </div>
                  
                  <DialogFooter className="pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingDoctor ? 'Guardar Cambios' : 'Guardar Médico'}
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* --- Delete Confirmation Dialog --- */}
      <AlertDialog open={!!doctorToDelete} onOpenChange={(open) => !open && setDoctorToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al médico <span className="font-bold">{doctorToDelete?.name}</span> del sistema.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDoctorToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDoctor} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
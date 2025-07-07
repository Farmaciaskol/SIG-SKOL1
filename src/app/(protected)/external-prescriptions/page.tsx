
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getExternalPharmacies, addExternalPharmacy, getRecipes, updateExternalPharmacy, deleteExternalPharmacy } from '@/lib/data';
import type { ExternalPharmacy, Recipe } from '@/lib/types';
import { RecipeStatus } from '@/lib/types';
import { PlusCircle, Search, Phone, Mail, Pencil, Trash2, Warehouse, Loader2, FileText, Banknote, Building2, User } from 'lucide-react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

type PharmacyWithStats = ExternalPharmacy & {
  activeRecipes: number;
  balance: number;
  reports: number;
};

const PharmacyCard = ({ pharmacy, onEdit, onDelete }: { pharmacy: PharmacyWithStats, onEdit: (p: PharmacyWithStats) => void, onDelete: (p: PharmacyWithStats) => void }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold text-foreground">{pharmacy.name}</CardTitle>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pharmacy)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600" onClick={() => onDelete(pharmacy)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
        
        <div className="mt-4 space-y-2 text-sm">
            {pharmacy.contactPerson && (
                <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{pharmacy.contactPerson}</span>
                </div>
            )}
            {pharmacy.phone && (
                <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{pharmacy.phone}</span>
                </div>
            )}
            {pharmacy.email && (
                <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{pharmacy.email}</span>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 p-4">
        
        <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
            <div>
                <p className={`text-2xl font-bold ${pharmacy.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${pharmacy.balance.toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-foreground">{pharmacy.activeRecipes}</p>
                <p className="text-xs text-muted-foreground">Recetas Activas</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-foreground">{pharmacy.reports}</p>
                <p className="text-xs text-muted-foreground">Reportes FV</p>
            </div>
        </div>

        <div className="border-t pt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Tiempos de Compromiso
            </h3>
            <div className="flex justify-around text-center text-sm">
                <div>
                    <p className="font-bold">{pharmacy.standardPreparationTime || 'N/A'}{pharmacy.standardPreparationTime ? ' días' : ''}</p>
                    <p className="text-xs text-muted-foreground">Prep. Estándar</p>
                </div>
                <div>
                    <p className="font-bold">{pharmacy.skolSuppliedPreparationTime || 'N/A'}{pharmacy.skolSuppliedPreparationTime ? ' días' : ''}</p>
                    <p className="text-xs text-muted-foreground">Prep. Insumo Skol</p>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-3">
          <Button className="w-full" asChild>
            <Link href={`/external-prescriptions/${pharmacy.id}`}>Ver Detalle</Link>
          </Button>
      </CardFooter>
    </Card>
  );
};


const pharmacyFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: 'Email inválido.' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentDetails: z.string().optional(),
  defaultPaymentModel: z.string().min(1, { message: 'El modelo de pago es requerido.' }),
  transportCost: z.coerce.number().optional(),
  standardPreparationTime: z.coerce.number().optional(),
  skolSuppliedPreparationTime: z.coerce.number().optional(),
});

type PharmacyFormValues = z.infer<typeof pharmacyFormSchema>;

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{value}</div>
        </CardContent>
    </Card>
);

export default function ExternalPrescriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<ExternalPharmacy[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<ExternalPharmacy | null>(null);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<ExternalPharmacy | null>(null);
  const { toast } = useToast();

  const form = useForm<PharmacyFormValues>({
    resolver: zodResolver(pharmacyFormSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      paymentDetails: '',
      defaultPaymentModel: 'Por Receta',
      transportCost: 0,
      standardPreparationTime: 0,
      skolSuppliedPreparationTime: 0,
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pharmaciesData, recipesData] = await Promise.all([
        getExternalPharmacies(),
        getRecipes(),
      ]);
      setPharmacies(pharmaciesData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos de recetarios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenForm = (pharmacy: ExternalPharmacy | null) => {
    setEditingPharmacy(pharmacy);
    if (pharmacy) {
      form.reset({
        ...pharmacy,
        transportCost: pharmacy.transportCost ?? 0,
        standardPreparationTime: pharmacy.standardPreparationTime ?? 0,
        skolSuppliedPreparationTime: pharmacy.skolSuppliedPreparationTime ?? 0,
      });
    } else {
      form.reset({
        name: '', contactPerson: '', email: '', phone: '', address: '',
        paymentDetails: '', defaultPaymentModel: 'Por Receta', transportCost: 0,
        standardPreparationTime: 0, skolSuppliedPreparationTime: 0,
      });
    }
    setIsFormOpen(true);
  };

  const onSubmit = async (data: PharmacyFormValues) => {
    try {
      if (editingPharmacy) {
        await updateExternalPharmacy(editingPharmacy.id, data);
        toast({ title: 'Recetario Actualizado', description: 'Los datos del recetario han sido actualizados.' });
      } else {
        await addExternalPharmacy(data);
        toast({ title: 'Recetario Añadido', description: 'El nuevo recetario ha sido registrado.' });
      }
      form.reset();
      setIsFormOpen(false);
      setEditingPharmacy(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo guardar el recetario. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePharmacy = async () => {
    if (!pharmacyToDelete) return;
    try {
      await deleteExternalPharmacy(pharmacyToDelete.id);
      toast({ title: 'Recetario Eliminado', description: `${pharmacyToDelete.name} ha sido eliminado.` });
      setPharmacyToDelete(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo eliminar el recetario. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  }
  
  const pharmacyStats = useMemo<PharmacyWithStats[]>(() => {
    return pharmacies.map(pharmacy => {
      const pharmacyRecipes = recipes.filter(r => r.externalPharmacyId === pharmacy.id);
      const activeRecipes = pharmacyRecipes.filter(r => ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected].includes(r.status)).length;
      
      const balance = pharmacyRecipes.reduce((acc, r) => acc + (r.preparationCost || 0), 0);
      
      return {
        ...pharmacy,
        activeRecipes,
        balance, 
        reports: 0, // Placeholder
      };
    });
  }, [pharmacies, recipes]);

  const filteredPharmacies = useMemo(() => {
    if (!searchTerm) {
      return pharmacyStats;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return pharmacyStats.filter((pharmacy) =>
      pharmacy.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      pharmacy.contactPerson?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [pharmacyStats, searchTerm]);
  
  const globalStats = useMemo(() => {
    const totalBalance = pharmacyStats.reduce((acc, p) => acc + p.balance, 0);
    const highestBalancePharmacy = pharmacyStats.sort((a,b) => b.balance - a.balance)[0];

    return {
        totalBalance: `$${totalBalance.toLocaleString('es-CL')}`,
        totalPharmacies: pharmacies.length,
        highestBalancePharmacyName: pharmacies.length > 0 ? highestBalancePharmacy.name : 'N/A'
    }
  }, [pharmacyStats, pharmacies.length]);


  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Cargando recetarios...</p></div>;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Gestión de Recetarios</h1>
          <p className="text-sm text-muted-foreground">
            Panel de control para gestionar la relación con los socios.
          </p>
        </div>
        <Button onClick={() => handleOpenForm(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Recetario
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <StatCard title="Saldo Pendiente Total" value={globalStats.totalBalance} icon={Banknote} />
          <StatCard title="Total de Recetarios" value={globalStats.totalPharmacies} icon={Building2} />
          <StatCard title="Recetario con Mayor Saldo" value={globalStats.highestBalancePharmacyName} icon={Warehouse} />
      </div>

      <Card className="mb-6">
          <CardContent className="p-4">
              <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Buscar por nombre o persona de contacto..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </CardContent>
      </Card>
      
      {filteredPharmacies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPharmacies.map((pharmacy) => (
                  <PharmacyCard 
                      key={pharmacy.id} 
                      pharmacy={pharmacy} 
                      onEdit={() => handleOpenForm(pharmacy)} 
                      onDelete={() => setPharmacyToDelete(pharmacy)}
                  />
              ))}
          </div>
      ) : (
          <Card className="text-center py-16 mt-8 shadow-none border-dashed">
              <div className="flex flex-col items-center justify-center">
                  <Warehouse className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold">No se encontraron recetarios</h2>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                      Intenta ajustar tu búsqueda o crea un nuevo recetario para empezar.
                  </p>
                  <Button className="mt-6" onClick={() => handleOpenForm(null)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Recetario
                  </Button>
              </div>
          </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) setEditingPharmacy(null);
        setIsFormOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
              <DialogTitle>{editingPharmacy ? 'Editar Recetario' : 'Nuevo Recetario'}</DialogTitle>
              <DialogDescription>
                  {editingPharmacy ? 'Actualice los datos del socio.' : 'Complete el formulario para registrar un nuevo socio.'}
              </DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre del Recetario *</FormLabel><FormControl><Input placeholder="Ej: Farmacias Magistrales S.A." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="contactPerson" render={({ field }) => (
                          <FormItem><FormLabel>Persona de Contacto</FormLabel><FormControl><Input placeholder="Ej: Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                       <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej: +56912345678" {...field} /></FormControl><FormMessage /></FormItem>
                      )}/>
                  </div>
                   <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="Ej: contacto@recetario.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Ej: Av. Principal 123, Santiago" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="defaultPaymentModel"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Modelo de Pago por Defecto *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un modelo..." />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="Por Receta">Por Receta</SelectItem>
                                  <SelectItem value="Factura Mensual">Factura Mensual</SelectItem>
                              </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="transportCost"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Costo de Despacho por Defecto (CLP)</FormLabel>
                              <FormControl><Input type="number" placeholder="Ej: 3500" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
                  
                  <Separator className="my-4" />
                  <h4 className="font-medium text-foreground mb-2">Tiempos de Entrega (Compromiso)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="standardPreparationTime"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Preparación Estándar (días)</FormLabel>
                              <FormControl><Input type="number" placeholder="Ej: 2" {...field} /></FormControl>
                              <FormDescription className="text-xs">Para insumos propios del recetario.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="skolSuppliedPreparationTime"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Preparación Insumo Skol (días)</FormLabel>
                              <FormControl><Input type="number" placeholder="Ej: 3" {...field} /></FormControl>
                              <FormDescription className="text-xs">Para insumos que Skol despacha.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
                  
                   <FormField control={form.control} name="paymentDetails" render={({ field }) => (
                      <FormItem><FormLabel>Detalles de Pago</FormLabel><FormControl><Textarea placeholder="Ej: Cuenta Corriente Banco XYZ, N° 123-456-789, a nombre de..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>

                  <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                      <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingPharmacy ? 'Guardar Cambios' : 'Guardar Recetario'}
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
        </DialogContent>
      </Dialog>

       <AlertDialog open={!!pharmacyToDelete} onOpenChange={(open) => !open && setPharmacyToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al recetario <span className="font-bold">{pharmacyToDelete?.name}</span> del sistema.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPharmacyToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePharmacy} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
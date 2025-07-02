'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, User, Bot, Pill, Stethoscope, Plus, X } from 'lucide-react';
import { getPatients, getDoctors, getRecipe, Patient, Doctor, Recipe } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

// AI Extraction Placeholder section
const RecipeFileUploadSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Upload className="h-5 w-5" />
        Carga y Extracción IA
      </CardTitle>
      <CardDescription>
        Sube una imagen o PDF para pre-rellenar el formulario con IA.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Arrastra o haz clic para buscar</p>
        <Button variant="outline" size="sm">Buscar archivo</Button>
      </div>
       <Button className="w-full mt-4">
        <Bot className="mr-2 h-4 w-4" /> Extraer con IA
      </Button>
    </CardContent>
  </Card>
);

interface RecipeFormProps {
    recipeId?: string;
}

export function RecipeForm({ recipeId }: RecipeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const isEditMode = !!recipeId;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patientsData, doctorsData] = await Promise.all([getPatients(), getDoctors()]);
        setPatients(patientsData);
        setDoctors(doctorsData);

        if (isEditMode) {
          const recipeData = await getRecipe(recipeId);
          if (recipeData) {
            setRecipe(recipeData);
          } else {
             toast({ title: 'Error', description: 'No se encontró la receta.', variant: 'destructive' });
             router.push('/recipes');
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos necesarios.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [recipeId, isEditMode, toast, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p>Cargando formulario...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <RecipeFileUploadSection />
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Información del Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Paciente Existente</Label>
               <Select defaultValue={recipe?.patientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Busca un paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.rut}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
             <div className="text-center text-sm text-muted-foreground my-2">O</div>
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nombre Paciente (Nuevo)</Label>
              <Input id="patient-name" placeholder="Ej: Juan Pérez" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="patient-rut">RUT Paciente (Nuevo)</Label>
              <Input id="patient-rut" placeholder="Ej: 12.345.678-9" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5" /> Información del Médico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label>Seleccionar Médico Existente</Label>
               <Select defaultValue={recipe?.doctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Busca un médico..." />
                </SelectTrigger>
                <SelectContent>
                   {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name} - {d.specialty}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="h-5 w-5" /> Ítems del Preparado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {/* Placeholder for dynamic items */}
                <div className="p-4 border rounded-md space-y-3">
                    <Label>Ítem 1</Label>
                    <Input placeholder="Principio Activo" />
                    <Textarea placeholder="Instrucciones de uso..." />
                    <div className="flex justify-end">
                         <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                             <X className="h-4 w-4" />
                         </Button>
                    </div>
                </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
                <Plus className="mr-2 h-4 w-4" /> Añadir Ítem
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
              <Link href="/recipes">Cancelar</Link>
          </Button>
          <Button>{isEditMode ? 'Guardar Cambios' : 'Guardar Receta'}</Button>
        </div>
      </div>
    </div>
  );
}

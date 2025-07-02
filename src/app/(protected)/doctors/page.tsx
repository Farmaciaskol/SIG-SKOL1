'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { getDoctors, getPatients, getRecipes, Doctor, Patient, Recipe, RecipeStatus } from '@/lib/data';
import { PlusCircle, Search, Phone, Mail, Pencil, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


type DoctorWithStats = Doctor & {
  patientsAssociated: number;
  activeRecipes: number;
  correctEmissionRate: number;
  chronicComplianceRate: number;
  patients: Patient[];
};

const DoctorCard = ({ doctor }: { doctor: DoctorWithStats }) => {
  return (
    <Dialog>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{doctor.name}</CardTitle>
          <p className="text-primary">{doctor.specialty}</p>
        </CardHeader>
        <CardContent className="flex-grow space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Reg: {doctor.license || 'N/A'} | RUT: {doctor.rut || 'N/A'}</p>
            <div className="mt-4 space-y-2">
              {doctor.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{doctor.phone}</span>
                </div>
              )}
              {doctor.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{doctor.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{doctor.patientsAssociated}</p>
                <p className="text-xs text-muted-foreground">Pacientes Asociados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{doctor.activeRecipes}</p>
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
                <p>Emisión Correcta</p>
                <p className="font-semibold">{Math.round(doctor.correctEmissionRate)}%</p>
              </div>
              <Progress value={doctor.correctEmissionRate} aria-label={`${Math.round(doctor.correctEmissionRate)}% de emisión correcta`} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <p>Cumplimiento Crónicos</p>
                <p className="font-semibold">{Math.round(doctor.chronicComplianceRate)}%</p>
              </div>
              <Progress value={doctor.chronicComplianceRate} aria-label={`${Math.round(doctor.chronicComplianceRate)}% de cumplimiento crónico`} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 p-3 flex justify-between items-center">
            <DialogTrigger asChild>
                 <Button variant="link" className="p-0 h-auto">Ver Pacientes</Button>
            </DialogTrigger>
         
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Patients Modal */}
      <DialogContent className="sm:max-w-lg">
          <DialogHeader>
              <DialogTitle>Pacientes de {doctor.name}</DialogTitle>
              <DialogDescription>
                  Lista de pacientes que han recibido recetas de este médico.
              </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>RUT</TableHead>
                          <TableHead>Es Crónico</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {doctor.patients.length > 0 ? doctor.patients.map(patient => (
                          <TableRow key={patient.id}>
                              <TableCell className="font-medium">
                                  <Link href={`/patients/${patient.id}`} className="hover:underline text-primary">
                                      {patient.name}
                                  </Link>
                              </TableCell>
                              <TableCell>{patient.rut}</TableCell>
                              <TableCell>{patient.isChronic ? 'Sí' : 'No'}</TableCell>
                          </TableRow>
                      )) : (
                          <TableRow>
                              <TableCell colSpan={3} className="text-center">No hay pacientes asociados.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </div>
      </DialogContent>
    </Dialog>
  );
};


export default function DoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const doctorStats = useMemo<DoctorWithStats[]>(() => {
    if (!doctors.length || !patients.length || !recipes.length) {
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
      const correctEmissionRate = totalRecipes > 0 ? ((totalRecipes - rejectedRecipes) / totalRecipes) * 100 : 100;

      const chronicDoctorPatients = doctorPatients.filter(p => p.isChronic);
      const chronicPatientsWithActiveRecipe = chronicDoctorPatients.filter(p => 
        doctorRecipes.some(r => r.patientId === p.id && ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected].includes(r.status))
      ).length;
      const chronicComplianceRate = chronicDoctorPatients.length > 0 ? (chronicPatientsWithActiveRecipe / chronicDoctorPatients.length) * 100 : 100;

      return {
        ...doctor,
        patientsAssociated: doctorPatientIds.length,
        activeRecipes,
        correctEmissionRate,
        chronicComplianceRate,
        patients: doctorPatients,
      };
    });
  }, [doctors, patients, recipes]);

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
    return <div className="p-8">Cargando médicos...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Médicos</h2>
          <p className="text-muted-foreground">
            Panel de control para gestionar la relación con los prescriptores.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Médico
        </Button>
      </div>

      <Card>
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
                  <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
          </div>
      ) : (
          <Card className="text-center py-16 mt-8 shadow-none border-dashed">
              <div className="flex flex-col items-center justify-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No se encontraron médicos</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                  Intenta ajustar tu búsqueda o crea un nuevo médico para empezar.
              </p>
              <Button className="mt-6">
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Médico
              </Button>
              </div>
          </Card>
      )}
    </div>
  );
}

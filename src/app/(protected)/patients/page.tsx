
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getPatients, Patient, ProactivePatientStatus, PatientActionNeeded } from '@/lib/data';
import { PlusCircle, Search, User, Heart, AlertTriangle, Pencil, Trash2, FileText, Repeat, Truck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusStyles: Record<ProactivePatientStatus, string> = {
  [ProactivePatientStatus.URGENT]: 'border-red-500 bg-red-50',
  [ProactivePatientStatus.ATTENTION]: 'border-pink-500 bg-pink-50',
  [ProactivePatientStatus.OK]: 'border-border',
};

const actionButtonConfig: Record<PatientActionNeeded, { text: string; icon: React.ElementType }> = {
  [PatientActionNeeded.CREATE_NEW_RECIPE]: { text: 'Crear Receta', icon: FileText },
  [PatientActionNeeded.REPREPARE_CYCLE]: { text: 'Re-preparar Ciclo', icon: Repeat },
  [PatientActionNeeded.DISPENSE_COMMERCIAL]: { text: 'Gestionar Dispensación', icon: Truck },
  [PatientActionNeeded.NONE]: { text: 'Ver Ficha', icon: User },
};

type FilterStatus = 'all' | ProactivePatientStatus;

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const patientsData = await getPatients();
        setPatients(patientsData);
      } catch (error) {
        console.error("Failed to fetch patients data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient => {
        if (activeFilter !== 'all' && patient.proactiveStatus !== activeFilter) {
          return false;
        }
        if (searchTerm) {
          const lowerCaseSearchTerm = searchTerm.toLowerCase();
          return (
            patient.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            patient.rut.toLowerCase().includes(lowerCaseSearchTerm)
          );
        }
        return true;
      });
  }, [patients, searchTerm, activeFilter]);

  const PatientCard = ({ patient }: { patient: Patient }) => {
    const { text: buttonText, icon: ButtonIcon } = actionButtonConfig[patient.actionNeeded] || actionButtonConfig.NONE;
  
    return (
        <Card className={cn("flex flex-col justify-between transition-shadow hover:shadow-md", statusStyles[patient.proactiveStatus])}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg hover:underline">
                            <Link href={`/patients/${patient.id}`}>
                                {patient.name}
                            </Link>
                        </CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <User className="mr-2 h-3.5 w-3.5" />
                            <span>{patient.rut}</span>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        {patient.isChronic && <Heart className="h-5 w-5 text-pink-500" title="Paciente Crónico" />}
                        {patient.allergies && patient.allergies.length > 0 && <AlertTriangle className="h-5 w-5 text-amber-600" title={`Alergias: ${patient.allergies.join(', ')}`} />}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="py-2">
                <div className="flex items-start text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-foreground/90 leading-snug">{patient.proactiveMessage}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 py-3 px-4 mt-2">
                <Button size="sm" asChild>
                    <Link href={`/recipes/new?patientId=${patient.id}`}>
                        <ButtonIcon className="mr-2 h-4 w-4" />
                        {buttonText}
                    </Link>
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 hover:text-red-600">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Gestión de Pacientes</h2>
          <p className="text-muted-foreground">
            Una visión 360° para una atención farmacéutica proactiva.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Paciente
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por nombre o RUT..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Filtros de Prevención:</span>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={activeFilter === 'all' ? 'default' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        className="px-3"
                    >
                        Todos
                    </Button>
                    <Button 
                        variant={activeFilter === 'URGENT' ? 'default' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter(ProactivePatientStatus.URGENT)}
                        className="px-3"
                    >
                        Urgente
                    </Button>
                    <Button 
                        variant={activeFilter === 'ATTENTION' ? 'default' : 'link'}
                        size="sm"
                        onClick={() => setActiveFilter(ProactivePatientStatus.ATTENTION)}
                        className="px-3"
                    >
                        Atención
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Cargando pacientes...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 mt-8 shadow-none border-dashed">
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No se encontraron pacientes</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
            Intenta ajustar tu búsqueda o filtros, o crea un nuevo paciente para empezar.
            </p>
            <Button className="mt-6">
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Primer Paciente
            </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
                <PatientCard key={patient.id} patient={patient} />
            ))}
        </div>
      )}
    </div>
  );
}

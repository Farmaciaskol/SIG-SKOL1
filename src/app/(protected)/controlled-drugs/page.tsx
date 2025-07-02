
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Star, Search, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getControlledSubstanceLog, getPatients, getDoctors, ControlledSubstanceLogEntry, Patient, Doctor } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function ControlledDrugsPage() {
  const [logEntries, setLogEntries] = useState<ControlledSubstanceLogEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logData, patientsData, doctorsData] = await Promise.all([
          getControlledSubstanceLog(),
          getPatients(),
          getDoctors(),
        ]);
        setLogEntries(logData);
        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error de Carga",
          description: "No se pudieron cargar los datos del libro de control.",
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const getPatientName = (patientId: string) => patients.find(p => p.id === patientId)?.name || 'N/A';
  const getDoctorName = (doctorId: string) => doctors.find(d => d.id === doctorId)?.name || 'N/A';
  
  const filteredLogEntries = useMemo(() => {
    return logEntries.filter(entry => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
            entry.internalFolio.toLowerCase().includes(lowerCaseSearchTerm) ||
            getPatientName(entry.patientId).toLowerCase().includes(lowerCaseSearchTerm) ||
            getDoctorName(entry.doctorId).toLowerCase().includes(lowerCaseSearchTerm) ||
            entry.medicationName.toLowerCase().includes(lowerCaseSearchTerm) ||
            entry.prescriptionFolio.toLowerCase().includes(lowerCaseSearchTerm)
        );
    });
  }, [logEntries, searchTerm, patients, doctors]);


  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Libro de Control de Sustancias</h2>
          <p className="text-muted-foreground">
            Registro auditable y seguro de dispensaciones de psicotrópicos y estupefacientes.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Venta Directa
        </Button>
      </div>

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Dispensaciones</p>
                <p className="text-2xl font-bold">{logEntries.length}</p>
            </CardContent>
        </Card>
        <Card>
             <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Psicotrópicos</p>
                <p className="text-2xl font-bold">{logEntries.filter(e => e.controlledType === 'Psicotrópico').length}</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Estupefacientes</p>
                <p className="text-2xl font-bold">{logEntries.filter(e => e.controlledType === 'Estupefaciente').length}</p>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardContent className="p-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Buscar por folio, paciente, médico, medicamento..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-24 text-center">Cargando...</div>
      ) : filteredLogEntries.length === 0 ? (
        <div className="h-24 text-center">No hay registros en el libro de control.</div>
      ) : (
        <>
            {/* Desktop Table View */}
            <Card className="hidden md:block">
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Folio Interno</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead>Medicamento</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Folio Receta</TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogEntries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>{format(new Date(entry.dispensationDate), 'dd-MM-yyyy')}</TableCell>
                                <TableCell className="font-mono">{entry.internalFolio}</TableCell>
                                <TableCell>{getPatientName(entry.patientId)}</TableCell>
                                <TableCell>{getDoctorName(entry.doctorId)}</TableCell>
                                <TableCell>{entry.medicationName}</TableCell>
                                <TableCell>{entry.quantityDispensed} {entry.quantityUnit}</TableCell>
                                <TableCell><Badge variant={entry.controlledType === 'Estupefaciente' ? 'destructive' : 'secondary'}>{entry.controlledType}</Badge></TableCell>
                                <TableCell className="font-mono">{entry.prescriptionFolio}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm"><Eye className="mr-2 h-4 w-4"/> Ver Adjunto</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {filteredLogEntries.map((entry) => (
                    <Card key={entry.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-mono">{entry.internalFolio}</CardTitle>
                                <Badge variant={entry.controlledType === 'Estupefaciente' ? 'destructive' : 'secondary'}>{entry.controlledType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{format(new Date(entry.dispensationDate), 'dd MMM, yyyy', {locale: es})}</p>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="font-semibold">Medicamento:</span> {entry.medicationName}</p>
                            <p><span className="font-semibold">Paciente:</span> {getPatientName(entry.patientId)}</p>
                            <p><span className="font-semibold">Médico:</span> {getDoctorName(entry.doctorId)}</p>
                            <p><span className="font-semibold">Folio Receta:</span> <span className="font-mono">{entry.prescriptionFolio}</span></p>
                        </CardContent>
                        <CardFooter className="bg-muted/50 p-3">
                             <Button variant="outline" size="sm" className="w-full"><Eye className="mr-2 h-4 w-4"/> Ver Adjunto</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </>
      )}
    </div>
  );
}

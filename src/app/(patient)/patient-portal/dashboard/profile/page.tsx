
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Mail, Phone, MapPin, AlertTriangle, ChevronLeft, User, Heart, ShieldAlert, Pill } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function PatientProfilePage() {
  const { patient } = usePatientAuth();

  if (!patient) {
    return null; 
  }

  const hasClinicalInfo = (patient.allergies && patient.allergies.length > 0) ||
                          (patient.adverseReactions && patient.adverseReactions.length > 0) ||
                          (patient.commercialMedications && patient.commercialMedications.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patient-portal/dashboard">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline">Mi Perfil</h1>
          <p className="text-muted-foreground">Aquí puedes revisar toda tu información registrada en nuestro sistema.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{patient.name}</CardTitle>
          <CardDescription>RUT: {patient.rut}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">Género: {patient.gender || 'No especificado'}</span></div>
              <div className="flex items-center gap-3"><Heart className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">Paciente Crónico: <Badge variant={patient.isChronic ? "secondary" : "outline"}>{patient.isChronic ? 'Sí' : 'No'}</Badge></span></div>
            </div>
          </div>
          
          <Separator />

          <div>
            <h3 className="font-semibold text-foreground mb-4">Información de Contacto</h3>
            <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email || 'No registrado'}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone || 'No registrado'}</span></div>
                {patient.address && <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-1" /><span className="text-foreground">{patient.address}</span></div>}
            </div>
          </div>

          <Separator />
          
           <div>
            <h3 className="font-semibold text-foreground mb-4">Información Clínica</h3>
            {hasClinicalInfo ? (
              <div className="space-y-4">
                {/* Alergias */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Alergias Conocidas</div>
                  {patient.allergies && patient.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pl-7">
                            {patient.allergies.map((allergy) => <Badge key={allergy} variant="destructive">{allergy}</Badge>)}
                        </div>
                    ) : (
                        <p className="text-muted-foreground pl-7 text-xs">No hay alergias registradas.</p>
                    )}
                </div>

                {/* Reacciones Adversas */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3"><ShieldAlert className="h-4 w-4 text-muted-foreground" />Reacciones Adversas Registradas</div>
                  {patient.adverseReactions && patient.adverseReactions.length > 0 ? (
                        <ul className="list-disc pl-12 space-y-1">
                          {patient.adverseReactions.map((reaction, index) => (
                            <li key={index} className="text-foreground">
                              A <span className="font-semibold">{reaction.medication}</span>: {reaction.description}
                            </li>
                          ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground pl-7 text-xs">No hay reacciones adversas registradas.</p>
                    )}
                </div>

                {/* Medicamentos Comerciales */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3"><Pill className="h-4 w-4 text-muted-foreground" />Medicamentos Comerciales en Tratamiento</div>
                  {patient.commercialMedications && patient.commercialMedications.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pl-7">
                            {patient.commercialMedications.map((med) => <Badge key={med} variant="secondary">{med}</Badge>)}
                        </div>
                    ) : (
                        <p className="text-muted-foreground pl-7 text-xs">No hay medicamentos comerciales registrados.</p>
                    )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay información clínica adicional registrada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

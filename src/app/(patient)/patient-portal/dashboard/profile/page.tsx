
'use client';

import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Mail, Phone, MapPin, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function PatientProfilePage() {
  const { patient } = usePatientAuth();

  if (!patient) {
    return null; 
  }

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
          <p className="text-muted-foreground">Aquí puedes revisar tu información registrada.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{patient.name}</CardTitle>
          <CardDescription>{patient.rut}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Información de Contacto</h3>
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.email}</span></div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.phone}</span></div>
                {patient.address && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{patient.address}</span></div>}
            </div>
          </div>
          <Separator />
           <div>
            <h3 className="font-semibold text-foreground mb-2">Información Clínica</h3>
             <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Alergias Conocidas</div>
                 {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pl-7">
                          {patient.allergies.map((allergy) => <Badge key={allergy} variant="destructive">{allergy}</Badge>)}
                      </div>
                  ) : (
                      <p className="text-muted-foreground pl-7">No hay alergias registradas.</p>
                  )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

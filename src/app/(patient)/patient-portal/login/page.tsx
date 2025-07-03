'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getPatient } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const DEFAULT_PATIENT_ID = 'pat-01'; // Gaspar Mendoza

export default function PatientPortalLoginPage() {
  const router = useRouter();
  const { setPatient } = usePatientAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const autoLogin = async () => {
      try {
        const patient = await getPatient(DEFAULT_PATIENT_ID);
        if (patient) {
          setPatient(patient);
          router.push('/patient-portal/dashboard');
        } else {
          toast({ title: "Error de Acceso Automático", description: `El paciente por defecto con ID ${DEFAULT_PATIENT_ID} no fue encontrado.`, variant: 'destructive' });
          setLoading(false);
        }
      } catch (error) {
        toast({ title: "Error", description: "Ocurrió un error al intentar acceder al portal.", variant: 'destructive' });
        setLoading(false);
      }
    };

    autoLogin();
  }, [router, setPatient, toast]);

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4 text-center">
        <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
            alt="Skol Pharmacy Logo"
            width={120}
            height={40}
            className="mx-auto mb-6"
            priority
        />
        <h1 className="text-xl font-semibold mb-2">Accediendo al Portal del Paciente</h1>
        <p className="text-muted-foreground mb-6">Un momento, estamos preparando tu sesión de demostración...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

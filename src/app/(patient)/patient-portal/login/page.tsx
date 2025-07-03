
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { loginPatientByRut } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';
import Image from 'next/image';

export default function PatientPortalLoginPage() {
  const router = useRouter();
  const { setPatient } = usePatientAuth();
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rut.trim()) {
      toast({ title: "Campo Requerido", description: "Por favor, ingresa tu RUT.", variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await loginPatientByRut(rut);
      if (result.success && result.patient) {
        setPatient(result.patient);
        toast({ title: `Bienvenido, ${result.patient.name}`, description: "Serás redirigido a tu portal." });
        router.push('/patient-portal/dashboard');
      } else {
        toast({ title: "Error de Acceso", description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
            alt="Skol Pharmacy Logo"
            width={120}
            height={40}
            className="mx-auto"
            priority
          />
          <CardTitle className="text-2xl font-bold">Portal del Paciente</CardTitle>
          <CardDescription>Accede a tu información y gestiona tus tratamientos de forma segura.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ingresa tu RUT para acceder a tu portal.
              </p>
              <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      id="rut"
                      placeholder="Ej: 12.345.678-9"
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      disabled={loading}
                      className="pl-9"
                  />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

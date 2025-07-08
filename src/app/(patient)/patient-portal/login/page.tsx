
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { getPatients } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function PatientPortalLoginPage() {
  const router = useRouter();
  const { setPatient } = usePatientAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !auth) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor ingrese su email y contraseña.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    try {
      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Step 2: Fetch patient profile from Firestore using the email
        const allPatients = await getPatients();
        const foundPatient = allPatients.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());

        if (foundPatient) {
          // Step 3: Set patient data in context and redirect
          setPatient(foundPatient);
          router.push('/patient-portal/dashboard');
        } else {
          toast({
            title: 'Perfil no encontrado',
            description: 'Sus credenciales son correctas, pero no encontramos un perfil de paciente asociado a este email. Es posible que su solicitud de cuenta esté pendiente de aprobación.',
            variant: 'destructive',
          });
          setLoading(false);
        }
      }
    } catch (error) {
      toast({
        title: 'Acceso Denegado',
        description: 'El email o la contraseña son incorrectos.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
            <Link href="/" className="mx-auto block">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                    alt="Skol Pharmacy Logo"
                    width={200}
                    height={55}
                    className="mx-auto"
                    priority
                />
            </Link>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Portal del Paciente</CardTitle>
                    <CardDescription>Accede para gestionar tus tratamientos y comunicarte con nosotros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="tu.email@ejemplo.com"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={loading}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Contraseña</Label>
                           <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
             <p className="px-8 text-center text-sm text-muted-foreground">
                ¿No tienes una cuenta?{' '}
                <Link 
                    href="/patient-portal/register" 
                    className="font-medium text-primary hover:underline"
                >
                    Regístrate aquí
                </Link>
            </p>
        </div>
    </div>
  );
}

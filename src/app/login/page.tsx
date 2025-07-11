
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any)      {
      console.error(error);
      toast({
        title: 'Error de autenticación',
        description: 'Las credenciales son incorrectas. Por favor, inténtelo de nuevo.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left Branding Panel */}
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12 lg:text-center">
        <div className="space-y-4 max-w-md">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
            alt="Skol Pharmacy Logo"
            width={250}
            height={69}
            className="mx-auto"
            priority
          />
          <h1 className="text-4xl font-bold font-headline mt-6">
            Sistema Integral de Gestión Skol
          </h1>
          <p className="opacity-90">
            Optimizando el ciclo de vida de las recetas magistrales con precisión y eficiencia.
          </p>
        </div>
      </div>
      
      {/* Right Form Panel / Mobile View */}
      <div className="bg-background flex flex-col items-center justify-center p-6 lg:p-4 min-h-screen">
        <div className="lg:hidden mb-8">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                alt="Skol Pharmacy Logo"
                width={200}
                height={55}
                className="mx-auto"
                priority
            />
        </div>
        <div className="w-full max-w-sm space-y-6">
            <div className="w-full bg-card rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold font-headline text-foreground">
                    Acceso de Administrador
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bienvenido de vuelta. Ingrese sus credenciales.
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@skol.cl"
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
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                  </Button>
                </form>
            </div>
            <p className="px-8 text-center text-sm text-muted-foreground">
              ¿Es usted un paciente?{' '}
              <Link href="/patient-portal/login" className="font-semibold text-primary hover:underline">
                Ingrese al Portal de Pacientes
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}

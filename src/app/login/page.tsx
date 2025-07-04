
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
      <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center bg-sky-800">
        <div className="space-y-4 max-w-md">
          <Image
            src="https://placehold.co/150x150.png"
            data-ai-hint="logo pharmacy white"
            alt="Skol Pharmacy Logo"
            width={150}
            height={150}
            className="mx-auto"
            priority
          />
          <h1 className="text-4xl font-bold text-white font-headline mt-6">
            Sistema Integral de Gestión Skol
          </h1>
          <p className="text-white/90">
            Optimizando el ciclo de vida de las recetas magistrales con precisión y eficiencia.
          </p>
        </div>
      </div>
      
      {/* Right Form Panel - Apply blue background on mobile, white on large screens */}
      <div className="flex items-center justify-center py-12 px-4 bg-sky-800 lg:bg-background">
        <div className="w-full max-w-sm space-y-8">
            <Image
                src="https://placehold.co/150x150.png"
                data-ai-hint="logo pharmacy white"
                alt="Skol Pharmacy Logo"
                width={150}
                height={150}
                className="mx-auto lg:hidden"
                priority
            />
            <div className="w-full bg-card rounded-xl shadow-xl p-8 space-y-6">
                <div className="text-left">
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

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                  </Button>
                </form>
            </div>
            <p className="px-8 text-center text-sm text-white/90 lg:text-muted-foreground">
              ¿Es usted un paciente?{' '}
              <Link href="/patient-portal/login" className="font-semibold text-white hover:underline lg:font-medium lg:text-primary">
                Ingrese al Portal de Pacientes
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}

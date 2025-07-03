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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    } catch (error: any) {
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
    <div className="w-full min-h-screen lg:grid lg:grid-cols-5">
      {/* Decorative Sidebar */}
      <div className="hidden bg-blue-900 lg:col-span-2 lg:flex flex-col items-center justify-center p-10 text-center text-white">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20BLANCO.png?alt=media&token=d39d318e-4e52-4215-8941-1a1b4cae7948"
            alt="Skol Pharmacy Logo"
            width={120}
            height={120}
            className="mx-auto mb-8"
            priority
          />
           <div className="mx-auto max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold font-headline mb-4">
              Sistema Integral de Gestión Skol
            </h2>
            <p className="text-sm lg:text-base font-body text-white/80">
              Optimizando el ciclo de vida de las recetas magistrales con precisión y eficiencia.
            </p>
          </div>
      </div>
      
      {/* Login Form Area */}
      <div className="flex items-center justify-center p-6 bg-background lg:col-span-3">
        <div className="w-full max-w-sm mx-auto">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                alt="Skol Pharmacy Logo"
                width={120}
                height={40}
                className="mx-auto mb-6 lg:hidden"
                priority
            />
            
            <Card className="p-4 sm:p-6 shadow-xl rounded-xl border-0">
                <CardHeader className="text-center p-0 mb-6">
                    <CardTitle className="text-2xl font-bold font-headline">Acceso de Administrador</CardTitle>
                    <CardDescription>
                        Bienvenido de vuelta. Ingrese sus credenciales.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
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
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
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
                                    className="pl-9"
                                    placeholder="••••••"
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm">
                ¿Es usted un paciente?{' '}
                <Link href="/patient-portal/login" className="underline text-accent hover:text-accent/90">
                    Ingrese al Portal de Pacientes
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}

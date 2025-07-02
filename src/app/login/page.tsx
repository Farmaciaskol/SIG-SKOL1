'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail } from 'lucide-react';
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
      // On successful login, AuthProvider will redirect to '/'
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error de autenticación',
        description: 'Las credenciales son incorrectas. Por favor, inténtelo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-primary lg:flex flex-col items-center justify-center p-12 text-center text-primary-foreground">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
          alt="Skol Pharmacy Logo"
          width={100}
          height={100}
          className="mb-8"
          priority
        />
        <div className="mx-auto max-w-sm">
          <h2 className="text-3xl font-bold font-headline mb-4">
            Sistema Integral de Gestión Skol
          </h2>
          <p className="text-base text-primary-foreground/80">
            Optimizando el ciclo de vida de las recetas magistrales con precisión y eficiencia.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 min-h-screen bg-background">
        <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
                <h1 className="text-3xl font-bold font-headline">Acceso de Administrador</h1>
                <p className="text-balance text-muted-foreground">
                    Bienvenido de vuelta. Ingrese sus credenciales.
                </p>
            </div>
            <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
                    {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                </Button>
            </form>
            <div className="mt-4 text-center text-sm">
                ¿Es usted un paciente?{' '}
                <Link href="#" className="underline text-primary/80 hover:text-primary">
                    Ingrese al Portal de Pacientes
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}

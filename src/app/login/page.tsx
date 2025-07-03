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
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
            alt="Skol Pharmacy Logo"
            width={100}
            height={35}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-2xl font-bold font-headline text-foreground">
            Accede a tu cuenta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistema Integral de Gestión Skol
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="sr-only">Email</Label>
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
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="sr-only">Contraseña</Label>
                <Link
                    href="#"
                    className="text-sm font-medium text-primary hover:underline"
                >
                    ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  placeholder="Contraseña"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          ¿Eres un paciente?{' '}
          <Link href="/patient-portal/login" className="font-medium text-primary hover:underline">
            Accede al Portal de Pacientes
          </Link>
        </p>
      </div>
    </div>
  );
}

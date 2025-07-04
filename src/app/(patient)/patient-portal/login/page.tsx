
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

export default function PatientPortalLoginPage() {
  const router = useRouter();
  const { setPatient } = usePatientAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // This is a MOCK login. In a real app, you would use Firebase Auth's signInWithEmailAndPassword.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor ingrese su email y contraseña.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    try {
      // In a real app, this would be a single, secure call to Firebase Auth.
      // Here, we simulate by fetching all patients and finding one by email.
      // This is insecure and not performant for production.
      const allPatients = await getPatients();
      const foundPatient = allPatients.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());

      if (foundPatient) {
        // We are NOT checking the password. This is a prototype limitation.
        setPatient(foundPatient);
        router.push('/patient-portal/dashboard');
      } else {
        toast({
          title: 'Acceso Denegado',
          description: 'El email o la contraseña son incorrectos.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al intentar acceder al portal.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
            <Link href="/" className="mx-auto block">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/FARMACIA_SK.jpg?alt=media&token=42d10668-3e42-498c-84bc-2a07c645e998"
                    alt="Skol Pharmacy Logo"
                    width={120}
                    height={120}
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
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
             <p className="px-8 text-center text-sm text-muted-foreground">
                ¿Olvidaste tu contraseña?{' '}
                <Link 
                    href="#" 
                    onClick={(e) => { 
                        e.preventDefault(); 
                        toast({ title: "Función no disponible", description: "La recuperación de contraseña se implementará en una futura versión." }) 
                    }} 
                    className="font-medium text-primary hover:underline"
                >
                    Recuperar aquí
                </Link>
            </p>
        </div>
    </div>
  );
}

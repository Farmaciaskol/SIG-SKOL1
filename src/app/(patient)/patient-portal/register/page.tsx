
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { addUserRequest } from '@/lib/data';

export default function PatientPortalRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !rut || !auth) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor complete todos los campos.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Step 2: Create a user request in Firestore
        await addUserRequest({
          name,
          rut,
          email,
          firebaseUid: firebaseUser.uid,
        });
        setIsSubmitted(true);
      }
    } catch (error: any) {
      let description = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este email ya está en uso. Si ya tiene una cuenta, por favor inicie sesión.';
      } else if (error.code === 'auth/weak-password') {
        description = 'La contraseña debe tener al menos 6 caracteres.';
      }
      toast({
        title: 'Error en el Registro',
        description: description,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 text-center">
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
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">Solicitud Enviada</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">¡Gracias por registrarte! Tu solicitud de cuenta ha sido enviada.</p>
                        <p className="mt-2 text-muted-foreground">Nuestro equipo la revisará y recibirás una notificación cuando sea aprobada. Este proceso puede tardar hasta 24 horas hábiles.</p>
                        <Button asChild className="mt-6 w-full h-11 text-base">
                            <Link href="/patient-portal/login">Volver al Inicio de Sesión</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
  }

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
                    <CardTitle className="text-2xl font-headline">Crear Cuenta de Paciente</CardTitle>
                    <CardDescription>Complete sus datos para solicitar acceso al portal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                         <div className="space-y-2">
                          <Label htmlFor="name">Nombre Completo</Label>
                           <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="name" type="text" placeholder="Juan Pérez" required value={name} onChange={(e) => setName(e.target.value)} disabled={loading} className="pl-10" />
                          </div>
                        </div>
                         <div className="space-y-2">
                          <Label htmlFor="rut">RUT</Label>
                           <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="rut" type="text" placeholder="12.345.678-9" required value={rut} onChange={(e) => setRut(e.target.value)} disabled={loading} className="pl-10" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="email" type="email" placeholder="tu.email@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="pl-10"/>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Contraseña</Label>
                           <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="pl-10" />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Registrarme'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
             <p className="px-8 text-center text-sm text-muted-foreground">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/patient-portal/login" className="font-medium text-primary hover:underline">
                    Inicia sesión aquí
                </Link>
            </p>
        </div>
    </div>
  );
}

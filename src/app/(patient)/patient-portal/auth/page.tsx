
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePatientAuth } from '@/components/app/patient-auth-provider';
import { validatePatientToken } from '@/lib/actions';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokenAndPatient } = usePatientAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('No se ha proporcionado un token de acceso.');
      return;
    }

    const verifyToken = async () => {
      const result = await validatePatientToken(token);
      if (result.success && result.patient && result.token) {
        setTokenAndPatient(result.token, result.patient);
        setStatus('success');
        router.push('/patient-portal/dashboard');
      } else {
        setStatus('error');
        setError(result.error || 'El enlace de acceso es inválido o ha expirado.');
      }
    };

    verifyToken();
  }, [searchParams, router, setTokenAndPatient]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Verificando Acceso</CardTitle>
        <CardDescription>Un momento, estamos validando tu enlace de acceso seguro.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Verificando...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <ShieldCheck className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-green-600">¡Acceso concedido!</p>
            <p className="text-muted-foreground text-center">Serás redirigido a tu portal en un instante.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <ShieldX className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-destructive">{error}</p>
            <Button asChild>
              <Link href="/patient-portal/login">Volver al Inicio</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}


export default function PatientPortalAuthPage() {
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Suspense fallback={<div className="text-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                <AuthContent />
            </Suspense>
        </div>
    )
}

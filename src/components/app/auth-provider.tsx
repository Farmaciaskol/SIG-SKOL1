
'use client';

import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2 } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  // `auth` is guaranteed to be defined here by the check in AuthProvider
  const [user, loading] = useAuthState(auth!);
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/dashboard');
    } else {
      setIsVerifying(false);
    }
  }, [user, loading, router, pathname]);

  if (isVerifying || loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!auth) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background text-foreground p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 font-headline">Configuración de Firebase Requerida</h1>
          <p className="mb-4">La aplicación no pudo inicializar la conexión con Firebase. Esto usualmente significa que las credenciales de Firebase no han sido configuradas correctamente.</p>
          <p className="text-sm text-muted-foreground">Por favor, asegúrese de que el archivo <code>.env</code> en la raíz del proyecto contenga las variables de entorno correctas de su proyecto de Firebase y luego recargue la página.</p>
        </div>
      </div>
    );
  }

  return <AuthGuard>{children}</AuthGuard>;
}

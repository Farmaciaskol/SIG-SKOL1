'use client';

import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      router.push('/login');
    }

    if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  const isAuthPage = pathname === '/login';
  if ((!user && !isAuthPage) || (user && isAuthPage)) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  return <>{children}</>;
}

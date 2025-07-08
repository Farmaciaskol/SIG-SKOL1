
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UserManagementRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified settings page, on the 'users' tab
    router.replace('/settings');
  }, [router]);

  // Show a loader while redirecting
  return (
    <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Redireccionando a Configuración...</p>
    </div>
  );
}

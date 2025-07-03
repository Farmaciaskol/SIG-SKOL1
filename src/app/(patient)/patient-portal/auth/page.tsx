'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PatientPortalAuthPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the new simple login/entry page
        router.replace('/patient-portal/login');
    }, [router]);

    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Redirigiendo...</p>
            </div>
        </div>
    );
}

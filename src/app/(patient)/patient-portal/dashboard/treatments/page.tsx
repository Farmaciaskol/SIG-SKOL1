'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function TreatmentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/patient-portal/dashboard">
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Mis Tratamientos</h1>
            </div>

            <Card className="text-center py-16 shadow-none border-dashed">
                <CardHeader>
                    <CardTitle>Próximamente</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Esta sección está en desarrollo y pronto mostrará el detalle de todos tus tratamientos activos.</p>
                </CardContent>
            </Card>
        </div>
    );
}

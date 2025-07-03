
'use client';

import { useState } from 'react';
import { generatePatientMagicLink } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, KeyRound, User, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PatientPortalLoginPage() {
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const { toast } = useToast();

  const handleGetMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rut.trim()) {
      toast({ title: "Campo Requerido", description: "Por favor, ingresa tu RUT.", variant: 'destructive' });
      return;
    }
    setLoading(true);
    setMagicLink('');
    try {
      const result = await generatePatientMagicLink(rut);
      if (result.success && result.magicLink) {
        setMagicLink(result.magicLink);
        toast({ title: "¡Enlace Generado!", description: "Usa el enlace a continuación para acceder de forma segura." });
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center space-y-4">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
            alt="Skol Pharmacy Logo"
            width={120}
            height={40}
            className="mx-auto"
            priority
          />
          <CardTitle className="text-2xl font-bold">Portal del Paciente</CardTitle>
          <CardDescription>Accede a tu información y gestiona tus tratamientos de forma segura.</CardDescription>
        </CardHeader>
        <CardContent>
          {!magicLink ? (
            <form onSubmit={handleGetMagicLink} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ingresa tu RUT para recibir tu enlace de acceso. En una aplicación real, este enlace se enviaría a tu correo electrónico.
                </p>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="rut"
                        placeholder="Ej: 12.345.678-9"
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        disabled={loading}
                        className="pl-9"
                    />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Generando...' : 'Obtener Enlace de Acceso'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="font-semibold">Enlace de Acceso Generado</h3>
              <p className="text-sm text-muted-foreground">
                Haz clic en el siguiente enlace para ingresar a tu portal. Este enlace es de un solo uso y expirará pronto.
              </p>
              <Button asChild className="w-full">
                <Link href={magicLink}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Ingresar a mi Portal
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

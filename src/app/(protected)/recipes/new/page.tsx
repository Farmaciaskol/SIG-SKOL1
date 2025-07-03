
'use client';

import { RecipeForm } from '@/components/app/recipe-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function NewRecipePage() {
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom') ?? undefined;
  const patientId = searchParams.get('patientId') ?? undefined;

  const title = patientId
    ? 'Nueva Receta para Paciente'
    : copyFromId
    ? 'Copiar Receta'
    : 'Crear Nueva Receta';

  const description = patientId
    ? 'El paciente y su médico asociado han sido pre-seleccionados.'
    : copyFromId
    ? 'Ajusta los detalles y guarda la nueva copia de la receta.'
    : 'Rellena los detalles para registrar una nueva receta magistral.';


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/recipes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      
      <RecipeForm copyFromId={copyFromId} patientId={patientId} />
    </div>
  );
}

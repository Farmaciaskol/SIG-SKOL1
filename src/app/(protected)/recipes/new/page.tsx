
'use client';

import { RecipeForm } from '@/components/app/recipe-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function NewRecipePage() {
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom') ?? undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/recipes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">
            {copyFromId ? 'Copiar Receta' : 'Crear Nueva Receta'}
          </h1>
          <p className="text-muted-foreground">
            {copyFromId ? 'Ajusta los detalles y guarda la nueva copia de la receta.' : 'Rellena los detalles para registrar una nueva receta magistral.'}
          </p>
        </div>
      </div>
      
      <RecipeForm copyFromId={copyFromId}/>
    </div>
  );
}

    

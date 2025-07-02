
'use client';

import { RecipeForm } from '@/components/app/recipe-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditRecipePage() {
  const params = useParams();
  const id = params.id as string;

  return (
     <div className="space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/recipes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Editar Receta #{id}</h1>
          <p className="text-muted-foreground">Modifica los detalles de la receta magistral.</p>
        </div>
      </div>
      
      <RecipeForm recipeId={id} />
    </div>
  );
}

    
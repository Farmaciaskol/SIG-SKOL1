
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
     <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-shrink-0 flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/recipes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Editar Receta #{id}</h1>
          <p className="text-sm text-muted-foreground">Modifica los detalles de la receta magistral.</p>
        </div>
      </div>
      
      <div className="flex-grow overflow-hidden">
        <RecipeForm recipeId={id} />
      </div>
    </div>
  );
}

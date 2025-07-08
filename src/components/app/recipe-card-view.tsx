
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Snowflake, DollarSign, UserSquare, Split, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusConfig, MAX_REPREPARATIONS } from '@/lib/constants';
import { Recipe, RecipeStatus } from '@/lib/types';
import { MobileRecipeActions } from './recipe-actions';

type RecipeCardViewProps = {
  recipes: Recipe[];
  selectedRecipes: string[];
  toggleSelectRecipe: (id: string) => void;
  getPatientName: (id: string) => string;
  actionHandlers: any;
};

const calculateTotalCycles = (recipe: Recipe): number => {
    if (!recipe.dueDate || !recipe.createdAt || !recipe.items?.[0]) {
      return MAX_REPREPARATIONS + 1;
    }
  
    try {
      const prescriptionLifespanInDays = differenceInDays(parseISO(recipe.dueDate), parseISO(recipe.createdAt));
      if (prescriptionLifespanInDays <= 0) return 1;
  
      const item = recipe.items[0];
      const durationValue = parseInt(item.treatmentDurationValue, 10);
      if (isNaN(durationValue)) return MAX_REPREPARATIONS + 1;
  
      let cycleDurationInDays = 0;
  
      switch (item.treatmentDurationUnit) {
        case 'días':
          cycleDurationInDays = durationValue;
          break;
        case 'semanas':
          cycleDurationInDays = durationValue * 7;
          break;
        case 'meses':
          cycleDurationInDays = durationValue * 30;
          break;
        default:
          cycleDurationInDays = 30; // Fallback for unknown units
      }
  
      if (cycleDurationInDays <= 0) return 1;
  
      const estimatedCyclesByDate = Math.floor(prescriptionLifespanInDays / cycleDurationInDays);
      const finalEstimatedCycles = Math.max(1, estimatedCyclesByDate);
      return Math.min(finalEstimatedCycles, MAX_REPREPARATIONS + 1);
    } catch (e) {
      console.error("Error calculating total cycles for recipe", recipe.id, e);
      return MAX_REPREPARATIONS + 1;
    }
};

export function RecipeCardView({ recipes, selectedRecipes, toggleSelectRecipe, getPatientName, actionHandlers }: RecipeCardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden mt-6">
      {recipes.map((recipe) => {
        const isPaymentPending = recipe.paymentStatus === 'Pendiente' && (recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup || recipe.status === RecipeStatus.Dispensed);
        const totalCycles = calculateTotalCycles(recipe);
        const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
        const showCycleCount = ![RecipeStatus.Archived, RecipeStatus.Rejected, RecipeStatus.Cancelled].includes(recipe.status);
        const currentCycle = Math.min(dispensedCount + 1, totalCycles);
        
        const isActive = ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected, RecipeStatus.Archived].includes(recipe.status);
        let isExpiringSoon = false;
        if (isActive && recipe.dueDate) {
            try {
                const dueDate = parseISO(recipe.dueDate);
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                isExpiringSoon = dueDate < thirtyDaysFromNow;
            } catch (e) { /* ignore */ }
        }

        return (
          <Card key={recipe.id} className={cn(selectedRecipes.includes(recipe.id) && "ring-2 ring-primary")}>
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)} className="mt-1 shrink-0" />
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">
                      <Link href={`/patients/${recipe.patientId}`} className="hover:underline">{getPatientName(recipe.patientId)}</Link>
                    </CardTitle>
                    <div className="flex flex-col items-start gap-1 mt-1">
                      <CardDescription className="text-xs">Receta <Link href={`/recipes/${recipe.id}`} className="font-mono text-muted-foreground hover:text-primary hover:underline">{recipe.id}</Link></CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-normal text-xs text-center whitespace-nowrap", statusConfig[recipe.status]?.badge)}>{statusConfig[recipe.status]?.text || recipe.status}</Badge>
                        {showCycleCount && (<Badge variant="secondary" className="font-mono text-xs">{`${currentCycle}/${totalCycles}`}</Badge>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isExpiringSoon && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><AlertTriangle className="h-4 w-4 text-orange-500" /></span></TooltipTrigger><TooltipContent><p>Receta vence pronto o está vencida.</p></TooltipContent></Tooltip></TooltipProvider>)}
                  {isPaymentPending && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><DollarSign className="h-4 w-4 text-amber-600" /></span></TooltipTrigger><TooltipContent><p>Pago pendiente</p></TooltipContent></Tooltip></TooltipProvider>)}
                  {recipe.status === RecipeStatus.PendingReviewPortal && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><UserSquare className="h-4 w-4 text-purple-600" /></span></TooltipTrigger><TooltipContent><p>Receta del Portal</p></TooltipContent></Tooltip></TooltipProvider>)}
                  {recipe.items.some(item => item.requiresFractionation) && (<TooltipProvider><Tooltip><TooltipTrigger asChild><span><Split className="h-4 w-4 text-orange-600" /></span></TooltipTrigger><TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent></Tooltip></TooltipProvider>)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {recipe.items.length > 0 ? (
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2" title={`${recipe.items[0].principalActiveIngredient} ${recipe.items[0].concentrationValue}${recipe.items[0].concentrationUnit}`}>{recipe.items[0].principalActiveIngredient}{' '}{recipe.items[0].concentrationValue}{recipe.items[0].concentrationUnit}{recipe.items.some(i => i.isRefrigerated) && <Snowflake className="h-4 w-4 text-blue-500" />}</p>
                  <p className="text-sm text-muted-foreground truncate" title={recipe.items[0].usageInstructions}>{recipe.items[0].usageInstructions}</p>
                  {recipe.items.length > 1 && (<p className="text-xs font-bold text-muted-foreground mt-1">+ {recipe.items.length - 1} más</p>)}
                </div>
              ) : (<p className="text-sm text-muted-foreground">Sin preparado</p>)}
              <p className="text-xs text-muted-foreground pt-1">Creada: {format(new Date(recipe.createdAt), "d MMM yyyy", { locale: es })}</p>
            </CardContent>
            <CardFooter className="p-3 bg-muted/50"><MobileRecipeActions recipe={recipe} {...actionHandlers} /></CardFooter>
          </Card>
        )
      })}
    </div>
  );
}

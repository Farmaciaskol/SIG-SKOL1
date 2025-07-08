
'use client';

import React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Snowflake, DollarSign, UserSquare, Split, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusConfig, MAX_REPREPARATIONS } from '@/lib/constants';
import { Recipe, RecipeStatus } from '@/lib/types';
import { RecipeActions } from './recipe-actions';

type RecipeTableViewProps = {
  recipes: Recipe[];
  selectedRecipes: string[];
  allOnPageSelected: boolean;
  toggleSelectAll: () => void;
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

export function RecipeTableView({ recipes, selectedRecipes, allOnPageSelected, toggleSelectAll, toggleSelectRecipe, getPatientName, actionHandlers }: RecipeTableViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="p-4"><Checkbox onCheckedChange={toggleSelectAll} checked={allOnPageSelected} /></TableHead>
          <TableHead>ID Receta</TableHead>
          <TableHead>Paciente</TableHead>
          <TableHead>Preparado</TableHead>
          <TableHead>Fecha Creación</TableHead>
          <TableHead>Estado / Logística</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipes.map((recipe) => {
          const StatusIcon = statusConfig[recipe.status]?.icon || FileX;
          const isPaymentPending = recipe.paymentStatus === 'Pendiente' && (recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup || recipe.status === RecipeStatus.Dispensed);
          const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
          const totalCycles = calculateTotalCycles(recipe);
          const showCycleCount = ![RecipeStatus.Archived, RecipeStatus.Rejected, RecipeStatus.Cancelled].includes(recipe.status);
          const currentCycle = Math.min(dispensedCount + 1, totalCycles);
          return (
            <TableRow key={recipe.id} className={cn("hover:bg-muted/50", selectedRecipes.includes(recipe.id) && "bg-muted/50")}>
              <TableCell className="p-4"><Checkbox onCheckedChange={() => toggleSelectRecipe(recipe.id)} checked={selectedRecipes.includes(recipe.id)} /></TableCell>
              <TableCell className="font-mono">
                <Link href={`/recipes/${recipe.id}`} className="text-muted-foreground hover:text-primary hover:underline">{recipe.id}</Link>
              </TableCell>
              <TableCell className="font-medium">{getPatientName(recipe.patientId)}</TableCell>
              <TableCell className="max-w-[300px]">
                {recipe.items.length > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2 truncate" title={`${recipe.items[0].principalActiveIngredient} ${recipe.items[0].concentrationValue}${recipe.items[0].concentrationUnit}`}>
                      {recipe.items[0].principalActiveIngredient}{' '}
                      {recipe.items[0].concentrationValue}
                      {recipe.items[0].concentrationUnit}
                      {recipe.items.some(i => i.isRefrigerated) && <Snowflake className="h-4 w-4 text-blue-500" />}
                    </span>
                    <span className="text-xs text-muted-foreground truncate" title={recipe.items[0].usageInstructions}>{recipe.items[0].usageInstructions}</span>
                    {recipe.items.length > 1 && <span className="text-xs font-bold text-muted-foreground mt-1">+ {recipe.items.length - 1} más</span>}
                  </div>
                ) : ('N/A')}
              </TableCell>
              <TableCell>{format(new Date(recipe.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge className={cn("font-normal", statusConfig[recipe.status]?.badge)}>
                    <StatusIcon className="h-3 w-3 mr-1.5" />
                    {statusConfig[recipe.status]?.text || recipe.status}
                  </Badge>
                  {showCycleCount && (
                    <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild><Badge variant="secondary" className="font-mono">{`${currentCycle}/${totalCycles}`}</Badge></TooltipTrigger>
                        <TooltipContent><p>Ciclos de preparación (Estimado)</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                  {isPaymentPending && (
                    <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild><span><DollarSign className="h-5 w-5 text-amber-600" /></span></TooltipTrigger>
                        <TooltipContent><p>Pago pendiente para esta receta.</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                  {recipe.status === RecipeStatus.PendingReviewPortal && (
                    <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild><span><UserSquare className="h-5 w-5 text-purple-600" /></span></TooltipTrigger>
                        <TooltipContent><p>Receta subida desde el Portal de Pacientes</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                  {recipe.items.some(item => item.requiresFractionation) && (
                    <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild><span><Split className="h-5 w-5 text-orange-600" /></span></TooltipTrigger>
                        <TooltipContent><p>Requiere Fraccionamiento</p></TooltipContent>
                    </Tooltip></TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right"><RecipeActions recipe={recipe} {...actionHandlers} /></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );
}

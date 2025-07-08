
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Printer,
  XCircle,
  Send,
  PackageCheck,
  Truck,
  Ban,
  CheckCheck,
  Package,
  ShieldCheck,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Recipe, RecipeStatus } from '@/lib/types';
import { MAX_REPREPARATIONS } from '@/lib/constants';
import { differenceInDays, parseISO } from 'date-fns';

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

type RecipeActionsProps = {
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onCancel: (recipe: Recipe) => void;
  onReprepare: (recipe: Recipe) => void;
  onArchive: (recipe: Recipe) => void;
  onSend: (recipe: Recipe) => void;
  onReceive: (recipe: Recipe) => void;
  onReadyForPickup: (recipe: Recipe) => void;
  onDispense: (recipe: Recipe) => void;
  onPrint: (recipe: Recipe) => void;
  onValidate: (recipe: Recipe) => void;
  onReject: (recipe: Recipe) => void;
};

export const RecipeActions = (props: RecipeActionsProps) => {
    const { recipe, onValidate, onReject, onSend, onReceive, onReadyForPickup, onDispense, onReprepare, onCancel, onDelete, onArchive, onView, onPrint } = props;
    const totalCycles = calculateTotalCycles(recipe);
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;
    const cycleLimitReached = dispensedCount >= totalCycles;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${totalCycles} ciclos estimado alcanzado.`;

    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const isArchivable = [RecipeStatus.Rejected, RecipeStatus.Cancelled, RecipeStatus.Dispensed].includes(recipe.status) || isExpired;

    return (
        <div className="flex items-center justify-end gap-1">
            {recipe.status === RecipeStatus.PendingValidation && (
                <>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onValidate(recipe)}>
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Validar</p></TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReject(recipe)}>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Rechazar</p></TooltipContent></Tooltip></TooltipProvider>
                </>
            )}
            
            {recipe.status === RecipeStatus.Validated && (
                recipe.supplySource === 'Insumos de Skol' ? (
                     <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dispatch-management`}><Truck className="h-4 w-4 text-blue-600" /></Link>
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Ir a Despachos</p></TooltipContent></Tooltip></TooltipProvider>
                ) : (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSend(recipe)}>
                            <Send className="h-4 w-4 text-cyan-600" />
                        </Button>
                    </TooltipTrigger><TooltipContent><p>Enviar a Recetario</p></TooltipContent></Tooltip></TooltipProvider>
                )
            )}

            {recipe.status === RecipeStatus.SentToExternal && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReceive(recipe)}>
                        <PackageCheck className="h-4 w-4 text-indigo-600" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Recepcionar Preparado</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            
             {recipe.status === RecipeStatus.ReceivedAtSkol && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReadyForPickup(recipe)}>
                        <Package className="h-4 w-4 text-orange-600" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Marcar para Retiro</p></TooltipContent></Tooltip></TooltipProvider>
            )}

            {recipe.status === RecipeStatus.ReadyForPickup && (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDispense(recipe)}>
                        <CheckCheck className="h-4 w-4 text-green-600" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Dispensar</p></TooltipContent></Tooltip></TooltipProvider>
            )}
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</DropdownMenuItem>
                    <DropdownMenuItem asChild disabled={!canEdit}><Link href={`/recipes/${recipe.id}`} className={!canEdit ? 'pointer-events-none' : ''}><Pencil className="mr-2 h-4 w-4" />Editar</Link></DropdownMenuItem>
                    {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
                        <DropdownMenuItem onClick={() => onPrint(recipe)}><Printer className="mr-2 h-4 w-4" />Imprimir Etiqueta</DropdownMenuItem>
                    )}
                    {recipe.status === RecipeStatus.Dispensed && (
                         <DropdownMenuItem disabled={!canReprepare} onSelect={() => canReprepare && onReprepare(recipe)}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center w-full">
                                            <Copy className="mr-2 h-4 w-4" />
                                            <span>Re-preparar</span>
                                        </div>
                                    </TooltipTrigger>
                                    {!canReprepare && disabledReprepareTooltip && (
                                    <TooltipContent>
                                        <p>{disabledReprepareTooltip}</p>
                                    </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                         </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {isArchivable && (
                        <DropdownMenuItem className="text-gray-600 focus:text-gray-700 focus:bg-gray-100" onClick={() => onArchive(recipe)}>
                            <Archive className="mr-2 h-4 w-4" />Archivar
                        </DropdownMenuItem>
                    )}
                    {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
                        <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => onCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular Receta</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => onDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export const MobileRecipeActions = (props: RecipeActionsProps) => {
    const { recipe, onValidate, onReject, onSend, onReceive, onReadyForPickup, onDispense, onReprepare, onCancel, onDelete, onArchive, onView, onPrint } = props;
    const router = useRouter();
    const canEdit = recipe.status !== RecipeStatus.Dispensed && recipe.status !== RecipeStatus.Cancelled;
    const isArchivable = [RecipeStatus.Rejected, RecipeStatus.Cancelled, RecipeStatus.Dispensed].includes(recipe.status) || (recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false);
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !(recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false) && (recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0) < calculateTotalCycles(recipe);
    
    return (
      <div className="flex justify-end items-center w-full gap-2">
        {recipe.status === RecipeStatus.PendingValidation ? (
          <>
            <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600 flex-1" onClick={() => onReject(recipe)}>
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onValidate(recipe)}>
              <ShieldCheck className="mr-2 h-4 w-4 text-white" />
              Validar
            </Button>
          </>
        ) : (
          <div className="flex-1">
             <ActionButton 
                recipe={recipe}
                onSend={onSend}
                onReceive={onReceive}
                onReadyForPickup={onReadyForPickup}
                onDispense={onDispense}
                onReprepare={onReprepare}
                onView={onView}
            />
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" className="flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</DropdownMenuItem>
            <DropdownMenuItem disabled={!canEdit} onSelect={() => canEdit && router.push(`/recipes/${recipe.id}`)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
            {(recipe.status === RecipeStatus.ReceivedAtSkol || recipe.status === RecipeStatus.ReadyForPickup) && (
              <DropdownMenuItem onClick={() => onPrint(recipe)}><Printer className="mr-2 h-4 w-4" />Imprimir Etiqueta</DropdownMenuItem>
            )}
            {recipe.status === RecipeStatus.Dispensed && (
              <DropdownMenuItem disabled={!canReprepare} onSelect={() => canReprepare && onReprepare(recipe)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Re-preparar</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isArchivable && (
                <DropdownMenuItem className="text-gray-600 focus:text-gray-700 focus:bg-gray-100" onClick={() => onArchive(recipe)}>
                    <Archive className="mr-2 h-4 w-4" />Archivar
                </DropdownMenuItem>
            )}
            {recipe.status !== RecipeStatus.Cancelled && recipe.status !== RecipeStatus.Dispensed && (
              <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => onCancel(recipe)}><Ban className="mr-2 h-4 w-4" />Anular Receta</DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => onDelete(recipe)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
};

const ActionButton = ({ recipe, onSend, onReceive, onReadyForPickup, onDispense, onReprepare, onView }: {
    recipe: Recipe;
    onSend: (r: Recipe) => void;
    onReceive: (r: Recipe) => void;
    onReadyForPickup: (r: Recipe) => void;
    onDispense: (r: Recipe) => void;
    onReprepare: (r: Recipe) => void;
    onView: (r: Recipe) => void;
}) => {
    const totalCycles = calculateTotalCycles(recipe);
    const dispensedCount = recipe.auditTrail?.filter(e => e.status === RecipeStatus.Dispensed).length ?? 0;
    const isExpired = recipe.dueDate ? new Date(recipe.dueDate) < new Date() : false;
    const cycleLimitReached = dispensedCount >= totalCycles;
    const canReprepare = recipe.status === RecipeStatus.Dispensed && !isExpired && !cycleLimitReached;
    let disabledReprepareTooltip = '';
    if (isExpired) disabledReprepareTooltip = 'El documento de la receta ha vencido.';
    else if (cycleLimitReached) disabledReprepareTooltip = `Límite de ${totalCycles} ciclos estimado alcanzado.`;

    switch (recipe.status) {
        case RecipeStatus.PendingValidation:
          return null;
        case RecipeStatus.Validated:
          return recipe.supplySource === 'Insumos de Skol' 
            ? <Button size="sm" asChild><Link href="/dispatch-management"><Truck className="mr-2 h-4 w-4 text-white" />Ir a Despacho</Link></Button>
            : <Button size="sm" onClick={() => onSend(recipe)}><Send className="mr-2 h-4 w-4 text-white" />Enviar</Button>;
        case RecipeStatus.SentToExternal:
          return <Button size="sm" onClick={() => onReceive(recipe)}><PackageCheck className="mr-2 h-4 w-4 text-white" />Recepcionar</Button>;
        case RecipeStatus.ReceivedAtSkol:
          return <Button size="sm" onClick={() => onReadyForPickup(recipe)}><Package className="mr-2 h-4 w-4 text-white" />Marcar Retiro</Button>;
        case RecipeStatus.ReadyForPickup:
          return <Button size="sm" onClick={() => onDispense(recipe)}><CheckCheck className="mr-2 h-4 w-4 text-white" />Dispensar</Button>;
        case RecipeStatus.Dispensed:
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button size="sm" onClick={() => onReprepare(recipe)} disabled={!canReprepare}>
                      <Copy className="mr-2 h-4 w-4" />Re-preparar
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canReprepare && disabledReprepareTooltip && (
                  <TooltipContent>
                    <p>{disabledReprepareTooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        default:
          return <Button size="sm" onClick={() => onView(recipe)}><Eye className="mr-2 h-4 w-4" />Ver Detalle</Button>;
      }
};

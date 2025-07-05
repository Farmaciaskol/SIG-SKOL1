
import { DashboardClient } from '@/components/app/dashboard-client';
import { getRecipes, getPatients, getInventory } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';
import {
  Inbox,
  FlaskConical,
  Box,
  DollarSign,
} from 'lucide-react';

type CalendarEvent = {
    date: Date;
    title: string;
    type: 'received' | 'ready' | 'dispensed';
};

export default async function DashboardPage() {
  const [recipesData, patientsData, inventoryData] = await Promise.all([
    getRecipes(),
    getPatients(),
    getInventory(),
  ]);

  const pendingPayments = recipesData
      .filter(r => r.paymentStatus === 'Pendiente')
      .reduce((sum, r) => sum + (r.preparationCost || 0) + (r.transportCost || 0), 0);

  const kpis = [
    { title: 'Bandeja de Entrada Portal', value: recipesData.filter(r => r.status === RecipeStatus.PendingReviewPortal).length, icon: Inbox, href: '/portal-inbox' },
    { title: 'En Preparación', value: recipesData.filter(r => r.status === RecipeStatus.Preparation).length, icon: FlaskConical, href: '/recipes?status=En+Preparación' },
    { title: 'Ítems con Stock Bajo', value: inventoryData.filter(i => i.quantity < i.lowStockThreshold).length, icon: Box, href: '/inventory' },
    { title: 'Recetas por Pagar', value: `$${pendingPayments.toLocaleString('es-CL')}`, icon: DollarSign, href: '/financial-management' },
  ];
  
  const calendarEvents = recipesData
    .flatMap(recipe => {
      const events: CalendarEvent[] = [];
      
      if (recipe.status === RecipeStatus.Dispensed && recipe.dispensationDate && isValid(parseISO(recipe.dispensationDate))) {
        events.push({
          date: parseISO(recipe.dispensationDate),
          title: `Dispensada: Receta ${recipe.id.substring(0, 6)}...`,
          type: 'dispensed'
        });
      }

      if (recipe.auditTrail) {
        const receivedEvent = recipe.auditTrail.find(t => t.status === RecipeStatus.ReceivedAtSkol);
        if (receivedEvent && isValid(parseISO(receivedEvent.date))) {
          events.push({
            date: parseISO(receivedEvent.date),
            title: `Recepcionada: Receta ${recipe.id.substring(0, 6)}...`,
            type: 'received'
          });
        }

        const readyEvent = recipe.auditTrail.find(t => t.status === RecipeStatus.ReadyForPickup);
        if (readyEvent && isValid(parseISO(readyEvent.date))) {
          events.push({
            date: parseISO(readyEvent.date),
            title: `Lista para Retiro: Receta ${recipe.id.substring(0, 6)}...`,
            type: 'ready'
          });
        }
      }
      
      return events;
    })
    .filter(event => isValid(event.date));

    return (
        <DashboardClient
            kpis={kpis}
            recipes={recipesData}
            patients={patientsData}
            calendarEvents={calendarEvents}
        />
    );
}

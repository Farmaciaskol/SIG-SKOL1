
import { DashboardClient } from '@/components/app/dashboard-client';
import { getRecipes, getPatients, getInventory } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';

type CalendarEvent = {
    date: Date;
    title: string;
    type: 'created' | 'received' | 'ready' | 'dispensed';
};

export default async function DashboardPage() {
  const [recipesData, patientsData, inventoryData] = await Promise.all([
    getRecipes(),
    getPatients(),
    getInventory(),
  ]);
  
  const calendarEvents = recipesData
    .flatMap(recipe => {
      const events: CalendarEvent[] = [];

      if (recipe.createdAt && isValid(parseISO(recipe.createdAt))) {
        events.push({
          date: parseISO(recipe.createdAt),
          title: `Creada: Receta ${recipe.id.substring(0, 6)}...`,
          type: 'created'
        });
      }
      
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
            title: `Recepcionado: Receta ${recipe.id.substring(0, 6)}...`,
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
            recipes={recipesData}
            patients={patientsData}
            inventory={inventoryData}
            calendarEvents={calendarEvents}
        />
    );
}

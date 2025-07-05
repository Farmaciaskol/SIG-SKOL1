
import { DashboardClient } from '@/components/app/dashboard-client';
import { getRecipes, getPatients, getInventory, getExternalPharmacies } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';
import { addBusinessDays } from '@/lib/utils';

type CalendarEvent = {
    date: Date;
    title: string;
    type: 'created' | 'received' | 'ready' | 'dispensed' | 'sentToPharmacy' | 'estimatedReception';
};

export default async function DashboardPage() {
  const [recipesData, patientsData, inventoryData, externalPharmaciesData] = await Promise.all([
    getRecipes(),
    getPatients(),
    getInventory(),
    getExternalPharmacies(),
  ]);
  
  const calendarEvents = recipesData
    .flatMap(recipe => {
      const events: CalendarEvent[] = [];

      // Evento de Creación
      if (recipe.createdAt && isValid(parseISO(recipe.createdAt))) {
        events.push({
          date: parseISO(recipe.createdAt),
          title: `Creada: Receta ${recipe.id.substring(0, 6)}...`,
          type: 'created'
        });
      }
      
      // Evento de Dispensación
      if (recipe.status === RecipeStatus.Dispensed && recipe.dispensationDate && isValid(parseISO(recipe.dispensationDate))) {
        events.push({
          date: parseISO(recipe.dispensationDate),
          title: `Dispensada: Receta ${recipe.id.substring(0, 6)}...`,
          type: 'dispensed'
        });
      }

      if (recipe.auditTrail) {
        // Evento de Recepción Real
        const receivedEvent = recipe.auditTrail.find(t => t.status === RecipeStatus.ReceivedAtSkol);
        if (receivedEvent && isValid(parseISO(receivedEvent.date))) {
          events.push({
            date: parseISO(receivedEvent.date),
            title: `Recepcionado: Receta ${recipe.id.substring(0, 6)}...`,
            type: 'received'
          });
        }

        // Evento de Listo para Retiro
        const readyEvent = recipe.auditTrail.find(t => t.status === RecipeStatus.ReadyForPickup);
        if (readyEvent && isValid(parseISO(readyEvent.date))) {
          events.push({
            date: parseISO(readyEvent.date),
            title: `Lista para Retiro: Receta ${recipe.id.substring(0, 6)}...`,
            type: 'ready'
          });
        }
        
        // Evento de Envío y Recepción Estimada
        const sentToExternalEvent = recipe.auditTrail.find(t => t.status === RecipeStatus.SentToExternal);
        if (sentToExternalEvent && isValid(parseISO(sentToExternalEvent.date))) {
            const sentDate = parseISO(sentToExternalEvent.date);
            events.push({
              date: sentDate,
              title: `Enviada a Recetario: Receta ${recipe.id.substring(0, 6)}...`,
              type: 'sentToPharmacy',
            });

            if (recipe.externalPharmacyId) {
                const pharmacy = externalPharmaciesData.find(p => p.id === recipe.externalPharmacyId);
                if (pharmacy) {
                    const commitmentDays = recipe.supplySource === 'Insumos de Skol' 
                        ? pharmacy.skolSuppliedPreparationTime 
                        : pharmacy.standardPreparationTime;
                    
                    if (commitmentDays && commitmentDays > 0) {
                        const estimatedReceptionDate = addBusinessDays(sentDate, commitmentDays);
                        events.push({
                            date: estimatedReceptionDate,
                            title: `Recepción Estimada: Receta ${recipe.id.substring(0,6)}...`,
                            type: 'estimatedReception',
                        });
                    }
                }
            }
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

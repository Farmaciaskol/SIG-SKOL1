
'use server';

import { 
  getPatients,
  updatePatient, 
  syncFraccionamientoStock,
} from './data';
import { analyzePatientForProactiveAlerts } from '@/ai/flows/analyze-patient-proactive-alerts';
import { MAX_REPREPARATIONS } from './constants';

/**
 * Iterates through all chronic patients, analyzes their medication history using an AI flow,
 * and updates their proactive status in the database.
 */
export async function runProactiveAnalysisForAllPatients(): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    const allPatients = await getPatients();
    const allRecipes = await require('./data').getRecipes();
    const chronicPatients = allPatients.filter(p => p.isChronic);

    if (chronicPatients.length === 0) {
      return { success: true, updatedCount: 0, message: 'No chronic patients to analyze.' };
    }
    
    let updatedCount = 0;

    for (const patient of chronicPatients) {
      const patientRecipes = allRecipes.filter(r => r.patientId === patient.id);
      
      const analysisInput = {
        patient: patient,
        recipes: patientRecipes,
        currentDate: new Date().toISOString(),
        maxCycles: MAX_REPREPARATIONS,
      };

      try {
        const result = await analyzePatientForProactiveAlerts(analysisInput);
        
        // Check if there's an actual change to avoid unnecessary writes
        if (
          result.proactiveStatus !== patient.proactiveStatus ||
          result.proactiveMessage !== patient.proactiveMessage ||
          result.actionNeeded !== patient.actionNeeded
        ) {
          await updatePatient(patient.id, {
            proactiveStatus: result.proactiveStatus,
            proactiveMessage: result.proactiveMessage,
            actionNeeded: result.actionNeeded,
          });
          updatedCount++;
        }
      } catch (aiError) {
        console.error(`AI analysis failed for patient ${patient.id}:`, aiError);
        // Continue to the next patient even if one fails
      }
    }

    return { success: true, updatedCount, message: `Analysis complete. ${updatedCount} patients updated.` };
  } catch (error) {
    console.error('Failed to run proactive analysis for all patients:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, updatedCount: 0, message: `Analysis failed: ${errorMessage}` };
  }
}

/**
 * Triggers the synchronization of stock for "Fraccionamiento" items
 * between the local database and the Lioren API.
 */
export async function runStockSync(): Promise<{ success: boolean; updatedCount: number; message: string }> {
    return await syncFraccionamientoStock();
}

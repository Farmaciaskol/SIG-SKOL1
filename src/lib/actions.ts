
'use server';

import { 
  getPatients,
  getRecipes, 
  updatePatient, 
  findPatientByRut,
  createPatientAuthToken,
  validatePatientAuthToken as validateTokenDb,
  getRecipesReadyForPickup,
  getMessagesForPatient,
  createRecipeFromPortal as createRecipeDb,
  sendMessageFromPatient as sendMessageDb,
} from './data';
import { analyzePatientForProactiveAlerts } from '@/ai/flows/analyze-patient-proactive-alerts';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';
import { MAX_REPREPARATIONS } from './constants';

/**
 * Iterates through all chronic patients, analyzes their medication history using an AI flow,
 * and updates their proactive status in the database.
 */
export async function runProactiveAnalysisForAllPatients(): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    const allPatients = await getPatients();
    const allRecipes = await getRecipes();
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

// --- PATIENT PORTAL ACTIONS ---

export async function generatePatientMagicLink(rut: string) {
  try {
    const patient = await findPatientByRut(rut);
    if (!patient) {
      return { success: false, error: "RUT no encontrado o no registrado. Por favor, contacte a la farmacia." };
    }
    if (!patient.email) {
      return { success: false, error: "No hay un correo electrónico asociado a este RUT para enviar el enlace." };
    }
    const authToken = await createPatientAuthToken(patient.id);
    const magicLink = `/patient-portal/auth?token=${authToken.token}`;
    return { success: true, magicLink };
  } catch (error) {
    console.error("Error generating magic link:", error);
    return { success: false, error: "Ocurrió un error en el servidor." };
  }
}

export async function validatePatientToken(token: string) {
  try {
    const validationResult = await validateTokenDb(token);
    if (validationResult.patient) {
        return { success: true, patient: validationResult.patient, token: validationResult.token };
    } else {
        return { success: false, error: validationResult.error };
    }
  } catch (error) {
    console.error("Error validating token:", error);
    return { success: false, error: "Ocurrió un error en el servidor al validar el token." };
  }
}

export async function getDashboardData(patientId: string) {
    const [readyForPickup, activeMagistralRecipes, messages] = await Promise.all([
        getRecipesReadyForPickup(patientId),
        getRecipes(patientId).then(recipes => recipes.filter(r => r.status !== 'Dispensada' && r.status !== 'Anulada' && r.status !== 'Rechazada')),
        getMessagesForPatient(patientId)
    ]);
    return { readyForPickup, activeMagistralRecipes, messages };
}

export async function getMedicationInfo(medicationName: string) {
    return await simplifyMedicationInfo(medicationName);
}

export async function submitPatientMessage(patientId: string, content: string) {
    return await sendMessageDb(patientId, content);
}

export async function submitNewPrescription(patientId: string, imageDataUri: string) {
    return await createRecipeDb(patientId, imageDataUri);
}

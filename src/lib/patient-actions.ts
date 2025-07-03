
'use server';

import {
  findPatientByRut,
  getRecipesReadyForPickup,
  getMessagesForPatient,
  createRecipeFromPortal,
  sendMessageFromPatient as sendMessageDb,
  getRecipes
} from './data';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';

// --- PATIENT PORTAL ACTIONS ---

export async function loginPatientByRut(rut: string): Promise<{ success: boolean; patient?: any; error?: string }> {
  try {
    const patient = await findPatientByRut(rut);
    if (!patient) {
      return { success: false, error: "RUT no encontrado o no registrado. Por favor, contacte a la farmacia." };
    }
    return { success: true, patient };
  } catch (error) {
    console.error("Error logging in patient by RUT:", error);
    return { success: false, error: "Ocurrió un error en el servidor." };
  }
}

export async function getDashboardData(patientId: string) {
    const [readyForPickup, allPatientRecipes, messages] = await Promise.all([
        getRecipesReadyForPickup(patientId),
        getRecipes(patientId),
        getMessagesForPatient(patientId)
    ]);
    const activeMagistralRecipes = allPatientRecipes.filter(r => r.status !== 'Dispensada' && r.status !== 'Anulada' && r.status !== 'Rechazada');
    return { readyForPickup, activeMagistralRecipes, messages };
}

export async function getMedicationInfo(medicationName: string) {
    return await simplifyMedicationInfo(medicationName);
}

export async function submitPatientMessage(patientId: string, content: string) {
    return await sendMessageDb(patientId, content);
}

export async function submitNewPrescription(patientId: string, imageDataUri: string) {
    return await createRecipeFromPortal(patientId, imageDataUri);
}

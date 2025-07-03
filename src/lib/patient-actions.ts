
'use server';

import {
  findPatientByRut,
  getRecipesReadyForPickup,
  getMessagesForPatient,
  sendMessageFromPatient as sendMessageDb,
  getRecipes
} from './data';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';
import { db, storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, collection, setDoc } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { AuditTrailEntry, Recipe, RecipeStatus } from './types';


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

export async function submitNewPrescription(patientId: string, imageDataUri: string): Promise<string> {
    if (!db || !storage) throw new Error("Firestore or Storage is not initialized.");
    
    const recipeRef = doc(collection(db, 'recipes'));
    const recipeId = recipeRef.id;

    const storageRef = ref(storage, `portal-prescriptions/${recipeId}`);
    const uploadResult = await uploadString(storageRef, imageDataUri, 'data_url');
    const imageUrl = await getDownloadURL(uploadResult.ref);

    const firstAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.PendingReviewPortal,
        date: new Date().toISOString(),
        userId: patientId,
        notes: 'Receta subida por el paciente desde el portal.'
    };
    
    const newRecipe: Omit<Recipe, 'id'> = {
        patientId,
        doctorId: '', 
        items: [], 
        status: RecipeStatus.PendingReviewPortal,
        paymentStatus: 'Pendiente',
        prescriptionDate: new Date().toISOString(),
        dueDate: addMonths(new Date(), 6).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prescriptionImageUrl: imageUrl,
        auditTrail: [firstAuditEntry],
        externalPharmacyId: '', 
        supplySource: 'Stock del Recetario Externo',
        preparationCost: 0,
    };

    await setDoc(recipeRef, newRecipe);

    return recipeId;
};

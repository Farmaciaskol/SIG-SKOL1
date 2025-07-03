
'use server';

import {
  getRecipesReadyForPickup,
  getMessagesForPatient,
  sendMessageFromPatient,
  getRecipes
} from './data';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';
import { db, storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, collection, setDoc } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { AuditTrailEntry, Recipe, RecipeStatus } from './types';


// --- PATIENT PORTAL ACTIONS ---

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
    return await sendMessageFromPatient(patientId, content);
}

export async function submitNewPrescription(patientId: string, imageDataUri: string): Promise<string> {
    if (!db || !storage) throw new Error("Firestore or Storage is not initialized.");
    
    const recipeRef = doc(collection(db, 'recipes'));
    const recipeId = recipeRef.id;

    const storageRef = ref(storage, `portal-prescriptions/${recipeId}`);
    
    let imageUrl: string;
    try {
        const uploadResult = await uploadString(storageRef, imageDataUri, 'data_url');
        imageUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError: any) {
        console.error("Firebase Storage upload failed in submitNewPrescription:", storageError);
        throw new Error(`Error al subir imagen desde el portal. Verifique las reglas de Storage. Código: ${storageError.code || 'UNKNOWN'}`);
    }

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
        supplySource: 'Stock del Recetario',
        preparationCost: 0,
    };

    await setDoc(recipeRef, newRecipe);

    return recipeId;
};


'use server';

import {
  getRecipes,
  getRecipe,
  updateRecipe,
  getMessagesForPatient
} from './data';
import type { PatientMessage, Recipe, AuditTrailEntry } from './types';
import { RecipeStatus } from './types';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, setDoc } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { MAX_REPREPARATIONS } from './constants';
import { checkMedicationInteractions, CheckMedicationInteractionsInput, CheckMedicationInteractionsOutput } from '@/ai/flows/check-medication-interactions';


// --- PATIENT PORTAL ACTIONS ---

export async function getDashboardData(patientId: string) {
    const allPatientRecipes = await getRecipes(patientId);
    const readyForPickup = allPatientRecipes.filter(r => r.status === RecipeStatus.ReadyForPickup || r.status === RecipeStatus.ReceivedAtSkol);
    const messages = await getMessagesForPatient(patientId);
    const activeMagistralRecipes = allPatientRecipes.filter(r => r.status !== 'Dispensada' && r.status !== 'Anulada' && r.status !== 'Rechazada' && r.status !== 'Archivada');
    return { readyForPickup, activeMagistralRecipes, messages };
}

export async function getMedicationInfo(medicationName: string) {
    return await simplifyMedicationInfo(medicationName);
}

export async function analyzePatientInteractions(input: CheckMedicationInteractionsInput): Promise<CheckMedicationInteractionsOutput> {
  try {
    const result = await checkMedicationInteractions(input);
    return result;
  } catch (error) {
    console.error("AI interaction analysis failed:", error);
    throw new Error("No se pudo completar el análisis de interacciones.");
  }
}

export async function sendMessageFromPatient(patientId: string, content: string): Promise<PatientMessage> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const messageRef = doc(collection(db, 'patientMessages'));
    
    const newMessage: PatientMessage = {
        id: messageRef.id,
        patientId,
        content,
        sender: 'patient',
        createdAt: new Date().toISOString(),
        read: false, // New messages from patients are unread for pharmacists
    };
    
    const { id, ...dataToSave } = newMessage;
    await setDoc(messageRef, dataToSave);
    
    return newMessage;
};

export async function submitNewPrescription(patientId: string, imageFile: File, userId: string): Promise<string> {
    if (!db || !storage) throw new Error("Firestore o Storage no están inicializados.");
    
    if (!userId) {
        throw new Error("No se pudo obtener la sesión de autenticación. Intente recargar la página.");
    }
    
    const recipeRef = doc(collection(db, 'recipes'));
    const recipeId = recipeRef.id;

    const storageRef = ref(storage, `prescriptions/${userId}/${recipeId}`);
    
    let imageUrl: string;
    try {
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError: any) {
        console.error("Firebase Storage upload failed in submitNewPrescription:", storageError);
        let userMessage = `Error de autorización: Su usuario no tiene permiso para subir archivos. Por favor, vaya a la consola de Firebase -> Storage -> Rules y asegúrese de que los usuarios autenticados pueden escribir.`;
        if (storageError.code !== 'storage/unauthorized') {
            userMessage = `Error al subir imagen. Código: ${storageError.code || 'UNKNOWN'}.`;
        }
        throw new Error(userMessage);
    }

    const firstAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.PendingReviewPortal,
        date: new Date().toISOString(),
        userId: userId,
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

export async function requestRepreparationFromPortal(recipeId: string, patientId: string, userId: string): Promise<void> {
    const recipe = await getRecipe(recipeId);
    if (!recipe) throw new Error("Receta no encontrada.");
    if (recipe.patientId !== patientId) throw new Error("Acción no autorizada.");
    if (recipe.status !== RecipeStatus.Dispensed) throw new Error("No se puede solicitar una re-preparación para esta receta en su estado actual.");

    const isExpired = new Date(recipe.dueDate) < new Date();
    if (isExpired) throw new Error("La receta original ha vencido y no puede ser re-preparada.");
    
    const dispensationsCount = recipe.auditTrail?.filter(t => t.status === 'Dispensada').length || 0;
    if (dispensationsCount >= MAX_REPREPARATIONS + 1) throw new Error("Se ha alcanzado el límite de preparaciones para esta receta.");

    if (!userId) {
        throw new Error("No se pudo verificar la sesión del usuario.");
    }

    const newAuditEntry: AuditTrailEntry = {
      status: RecipeStatus.PendingValidation,
      date: new Date().toISOString(),
      userId: userId, 
      notes: "Solicitud de re-preparación recibida desde el Portal del Paciente."
    };

    const updates: Partial<Recipe> = {
        status: RecipeStatus.PendingValidation,
        auditTrail: [...(recipe.auditTrail || []), newAuditEntry],
        paymentStatus: 'N/A',
        dispensationDate: undefined,
        internalPreparationLot: undefined,
        compoundingDate: undefined,
        preparationExpiryDate: undefined,
        rejectionReason: undefined,
    };

    await updateRecipe(recipeId, updates);
}

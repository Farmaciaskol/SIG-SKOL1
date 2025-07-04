
'use server';

import {
  getRecipesReadyForPickup,
  getMessagesForPatient,
  getRecipes
} from './data';
import type { PatientMessage, Recipe } from './types';
import { RecipeStatus } from './types';
import { simplifyMedicationInfo } from '@/ai/flows/simplify-medication-info';
import { db, storage, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, setDoc } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import type { AuditTrailEntry } from './types';


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

export async function submitNewPrescription(patientId: string, imageFile: File): Promise<string> {
    if (!db || !storage || !auth) throw new Error("Firestore, Storage or Auth is not initialized.");
    
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No se pudo obtener la sesión de autenticación. Intente recargar la página.");
    }
    
    const recipeRef = doc(collection(db, 'recipes'));
    const recipeId = recipeRef.id;

    const storageRef = ref(storage, `portal-prescriptions/${user.uid}/${recipeId}`);
    
    let imageUrl: string;
    try {
        const uploadResult = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError: any) {
        console.error("Firebase Storage upload failed in submitNewPrescription:", storageError);
        let userMessage = `Error al subir imagen. Código: ${storageError.code || 'UNKNOWN'}`;
        if (storageError.code === 'storage/unauthorized') {
            userMessage = "Error de autorización: No tiene permiso para subir archivos. Vaya a la consola de Firebase -> Storage -> Rules y asegúrese de que los usuarios autenticados pueden escribir.";
        }
        throw new Error(userMessage);
    }

    const firstAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.PendingReviewPortal,
        date: new Date().toISOString(),
        userId: user.uid,
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

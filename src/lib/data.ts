

'use server';

import { db, storage, auth } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, setDoc, deleteDoc, writeBatch, query, where, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RecipeStatus, SkolSuppliedItemsDispatchStatus, DispatchStatus, ControlledLogEntryType, ProactivePatientStatus, PatientActionNeeded, MonthlyDispensationBoxStatus, DispensationItemStatus, PharmacovigilanceReportStatus, type Recipe, type Doctor, type InventoryItem, type User, type Role, type ExternalPharmacy, type Patient, type PharmacovigilanceReport, type AppData, type AuditTrailEntry, type DispatchNote, type DispatchItem, type ControlledSubstanceLogEntry, type LotDetail, type AppSettings, type MonthlyDispensationBox, type PatientMessage } from './types';
import { MAX_REPREPARATIONS } from './constants';
import { addMonths } from 'date-fns';

// Helper function to recursively convert Firestore Timestamps to ISO strings
function deepConvertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepConvertTimestamps(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepConvertTimestamps(obj[key]);
    }
  }
  return newObj;
}


async function fetchCollection<T extends { id: string }>(collectionName: keyof AppData & string, q?: any): Promise<T[]> {
  if (!db) {
    console.error("Firestore is not initialized.");
    return [];
  }
  try {
    const collRef = collection(db, collectionName);
    const querySnapshot = q ? await getDocs(q) : await getDocs(collRef);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const convertedData = deepConvertTimestamps(data);
      return { id: doc.id, ...convertedData } as T;
    });
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
}


// Specific fetch functions for each data type
export const getRecipes = async (patientId?: string): Promise<Recipe[]> => {
    if (patientId && db) {
        const q = query(collection(db, "recipes"), where("patientId", "==", patientId));
        return fetchCollection<Recipe>('recipes', q);
    }
    return fetchCollection<Recipe>('recipes');
};
export const getPatients = async (): Promise<Patient[]> => fetchCollection<Patient>('patients');
export const getDoctors = async (): Promise<Doctor[]> => fetchCollection<Doctor>('doctors');
export const getExternalPharmacies = async (): Promise<ExternalPharmacy[]> => fetchCollection<ExternalPharmacy>('externalPharmacies');

export const getInventory = async (): Promise<InventoryItem[]> => {
    return fetchCollection<InventoryItem>('inventory');
};

export const getUsers = async (): Promise<User[]> => fetchCollection<User>('users');
export const getRoles = async (): Promise<Role[]> => fetchCollection<Role>('roles');
export const getPharmacovigilanceReports = async (): Promise<PharmacovigilanceReport[]> => fetchCollection<PharmacovigilanceReport>('pharmacovigilanceReports');
export const getDispatchNotes = async (): Promise<DispatchNote[]> => fetchCollection<DispatchNote>('dispatchNotes');
export const getControlledSubstanceLog = async (): Promise<ControlledSubstanceLogEntry[]> => fetchCollection<ControlledSubstanceLogEntry>('controlledSubstanceLog');
export const getMonthlyDispensations = async (): Promise<MonthlyDispensationBox[]> => fetchCollection<MonthlyDispensationBox>('monthlyDispensations');
export const getMessagesForPatient = async (patientId: string): Promise<PatientMessage[]> => {
    if (!db) return [];
    const q = query(collection(db, 'patientMessages'), where('patientId', '==', patientId));
    const messages = await fetchCollection<PatientMessage>('patientMessages', q);
    return messages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const getRecipesReadyForPickup = async (patientId: string): Promise<Recipe[]> => {
    if (!db) return [];
    const q = query(collection(db, 'recipes'), where('patientId', '==', patientId), where('status', '==', RecipeStatus.ReadyForPickup));
    return fetchCollection<Recipe>('recipes', q);
}
export const getAppSettings = async (): Promise<AppSettings | null> => getDocument<AppSettings>('appSettings', 'global');


// Filtered fetch functions
export const getControlledSubstanceLogForPatient = async (patientId: string): Promise<ControlledSubstanceLogEntry[]> => {
    if (!db) return [];
    const q = query(collection(db, "controlledSubstanceLog"), where("patientId", "==", patientId));
    return fetchCollection<ControlledSubstanceLogEntry>('controlledSubstanceLog', q);
}

export const getPharmacovigilanceReportsForPatient = async (patientId: string): Promise<PharmacovigilanceReport[]> => {
    if (!db) return [];
    const q = query(collection(db, "pharmacovigilanceReports"), where("patientId", "==", patientId));
    return fetchCollection<PharmacovigilanceReport>('pharmacovigilanceReports', q);
}

export const getRecipesForExternalPharmacy = async (pharmacyId: string): Promise<Recipe[]> => {
    if (!db) return [];
    const q = query(collection(db, "recipes"), where("externalPharmacyId", "==", pharmacyId));
    return fetchCollection<Recipe>('recipes', q);
}

export const getDispatchNotesForExternalPharmacy = async (pharmacyId: string): Promise<DispatchNote[]> => {
    if (!db) return [];
    const q = query(collection(db, "dispatchNotes"), where("externalPharmacyId", "==", pharmacyId));
    return fetchCollection<DispatchNote>('dispatchNotes', q);
}


// Single document fetch functions
async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const convertedData = deepConvertTimestamps(data);
            return { id: docSnap.id, ...convertedData } as T;
        } else {
            console.log(`Document with id ${id} not found in ${collectionName} collection.`);
            return null;
        }
    } catch (error) {
        console.error(`Error getting document from ${collectionName}:`, error);
        return null;
    }
}

export const getRecipe = async (id: string): Promise<Recipe | null> => getDocument<Recipe>('recipes', id);
export const getPatient = async (id: string): Promise<Patient | null> => getDocument<Patient>('patients', id);
export const getDoctor = async (id: string): Promise<Doctor | null> => getDocument<Doctor>('doctors', id);
export const getExternalPharmacy = async (id: string): Promise<ExternalPharmacy | null> => getDocument<ExternalPharmacy>('externalPharmacies', id);
export const getPharmacovigilanceReport = async (id: string): Promise<PharmacovigilanceReport | null> => getDocument<PharmacovigilanceReport>('pharmacovigilanceReports', id);
export const getMonthlyDispensationBox = async (id: string): Promise<MonthlyDispensationBox | null> => getDocument<MonthlyDispensationBox>('monthlyDispensations', id);


export const deleteRecipe = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'recipes', id));
};

export const addDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");

    if (doctor.license) {
        const q = query(collection(db, "doctors"), where("license", "==", doctor.license), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Ya existe un médico con este número de colegiatura.');
        }
    }
    
    const docRef = await addDoc(collection(db, 'doctors'), doctor);
    return docRef.id;
};

export const updateDoctor = async (id: string, updates: Partial<Doctor>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'doctors', id), updates);
};

export const deleteDoctor = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'doctors', id));
};

export const addUser = async (user: Omit<User, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // NOTE: This only adds the user to the Firestore collection for display purposes.
    // Real user creation should be handled via Firebase Authentication SDKs.
    const docRef = await addDoc(collection(db, 'users'), user);
    return docRef.id;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, updates);
};

export const deleteUser = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, 'users', id);
    await deleteDoc(userRef);
};


export const addExternalPharmacy = async (pharmacy: Omit<ExternalPharmacy, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const pharmacyData = { ...pharmacy, contactPerson: pharmacy.contactPerson || '', email: pharmacy.email || '', phone: pharmacy.phone || '', address: pharmacy.address || '', paymentDetails: pharmacy.paymentDetails || '', transportCost: pharmacy.transportCost || 0 };
    const docRef = await addDoc(collection(db, 'externalPharmacies'), pharmacyData);
    return docRef.id;
};

export const updateRecipe = async (id: string, updates: Partial<Recipe>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const recipeRef = doc(db, 'recipes', id);
    const dataToUpdate = { ...updates, updatedAt: new Date().toISOString() };
    Object.keys(dataToUpdate).forEach(key => { if ((dataToUpdate as any)[key] === undefined) delete (dataToUpdate as any)[key]; });
    await updateDoc(recipeRef, dataToUpdate as any);
};

export const saveRecipe = async (data: any, imageFile: File | null, userId: string, recipeId?: string): Promise<string> => {
    if (!db || !auth) throw new Error("Firestore or Auth is not initialized.");
    
    if (!userId) {
        throw new Error("Usuario no autenticado. No se puede guardar la receta.");
    }

    let patientId = data.patientId;
    if (data.patientSelectionType === 'new' && data.newPatientName && data.newPatientRut) {
        const q = query(collection(db, "patients"), where("rut", "==", data.newPatientRut), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            patientId = querySnapshot.docs[0].id;
        } else {
             const newPatientRef = doc(collection(db, 'patients'));
            patientId = newPatientRef.id;
            await setDoc(newPatientRef, { name: data.newPatientName, rut: data.newPatientRut, email: '', phone: '', isChronic: false, proactiveStatus: 'OK', proactiveMessage: 'No requiere acción.', actionNeeded: 'NONE' });
        }
    }

    let doctorId = data.doctorId;
    if (data.doctorSelectionType === 'new' && data.newDoctorName && data.newDoctorLicense) {
        const q = query(collection(db, "doctors"), where("license", "==", data.newDoctorLicense), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            doctorId = querySnapshot.docs[0].id;
        } else {
            const newDoctorRef = doc(collection(db, 'doctors'));
            doctorId = newDoctorRef.id;
            await setDoc(newDoctorRef, { name: data.newDoctorName, specialty: data.newDoctorSpecialty || '', license: data.newDoctorLicense, rut: data.newDoctorRut || '' });
        }
    }
    
    let imageUrl: string | undefined = data.prescriptionImageUrl; // Keep existing image url if any
    const effectiveRecipeId = recipeId || doc(collection(db, 'recipes')).id;

    if (imageFile && storage) {
        const storageRef = ref(storage, `prescriptions/${userId}/${effectiveRecipeId}`);
        try {
            const uploadResult = await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (storageError: any) {
            console.error("Firebase Storage upload failed in saveRecipe:", storageError);
            let userMessage = `Error al subir imagen. Código: ${storageError.code || 'UNKNOWN'}.`;
            if (storageError.code === 'storage/unauthorized') {
                userMessage = "Error de autorización: Su usuario no tiene permiso para subir archivos. Por favor, vaya a la consola de Firebase -> Storage -> Rules y asegúrese de que los usuarios autenticados pueden escribir.";
            }
            throw new Error(userMessage);
        }
    }
    
    const recipeDataForUpdate: Partial<Recipe> = {
        patientId: patientId, doctorId: doctorId, dispatchAddress: data.dispatchAddress, items: data.items,
        prescriptionDate: data.prescriptionDate, dueDate: data.dueDate, updatedAt: new Date().toISOString(),
        externalPharmacyId: data.externalPharmacyId, supplySource: data.supplySource, 
        preparationCost: Number(data.preparationCost),
        transportCost: Number(data.transportCost) || 0,
        isControlled: data.isControlled, controlledRecipeType: data.controlledRecipeType, controlledRecipeFolio: data.controlledRecipeFolio,
        prescriptionImageUrl: imageUrl,
    };
    
    if (data.supplySource === 'Insumos de Skol') {
        recipeDataForUpdate.skolSuppliedItemsDispatchStatus = SkolSuppliedItemsDispatchStatus.Pending;
    }

    if (recipeId) { // Editing
        const recipeRef = doc(db, 'recipes', recipeId);
        const existingRecipe = await getRecipe(recipeId);
        if (existingRecipe && (existingRecipe.status === RecipeStatus.Rejected || existingRecipe.status === RecipeStatus.PendingReviewPortal)) {
            const newAuditTrailEntry: AuditTrailEntry = { 
                status: RecipeStatus.PendingValidation, 
                date: new Date().toISOString(), 
                userId: userId, 
                notes: existingRecipe.status === RecipeStatus.Rejected 
                    ? 'Receta corregida y reenviada para validación.'
                    : 'Receta del portal revisada y enviada a validación.'
            };
            recipeDataForUpdate.status = RecipeStatus.PendingValidation;
            recipeDataForUpdate.rejectionReason = '';
            recipeDataForUpdate.auditTrail = [...(existingRecipe.auditTrail || []), newAuditTrailEntry];
        }
        await updateDoc(recipeRef, recipeDataForUpdate as any);
        return recipeId;
    } else { // Creating
        const recipeRef = doc(collection(db, 'recipes'));
        const newId = recipeRef.id;
        const firstAuditEntry: AuditTrailEntry = { status: RecipeStatus.PendingValidation, date: new Date().toISOString(), userId: userId, notes: 'Receta creada en el sistema.' };
        const recipeDataForCreate: Omit<Recipe, 'id'> = { ...recipeDataForUpdate, status: RecipeStatus.PendingValidation, paymentStatus: 'N/A', createdAt: new Date().toISOString(), auditTrail: [firstAuditEntry] } as Omit<Recipe, 'id'>;
        await setDoc(doc(db, 'recipes', newId), recipeDataForCreate);
        return newId;
    }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'quantity' | 'lots'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const q = query(collection(db, "inventory"), where("name", "==", item.name), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error('Ya existe un producto de inventario con este nombre.');
    }
    
    const itemData = { ...item, quantity: 0, lots: [] };
    const docRef = await addDoc(collection(db, 'inventory'), itemData as any);
    return docRef.id;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    // In a production app, you would check for dependencies here,
    // e.g., if the item is part of an active, non-dispensed recipe.
    // For this prototype, we will proceed with direct deletion.

    await deleteDoc(doc(db, 'inventory', id));
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'inventory', id), updates as any);
};

export const addLotToInventoryItem = async (itemId: string, newLot: LotDetail): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const itemRef = doc(db, 'inventory', itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
        throw new Error(`Inventory item with ID ${itemId} not found.`);
    }

    const itemData = itemSnap.data() as InventoryItem;
    
    const existingLot = itemData.lots?.find(l => l.lotNumber.toLowerCase() === newLot.lotNumber.toLowerCase());
    if (existingLot) {
        throw new Error(`El lote con el número ${newLot.lotNumber} ya existe para este producto.`);
    }

    const updatedLots = [...(itemData.lots || []), newLot];
    const newTotalQuantity = updatedLots.reduce((sum, lot) => sum + lot.quantity, 0);

    await updateDoc(itemRef, {
        lots: updatedLots,
        quantity: newTotalQuantity
    });
};

export const processDispatch = async (pharmacyId: string, dispatchItems: DispatchItem[]): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");

    const batch = writeBatch(db);
    const dispatchNoteId = doc(collection(db, 'dispatchNotes')).id;
    const dispatchNoteRef = doc(db, 'dispatchNotes', dispatchNoteId);

    const recipeUpdates: { [recipeId: string]: { itemsToDispatch: number; dispatchedItems: number } } = {};

    for (const item of dispatchItems) {
        const inventoryRef = doc(db, 'inventory', item.inventoryItemId);
        const inventorySnap = await getDoc(inventoryRef);
        if (!inventorySnap.exists()) throw new Error(`Inventory item ${item.inventoryItemId} not found.`);
        const inventoryData = inventorySnap.data() as InventoryItem;

        const lotIndex = inventoryData.lots?.findIndex(l => l.lotNumber === item.lotNumber);
        if (lotIndex === undefined || lotIndex === -1 || !inventoryData.lots) throw new Error(`Lot ${item.lotNumber} not found for item ${item.inventoryItemId}.`);

        const lot = inventoryData.lots[lotIndex];
        if (lot.quantity < item.quantity) throw new Error(`Not enough stock for lot ${item.lotNumber}. Required: ${item.quantity}, Available: ${lot.quantity}`);

        lot.quantity -= item.quantity;
        inventoryData.quantity -= item.quantity;
        batch.update(inventoryRef, { lots: inventoryData.lots, quantity: inventoryData.quantity });

        if (!recipeUpdates[item.recipeId]) {
            const recipeSnap = await getDoc(doc(db, 'recipes', item.recipeId));
            const recipeData = recipeSnap.data() as Recipe;
            const itemsToProcess = Array.isArray(recipeData.items) ? recipeData.items : [];
            const itemsToDispatch = itemsToProcess.filter(i => i.requiresFractionation).length;
            recipeUpdates[item.recipeId] = { itemsToDispatch, dispatchedItems: 0 };
        }
        recipeUpdates[item.recipeId].dispatchedItems++;
    }

    for (const [recipeId, counts] of Object.entries(recipeUpdates)) {
        const recipeRef = doc(db, 'recipes', recipeId);
        const newStatus = counts.dispatchedItems >= counts.itemsToDispatch ? SkolSuppliedItemsDispatchStatus.Dispatched : SkolSuppliedItemsDispatchStatus.PartiallyDispatched;
        batch.update(recipeRef, { skolSuppliedItemsDispatchStatus: newStatus });
    }

    const newDispatchNote: DispatchNote = { id: dispatchNoteId, externalPharmacyId: pharmacyId, status: DispatchStatus.Active, createdAt: new Date().toISOString(), items: dispatchItems };
    batch.set(dispatchNoteRef, newDispatchNote);
    await batch.commit();
    return dispatchNoteId;
};

export const logControlledMagistralDispensation = async (recipe: Recipe, patient: Patient): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!recipe.isControlled || !recipe.controlledRecipeFolio || !recipe.controlledRecipeType) throw new Error("Recipe is not a valid controlled substance recipe.");
    if (recipe.items.length === 0) throw new Error("Recipe has no items to log.");

    const logCol = collection(db, 'controlledSubstanceLog');
    const logSnapshot = await getDocs(query(logCol, where("entryType", "==", ControlledLogEntryType.MagistralDispensation)));
    const newFolioNumber = logSnapshot.size + 1;
    const internalFolio = `CSL-MG-${new Date().getFullYear()}-${String(newFolioNumber).padStart(4, '0')}`;
    
    const batch = writeBatch(db);
    for (const item of recipe.items) {
        const newLogEntry: Omit<ControlledSubstanceLogEntry, 'id'> = {
            entryType: ControlledLogEntryType.MagistralDispensation,
            dispensationDate: new Date().toISOString(),
            internalFolio,
            patientId: recipe.patientId,
            doctorId: recipe.doctorId,
            medicationName: `${item.principalActiveIngredient} ${item.concentrationValue}${item.concentrationUnit}`,
            recipeId: recipe.id,
            quantityDispensed: Number(item.totalQuantityValue),
            quantityUnit: item.totalQuantityUnit,
            controlledType: 'Psicotrópico', // This might need to be more dynamic
            prescriptionFolio: recipe.controlledRecipeFolio,
            prescriptionType: recipe.controlledRecipeType as any,
            retrievedBy_Name: patient.name,
            retrievedBy_RUT: patient.rut,
            prescriptionImageUrl: recipe.controlledRecipeImageUrl || recipe.prescriptionImageUrl,
        };
        batch.set(doc(logCol), newLogEntry);
    }
    await batch.commit();
};

export const logDirectSaleDispensation = async (
  data: {
    patientId: string;
    doctorId: string;
    inventoryItemId: string;
    lotNumber: string;
    quantity: number;
    prescriptionFolio: string;
    prescriptionType: 'Receta Cheque' | 'Receta Retenida';
    controlledRecipeFormat: 'electronic' | 'physical';
    prescriptionImageFile?: File;
  }
): Promise<void> => {
    if (!db || !storage || !auth) throw new Error("Firestore, Storage or Auth is not initialized.");

    const user = auth.currentUser;
    if (!user) {
        throw new Error("Usuario no autenticado. No se puede registrar la dispensación.");
    }
    
    const { patientId, doctorId, inventoryItemId, lotNumber, quantity, prescriptionFolio, prescriptionType, controlledRecipeFormat, prescriptionImageFile } = data;

    const inventoryRef = doc(db, 'inventory', inventoryItemId);
    const logCol = collection(db, 'controlledSubstanceLog');
    const batch = writeBatch(db);

    const inventorySnap = await getDoc(inventoryRef);
    if (!inventorySnap.exists()) throw new Error(`Inventory item ${inventoryItemId} not found.`);
    const inventoryData = inventorySnap.data() as InventoryItem;

    if (!inventoryData.isControlled) throw new Error("This item is not a controlled substance.");

    const lotIndex = inventoryData.lots?.findIndex(l => l.lotNumber === lotNumber);
    if (lotIndex === undefined || lotIndex === -1 || !inventoryData.lots) throw new Error(`Lot ${lotNumber} not found for item ${inventoryItemId}.`);

    const lot = inventoryData.lots[lotIndex];
    if (lot.quantity < quantity) throw new Error(`Not enough stock for lot ${lotNumber}. Required: ${quantity}, Available: ${lot.quantity}`);
    
    const newLots = [...inventoryData.lots];
    newLots[lotIndex] = { ...lot, quantity: lot.quantity - quantity };
    const newTotalQuantity = inventoryData.quantity - quantity;
    batch.update(inventoryRef, { lots: newLots, quantity: newTotalQuantity });

    const logSnapshot = await getDocs(query(logCol, where("entryType", "==", ControlledLogEntryType.DirectSale)));
    const newFolioNumber = logSnapshot.size + 1;
    const internalFolio = `CSL-DV-${new Date().getFullYear()}-${String(newFolioNumber).padStart(4, '0')}`;

    const patientSnap = await getDoc(doc(db, 'patients', patientId));
    if (!patientSnap.exists()) throw new Error("Patient not found");
    const patient = patientSnap.data() as Patient;
    
    let finalImageUrl: string | undefined;
    if (controlledRecipeFormat === 'physical' && prescriptionImageFile) {
      const storageRef = ref(storage, `controlled-prescriptions/${user.uid}/${patientId}-${Date.now()}`);
      try {
        const currentUserForLogging = auth?.currentUser;
        console.log("Attempting upload for direct sale. Auth state:", { 
            uid: currentUserForLogging?.uid, 
            isAnonymous: currentUserForLogging?.isAnonymous,
            email: currentUserForLogging?.email,
            providerData: currentUserForLogging?.providerData,
        });
        const uploadResult = await uploadBytes(storageRef, prescriptionImageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageError: any) {
        console.error("Firebase Storage upload failed in logDirectSaleDispensation:", storageError);
        let userMessage = `Error al subir imagen. Código: ${storageError.code || 'UNKNOWN'}`;
        if (storageError.code === 'storage/unauthorized') {
            userMessage = "Error de autorización: No tiene permiso para subir archivos. Vaya a la consola de Firebase -> Storage -> Rules y asegúrese de que los usuarios autenticados pueden escribir.";
        }
        throw new Error(userMessage);
      }
    }

    const newLogEntry: Omit<ControlledSubstanceLogEntry, 'id'> = {
        entryType: ControlledLogEntryType.DirectSale,
        dispensationDate: new Date().toISOString(),
        internalFolio,
        patientId,
        doctorId,
        medicationName: inventoryData.name,
        inventoryItemId,
        quantityDispensed: quantity,
        quantityUnit: inventoryData.unit,
        controlledType: inventoryData.controlledType!,
        prescriptionFolio,
        prescriptionType,
        retrievedBy_Name: patient.name,
        retrievedBy_RUT: patient.rut,
        prescriptionImageUrl: finalImageUrl,
    };
    batch.set(doc(logCol), newLogEntry);
    
    await batch.commit();
};

export const updatePatient = async (id: string, updates: Partial<Patient> & { password?: string }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const { password, ...patientUpdates } = updates;

    // --- Firebase Auth Password Update (Simulated) ---
    // In a real application, a secure backend function (e.g., Firebase Function)
    // would handle updating the user's password securely in Firebase Authentication.
    if (password) {
        // Example: await updateAuthUserPassword(id, password);
        console.log(`(Simulado) Se ha solicitado un cambio de contraseña para el paciente ${id}.`);
    }

    await updateDoc(doc(db, 'patients', id), patientUpdates as any);
};


export const addPatient = async (patient: Omit<Patient, 'id' | 'proactiveStatus' | 'proactiveMessage' | 'actionNeeded' | 'commercialMedications'> & { password?: string }): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const q = query(collection(db, "patients"), where("rut", "==", patient.rut), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error('Ya existe un paciente con este RUT.');
    }

    const { password, ...patientData } = patient;

    // --- Firebase Auth User Creation (Simulated) ---
    if (password) {
        if (!patientData.email) {
            throw new Error("El email es requerido si se ingresa una contraseña para el portal.");
        }
        console.log(`(Simulado) Creando usuario de Firebase Auth para ${patientData.email}`);
    }
    
    const dataToSave: Omit<Patient, 'id'> = {
        ...patientData,
        proactiveStatus: ProactivePatientStatus.OK,
        proactiveMessage: 'No requiere acción.',
        actionNeeded: PatientActionNeeded.NONE,
        commercialMedications: []
    };
    const docRef = await addDoc(collection(db, 'patients'), dataToSave as any);
    return docRef.id;
}


export const deletePatient = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // TODO: Add logic to check for dependencies if needed (e.g., recipes)
    // Also, you would need a backend function to delete the associated Firebase Auth user.
    console.log(`(Simulado) Eliminando usuario de Firebase Auth para el paciente ${id}.`);
    await deleteDoc(doc(db, 'patients', id));
};


export const updatePharmacovigilanceReport = async (id: string, updates: Partial<PharmacovigilanceReport>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const reportRef = doc(db, 'pharmacovigilanceReports', id);
    const dataToUpdate = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(reportRef, dataToUpdate);
};

export const addPharmacovigilanceReport = async (reportData: Omit<PharmacovigilanceReport, 'id' | 'reportedAt' | 'updatedAt' | 'status'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const newReport: Omit<PharmacovigilanceReport, 'id'> = {
        ...reportData,
        status: PharmacovigilanceReportStatus.New,
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'pharmacovigilanceReports'), newReport);
    return docRef.id;
};

export const updateExternalPharmacy = async (id: string, updates: Partial<ExternalPharmacy>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'externalPharmacies', id), updates as any);
};

export const deleteExternalPharmacy = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'externalPharmacies', id));
};

export const registerPaymentForPharmacy = async (recipeIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (recipeIds.length === 0) return;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    recipeIds.forEach(id => {
        const recipeRef = doc(db, 'recipes', id);
        batch.update(recipeRef, {
            paymentStatus: 'Pagado',
            updatedAt: now
        });
    });

    await batch.commit();
};

export const createMonthlyDispensationBox = async (patientId: string, period: string): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");

    const patient = await getPatient(patientId);
    if (!patient || !patient.isChronic) {
        throw new Error("Patient not found or is not a chronic patient.");
    }

    const allRecipes = await getRecipes();
    const allInventory = await getInventory();
    const patientRecipes = allRecipes.filter(r => r.patientId === patientId);

    const dispensationItems: DispensationItem[] = [];

    // Process Magistral Recipes
    for (const recipe of patientRecipes) {
        const isActiveChronicMagistral = ![RecipeStatus.Dispensed, RecipeStatus.Cancelled, RecipeStatus.Rejected].includes(recipe.status);

        if(isActiveChronicMagistral) {
            const dispensationsCount = recipe.auditTrail?.filter(t => t.status === RecipeStatus.Dispensed).length || 0;
            const isExpired = new Date(recipe.dueDate) < new Date();

            let status: DispensationItemStatus;
            let reason: string;

            if (isExpired) {
                status = DispensationItemStatus.DoNotInclude;
                reason = "Receta vencida.";
            } else if (dispensationsCount >= MAX_REPREPARATIONS) {
                status = DispensationItemStatus.RequiresAttention;
                reason = `Límite de ${MAX_REPREPARATIONS} preparaciones alcanzado. Requiere nueva receta.`;
            } else {
                status = DispensationItemStatus.OkToInclude;
                reason = `Receta vigente. Preparación ${dispensationsCount + 1} de ${MAX_REPREPARATIONS}.`;
            }

            dispensationItems.push({
                id: recipe.id,
                type: 'magistral',
                name: recipe.items[0]?.principalActiveIngredient || 'Preparado Magistral',
                details: `${recipe.items[0]?.concentrationValue || ''}${recipe.items[0]?.concentrationUnit || ''}`,
                status,
                reason,
            });
        }
    }

    // Process Commercial Medications
    if (patient.commercialMedications) {
        for (const medName of patient.commercialMedications) {
            const inventoryItem = allInventory.find(i => i.name.toLowerCase().includes(medName.toLowerCase()));
            
            let status: DispensationItemStatus;
            let reason: string;
            
            if (!inventoryItem) {
                status = DispensationItemStatus.DoNotInclude;
                reason = `Medicamento "${medName}" no encontrado en inventario.`;
            } else if (inventoryItem.quantity <= 0) {
                status = DispensationItemStatus.RequiresAttention;
                reason = "Stock insuficiente (0 unidades).";
            } else {
                 status = DispensationItemStatus.OkToInclude;
                 reason = `Stock disponible: ${inventoryItem.quantity} unidades.`;
            }

            dispensationItems.push({
                id: inventoryItem?.id || medName,
                type: 'commercial',
                name: medName,
                details: inventoryItem?.unit || 'Unidad',
                status,
                reason,
            });
        }
    }

    const newBox: Omit<MonthlyDispensationBox, 'id'> = {
        patientId,
        period,
        status: MonthlyDispensationBoxStatus.InPreparation,
        items: dispensationItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'monthlyDispensations'), newBox);
    return docRef.id;
};

export const updateMonthlyDispensationBox = async (boxId: string, updates: Partial<MonthlyDispensationBox>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const boxRef = doc(db, 'monthlyDispensations', boxId);
  const dataToUpdate = { ...updates, updatedAt: new Date().toISOString() };
  await updateDoc(boxRef, dataToUpdate as any);
};

export const updateAppSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = doc(db, 'appSettings', 'global');
    await updateDoc(settingsRef, updates);
};

    

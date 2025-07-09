

'use server';

import { db, storage, auth } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, setDoc, deleteDoc, writeBatch, query, where, limit,getCountFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RecipeStatus, SkolSuppliedItemsDispatchStatus, DispatchStatus, ControlledLogEntryType, ProactivePatientStatus, PatientActionNeeded, MonthlyDispensationBoxStatus, DispensationItemStatus, PharmacovigilanceReportStatus, UserRequestStatus, type Recipe, type Doctor, type InventoryItem, type User, type Role, type ExternalPharmacy, type Patient, type PharmacovigilanceReport, type AppData, type AuditTrailEntry, type DispatchNote, type DispatchItem, type ControlledSubstanceLogEntry, type LotDetail, type AppSettings, type MonthlyDispensationBox, type PatientMessage, type UserRequest, type Order, type OrderItem, RecipeItem } from './types';
import { MAX_REPREPARATIONS } from './constants';
import { addMonths } from 'date-fns';
import { fetchAllLiorenProducts, LiorenProduct, searchLiorenProducts, searchLiorenProductByCode } from './lioren-api';
import { normalizeString } from './utils';

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

/**
 * Removes properties with `undefined` values from an object.
 * Firestore does not allow `undefined` values.
 */
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      newObj[key] = obj[key];
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
export const getUserRequests = async (): Promise<UserRequest[]> => fetchCollection<UserRequest>('userRequests');
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
export const getAllMessages = async (): Promise<PatientMessage[]> => {
    return fetchCollection<PatientMessage>('patientMessages');
};

export const getRecipesReadyForPickup = async (patientId: string): Promise<Recipe[]> => {
    if (!db) return [];
    const q = query(collection(db, 'recipes'), where('patientId', '==', patientId), where('status', 'in', [RecipeStatus.ReadyForPickup, RecipeStatus.ReceivedAtSkol]));
    return fetchCollection<Recipe>('recipes', q);
}

export const getAppSettings = async (): Promise<AppSettings | null> => {
    const settings = await getDocument<AppSettings>('appSettings', 'global');
    if (settings && db) {
        let needsUpdate = false;
        const updates: Partial<AppSettings> = {};

        const forms = settings.pharmaceuticalForms || [];
        if (!forms.some(f => f.toLowerCase() === 'papelillo')) {
            forms.push('Papelillo');
            updates.pharmaceuticalForms = forms;
            needsUpdate = true;
        }
        if (!forms.some(f => f.toLowerCase() === 'jarabe')) {
            forms.push('Jarabe');
            updates.pharmaceuticalForms = forms;
            needsUpdate = true;
        }


        const concentrationUnits = settings.concentrationUnits || [];
        if (!concentrationUnits.includes('%')) {
            concentrationUnits.push('%');
            updates.concentrationUnits = concentrationUnits;
            needsUpdate = true;
        }

        if (needsUpdate) {
            try {
                await updateDoc(doc(db, 'appSettings', 'global'), updates);
                // After updating, merge changes into the settings object to be returned for the current request
                Object.assign(settings, updates);
            } catch (error) {
                console.error("Failed to auto-update app settings:", error);
            }
        }
    }
    return settings;
};


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
export const getAllOrders = async (): Promise<Order[]> => fetchCollection<Order>('orders');

// Optimized Count Functions
export const getRecipesCountByStatus = async (status: RecipeStatus): Promise<number> => {
    if (!db) return 0;
    try {
        const q = query(collection(db, "recipes"), where("status", "==", status));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching recipes count by status:", error);
        return 0;
    }
};

export const getPendingPortalItemsCount = async (): Promise<number> => {
    if (!db) return 0;
    
    try {
        const recipesQuery = query(collection(db, "recipes"), where("status", "==", RecipeStatus.PendingReviewPortal));
        const recipesSnapshot = await getCountFromServer(recipesQuery);
        const recipeCount = recipesSnapshot.data().count;
        
        const requestsQuery = query(collection(db, "userRequests"), where("status", "==", UserRequestStatus.Pending));
        const requestsSnapshot = await getCountFromServer(requestsQuery);
        const requestCount = requestsSnapshot.data().count;
        
        return recipeCount + requestCount;
    } catch (error) {
        console.error("Error fetching pending portal items count:", error);
        return 0; // Return 0 on error
    }
};

export const getItemsToDispatchCount = async (): Promise<number> => {
    if (!db) return 0;
    try {
        const q = query(collection(db, "recipes"), where("status", "==", RecipeStatus.Validated), where("supplySource", "==", "Insumos de Skol"));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching items to dispatch count:", error);
        return 0; // Return 0 on error
    }
};

export const getLowStockInventoryCount = async (): Promise<number> => {
    if (!db) return 0;
    try {
        const allItems = await fetchCollection<InventoryItem>('inventory');
        return allItems.filter(item => item.quantity < item.lowStockThreshold).length;
    } catch (error) {
        console.error("Error fetching low stock inventory count:", error);
        return 0; // Return 0 on error to prevent crashing the layout
    }
};

export const getUnreadPatientMessagesCount = async (): Promise<number> => {
    if (!db) return 0;
    try {
        const q = query(collection(db, "patientMessages"), where("sender", "==", "patient"), where("read", "==", false));
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error("Error fetching unread patient messages count:", error);
        return 0; // Return 0 on error
    }
};

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
    
    const docRef = await addDoc(collection(db, 'doctors'), cleanUndefined(doctor));
    return docRef.id;
};

export const updateDoctor = async (id: string, updates: Partial<Doctor>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'doctors', id), cleanUndefined(updates));
};

export const deleteDoctor = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'doctors', id));
};

export const addUser = async (user: Omit<User, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // NOTE: This only adds the user to the Firestore collection for display purposes.
    // Real user creation should be handled via Firebase Authentication SDKs.
    const docRef = await addDoc(collection(db, 'users'), cleanUndefined(user));
    return docRef.id;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, cleanUndefined(updates));
};

export const deleteUser = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, 'users', id);
    await deleteDoc(userRef);
};


export const addExternalPharmacy = async (pharmacy: Omit<ExternalPharmacy, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const pharmacyData = { 
        ...pharmacy, 
        contactPerson: pharmacy.contactPerson || '', 
        email: pharmacy.email || '', 
        phone: pharmacy.phone || '', 
        address: pharmacy.address || '', 
        paymentDetails: pharmacy.paymentDetails || '', 
        transportCost: pharmacy.transportCost || 0,
        standardPreparationTime: pharmacy.standardPreparationTime || undefined,
        skolSuppliedPreparationTime: pharmacy.skolSuppliedPreparationTime || undefined,
    };
    const docRef = await addDoc(collection(db, 'externalPharmacies'), cleanUndefined(pharmacyData));
    return docRef.id;
};

export const updateRecipe = async (id: string, updates: Partial<Recipe>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const recipeRef = doc(db, 'recipes', id);
    const dataToUpdate = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(recipeRef, cleanUndefined(dataToUpdate));
};

export const saveRecipe = async (data: any, userId: string, recipeId?: string): Promise<string> => {
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
            const newPatientData: Partial<Omit<Patient, 'id'>> = {
                name: data.newPatientName,
                rut: data.newPatientRut,
            };
            patientId = await addPatient(newPatientData);
        }
    }

    let doctorId = data.doctorId;
    if (data.doctorSelectionType === 'new' && data.newDoctorName && data.newDoctorSpecialty) {
        const q = query(collection(db, "doctors"), where("name", "==", data.newDoctorName), limit(1)); // Simple check
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            doctorId = querySnapshot.docs[0].id;
        } else {
            const newDoctorRef = doc(collection(db, 'doctors'));
            doctorId = newDoctorRef.id;
            await setDoc(newDoctorRef, { name: data.newDoctorName, specialty: data.newDoctorSpecialty, license: data.newDoctorLicense || '', rut: data.newDoctorRut || '' });
        }
    }
    
    const imageUrl: string | undefined = data.prescriptionImageUrl;
    
    const recipeDataForUpdate: Partial<Recipe> = {
        patientId: patientId, doctorId: doctorId, dispatchAddress: data.dispatchAddress, items: data.items,
        prescriptionDate: data.prescriptionDate.toISOString(), dueDate: data.dueDate.toISOString(), updatedAt: new Date().toISOString(),
        externalPharmacyId: data.externalPharmacyId, supplySource: data.supplySource, 
        preparationCost: Number(data.preparationCost),
        isControlled: data.isControlled, controlledRecipeType: data.controlledRecipeType, controlledRecipeFolio: data.controlledRecipeFolio,
        prescriptionImageUrl: imageUrl,
    };
    
    if (data.supplySource === 'Insumos de Skol') {
        const inventory = await getInventory();
        for (const item of recipeDataForUpdate.items || []) {
            const inventoryMatch = inventory.find(invItem => 
                invItem.inventoryType === 'Fraccionamiento' &&
                typeof invItem.activePrinciple === 'string' &&
                normalizeString(invItem.activePrinciple) === normalizeString(item.principalActiveIngredient)
            );
            if (inventoryMatch) {
                item.sourceInventoryItemId = inventoryMatch.id;
            } else {
                item.sourceInventoryItemId = undefined;
            }
        }
    }

    const cleanedRecipeData = cleanUndefined(recipeDataForUpdate);

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
            cleanedRecipeData.status = RecipeStatus.PendingValidation;
            cleanedRecipeData.rejectionReason = '';
            cleanedRecipeData.auditTrail = [...(existingRecipe.auditTrail || []), newAuditTrailEntry];
        }
        await updateDoc(recipeRef, cleanedRecipeData);
        return recipeId;
    } else { // Creating
        const recipeRef = doc(collection(db, 'recipes'));
        const newId = recipeRef.id;
        const firstAuditEntry: AuditTrailEntry = { status: RecipeStatus.PendingValidation, date: new Date().toISOString(), userId: userId, notes: 'Receta creada en el sistema.' };
        const recipeDataForCreate: Omit<Recipe, 'id'> = { ...cleanedRecipeData, status: RecipeStatus.PendingValidation, paymentStatus: 'N/A', createdAt: new Date().toISOString(), auditTrail: [firstAuditEntry] } as Omit<Recipe, 'id'>;
        await setDoc(doc(db, 'recipes', newId), recipeDataForCreate);
        return newId;
    }
};

export const addInventoryItem = async (item: Partial<Omit<InventoryItem, 'id' | 'quantity' | 'lots'>>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const dataToSave = { ...item, quantity: 0, lots: [] };
    const docRef = await addDoc(collection(db, 'inventory'), cleanUndefined(dataToSave));
    return docRef.id;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'inventory', id));
};

export const updateInventoryItem = async (id: string, updates: Partial<Omit<InventoryItem, 'id'>>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'inventory', id), cleanUndefined(updates));
};

export const addLotToInventoryItem = async (itemId: string, newLot: LotDetail): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const itemRef = doc(db, 'inventory', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("Inventory item not found.");
    
    const itemData = itemSnap.data() as InventoryItem;
    const existingLots = itemData.lots || [];

    if (existingLots.some(lot => lot.lotNumber === newLot.lotNumber)) {
        throw new Error(`El lote número ${newLot.lotNumber} ya existe para este producto.`);
    }

    const updatedLots = [...existingLots, newLot];
    const newTotalQuantity = updatedLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
    
    await updateDoc(itemRef, cleanUndefined({
        lots: updatedLots,
        quantity: newTotalQuantity
    }));
};


export const processDispatch = async (pharmacyId: string, dispatchItems: DispatchItem[], dispatcherId: string, dispatcherName: string): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");

    const batch = writeBatch(db);
    const dispatchNoteRef = doc(collection(db, 'dispatchNotes'));

    const dispatchNotesCollection = collection(db, 'dispatchNotes');
    const dispatchCountSnapshot = await getDocs(query(dispatchNotesCollection));
    const newFolioNumber = dispatchCountSnapshot.size + 1;
    const folio = `ND-${String(newFolioNumber).padStart(6, '0')}`;

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
        batch.update(inventoryRef, cleanUndefined({ lots: inventoryData.lots, quantity: inventoryData.quantity }));

        if (!recipeUpdates[item.recipeId]) {
            const recipeSnap = await getDoc(doc(db, 'recipes', item.recipeId));
            const recipeData = recipeSnap.data() as Recipe;
            const itemsToProcess = Array.isArray(recipeData.items) ? recipeData.items.filter(i => i.sourceInventoryItemId) : [];
            const itemsToDispatch = itemsToProcess.length;
            recipeUpdates[item.recipeId] = { itemsToDispatch, dispatchedItems: 0 };
        }
        recipeUpdates[item.recipeId].dispatchedItems++;
    }

    for (const [recipeId, counts] of Object.entries(recipeUpdates)) {
        const recipeRef = doc(db, 'recipes', recipeId);
        const newStatus = counts.dispatchedItems >= counts.itemsToDispatch ? SkolSuppliedItemsDispatchStatus.Dispatched : SkolSuppliedItemsDispatchStatus.PartiallyDispatched;
        batch.update(recipeRef, cleanUndefined({ skolSuppliedItemsDispatchStatus: newStatus }));
    }

    const newDispatchNote: Omit<DispatchNote, 'id'> = {
        folio,
        externalPharmacyId: pharmacyId,
        status: DispatchStatus.Active,
        createdAt: new Date().toISOString(),
        items: dispatchItems,
        dispatcherId,
        dispatcherName,
    };
    batch.set(dispatchNoteRef, cleanUndefined(newDispatchNote));
    await batch.commit();
    return dispatchNoteRef.id;
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
            prescriptionImageUrl: recipe.prescriptionImageUrl,
        };
        batch.set(doc(logCol), cleanUndefined(newLogEntry));
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
    const newLogEntryRef = doc(logCol);
    const newLogEntryId = newLogEntryRef.id;
    const batch = writeBatch(db);

    const inventorySnap = await getDoc(inventoryRef);
    if (!inventorySnap.exists()) throw new Error(`Inventory item ${inventoryItemId} not found.`);
    const inventoryData = inventorySnap.data() as InventoryItem;

    if (!inventoryData.isControlled) throw new Error("This item is not a controlled substance.");
    if (inventoryData.inventoryType === 'Fraccionamiento' || inventoryData.inventoryType === 'Suministro Paciente') {
        throw new Error("Este producto es para fraccionamiento o de paciente y no puede ser vendido directamente en esta modalidad.");
    }

    const lotIndex = inventoryData.lots?.findIndex(l => l.lotNumber === lotNumber);
    if (lotIndex === undefined || lotIndex === -1 || !inventoryData.lots) throw new Error(`Lot ${lotNumber} not found for item ${inventoryItemId}.`);

    const lot = inventoryData.lots[lotIndex];
    if (lot.quantity < quantity) throw new Error(`Not enough stock for lot ${lotNumber}. Required: ${quantity}, Available: ${lot.quantity}`);
    
    const newLots = [...inventoryData.lots];
    newLots[lotIndex] = { ...lot, quantity: lot.quantity - quantity };
    const newTotalQuantity = inventoryData.quantity - quantity;
    batch.update(inventoryRef, cleanUndefined({ lots: newLots, quantity: newTotalQuantity }));

    const logSnapshot = await getDocs(query(logCol, where("entryType", "==", ControlledLogEntryType.DirectSale)));
    const newFolioNumber = logSnapshot.size + 1;
    const internalFolio = `CSL-DV-${new Date().getFullYear()}-${String(newFolioNumber).padStart(4, '0')}`;

    const patientSnap = await getDoc(doc(db, 'patients', patientId));
    if (!patientSnap.exists()) throw new Error("Patient not found");
    const patient = patientSnap.data() as Patient;
    
    let finalImageUrl: string | undefined;
    if (controlledRecipeFormat === 'physical' && prescriptionImageFile) {
      const storageRef = ref(storage, `prescriptions/${user.uid}/${newLogEntryId}`);
      try {
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
    batch.set(newLogEntryRef, cleanUndefined(newLogEntry));
    
    await batch.commit();
};

export const updatePatient = async (id: string, updates: Partial<Patient>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'patients', id), cleanUndefined(updates));
};


export const addPatient = async (patient: Partial<Omit<Patient, 'id' | 'proactiveStatus' | 'proactiveMessage' | 'actionNeeded' | 'commercialMedications' | 'firebaseUid'>>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    if (patient.rut) {
        const q = query(collection(db, "patients"), where("rut", "==", patient.rut), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Ya existe un paciente con este RUT.');
        }
    }
    
    const dataToSave: Omit<Patient, 'id'> = {
        name: patient.name || '',
        rut: patient.rut || '',
        email: patient.email || '',
        phone: patient.phone || '',
        address: patient.address || '',
        gender: patient.gender || 'Otro',
        isChronic: patient.isChronic || false,
        isHomeCare: patient.isHomeCare || false,
        proactiveStatus: ProactivePatientStatus.OK,
        proactiveMessage: 'No requiere acción.',
        actionNeeded: PatientActionNeeded.NONE,
        commercialMedications: [],
        allergies: [],
    };
    const docRef = await addDoc(collection(db, 'patients'), cleanUndefined(dataToSave));
    return docRef.id;
};


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
    await updateDoc(reportRef, cleanUndefined(dataToUpdate));
};

export const addPharmacovigilanceReport = async (reportData: Omit<PharmacovigilanceReport, 'id' | 'reportedAt' | 'updatedAt' | 'status' | 'involvedMedications'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const newReport: Omit<PharmacovigilanceReport, 'id'> = {
        ...reportData,
        status: PharmacovigilanceReportStatus.New,
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        involvedMedications: reportData.suspectedMedicationName, // For backwards compatibility with charts
    };
    const docRef = await addDoc(collection(db, 'pharmacovigilanceReports'), cleanUndefined(newReport));
    return docRef.id;
};

export const updateExternalPharmacy = async (id: string, updates: Partial<ExternalPharmacy>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'externalPharmacies', id), cleanUndefined(updates));
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
            } else if (recipe.isControlled) {
                status = DispensationItemStatus.RequiresAttention;
                reason = "Receta controlada pendiente de recepción y validación.";
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
            } else if (inventoryItem.isControlled) {
                status = DispensationItemStatus.RequiresAttention;
                reason = "Requiere receta controlada física/digital.";
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

    const docRef = await addDoc(collection(db, 'monthlyDispensations'), cleanUndefined(newBox));
    return docRef.id;
};

export const updateMonthlyDispensationBox = async (boxId: string, updates: Partial<MonthlyDispensationBox>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const boxRef = doc(db, 'monthlyDispensations', boxId);
  const dataToUpdate = { ...updates, updatedAt: new Date().toISOString() };
  await updateDoc(boxRef, cleanUndefined(dataToUpdate));
};

export const updateAppSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = doc(db, 'appSettings', 'global');
    await updateDoc(settingsRef, cleanUndefined(updates));
};

export const batchSendRecipesToExternal = async (recipeIds: string[], userId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (recipeIds.length === 0) return;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const newAuditEntry: AuditTrailEntry = {
        status: RecipeStatus.SentToExternal,
        date: now,
        userId: userId,
        notes: 'Receta enviada a recetario externo en lote.'
    };

    for (const id of recipeIds) {
        const recipeRef = doc(db, 'recipes', id);
        const recipeSnap = await getDoc(recipeRef);
        if (recipeSnap.exists()) {
            const recipeData = recipeSnap.data() as Recipe;
            batch.update(recipeRef, cleanUndefined({
                status: RecipeStatus.SentToExternal,
                updatedAt: now,
                auditTrail: [...(recipeData.auditTrail || []), newAuditEntry],
            }));
        }
    }

    await batch.commit();
};
    
export async function sendMessageFromPharmacist(patientId: string, content: string): Promise<PatientMessage> {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const messageRef = doc(collection(db, 'patientMessages'));
    
    const newMessage: PatientMessage = {
        id: messageRef.id,
        patientId,
        content,
        sender: 'pharmacist',
        createdAt: new Date().toISOString(),
        read: false, 
    };
    
    const { id, ...dataToSave } = newMessage;
    await setDoc(messageRef, cleanUndefined(dataToSave));
    
    return newMessage;
};

export const markMessagesAsRead = async (patientId: string, reader: 'pharmacist' | 'patient'): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const senderToMark = reader === 'pharmacist' ? 'patient' : 'pharmacist';

    const messagesQuery = query(
        collection(db, 'patientMessages'), 
        where('patientId', '==', patientId),
        where('sender', '==', senderToMark),
        where('read', '==', false)
    );

    const querySnapshot = await getDocs(messagesQuery);
    if (querySnapshot.empty) {
        return; // No messages to mark as read
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    await batch.commit();
};
    
export const addRole = async (role: Omit<Role, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const q = query(collection(db, "roles"), where("name", "==", role.name), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`El rol "${role.name}" ya existe.`);
    }
    const docRef = await addDoc(collection(db, 'roles'), cleanUndefined(role));
    return docRef.id;
};

export const updateRole = async (id: string, updates: Partial<Role>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await updateDoc(doc(db, 'roles', id), cleanUndefined(updates));
};

export const deleteRole = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const usersQuery = query(collection(db, "users"), where("roleId", "==", id), limit(1));
    const usersSnapshot = await getDocs(usersQuery);
    if (!usersSnapshot.empty) {
        throw new Error("No se puede eliminar el rol porque está asignado a uno o más usuarios.");
    }
    await deleteDoc(doc(db, 'roles', id));
};

export const addUserRequest = async (request: Omit<UserRequest, 'id' | 'status' | 'requestedAt'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const requestData: Omit<UserRequest, 'id'> = {
        ...request,
        status: UserRequestStatus.Pending,
        requestedAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'userRequests'), cleanUndefined(requestData));
};

export const approveUserRequest = async (requestId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const requestRef = doc(db, 'userRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
        throw new Error("Solicitud de usuario no encontrada.");
    }
    const requestData = requestSnap.data() as UserRequest;
    
    const rutQuery = query(collection(db, "patients"), where("rut", "==", requestData.rut), limit(1));
    const emailQuery = query(collection(db, "patients"), where("email", "==", requestData.email), limit(1));
    
    const [rutSnapshot, emailSnapshot] = await Promise.all([getDocs(rutQuery), getDocs(emailQuery)]);
    
    const existingPatientDoc = rutSnapshot.docs[0] || emailSnapshot.docs[0];

    const batch = writeBatch(db);

    if (existingPatientDoc) {
        batch.update(existingPatientDoc.ref, { firebaseUid: requestData.firebaseUid, email: requestData.email });
    } else {
        const newPatientRef = doc(collection(db, 'patients'));
        const newPatientData: Omit<Patient, 'id'> = {
            name: requestData.name,
            rut: requestData.rut,
            email: requestData.email,
            firebaseUid: requestData.firebaseUid,
            isChronic: false, 
            proactiveStatus: ProactivePatientStatus.OK,
            proactiveMessage: 'No requiere acción.',
            actionNeeded: PatientActionNeeded.NONE,
        };
        batch.set(newPatientRef, cleanUndefined(newPatientData));
    }

    batch.update(requestRef, { status: UserRequestStatus.Approved });
    
    await batch.commit();
};

export const rejectUserRequest = async (requestId: string, reason: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const requestRef = doc(db, 'userRequests', requestId);
    await updateDoc(requestRef, {
        status: UserRequestStatus.Rejected,
        rejectionReason: reason
    });
};

export const getOrders = async (patientId: string): Promise<Order[]> => {
    if (!db) return [];
    const q = query(collection(db, "orders"), where("patientId", "==", patientId));
    return fetchCollection<Order>('orders', q);
};

export async function placeOrder(
  patientId: string,
  items: OrderItem[],
  total: number,
  userId: string,
  prescriptionFile?: File
): Promise<string> {
  if (!db || !storage) {
    throw new Error("Firestore o Storage no están inicializados.");
  }
  
  const orderRef = doc(collection(db, 'orders'));
  const orderId = orderRef.id;
  
  let prescriptionImageUrl: string | undefined = undefined;
  if (prescriptionFile) {
    const storageRef = ref(storage, `order-prescriptions/${userId}/${orderId}`);
    try {
      const uploadResult = await uploadBytes(storageRef, prescriptionFile);
      prescriptionImageUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError) {
      console.error("Firebase Storage upload failed for order:", storageError);
      throw new Error("Error al subir la imagen de la receta.");
    }
  }

  const newOrder: Omit<Order, 'id'> = {
    patientId,
    items,
    total,
    status: 'Pendiente',
    createdAt: new Date().toISOString(),
    prescriptionImageUrl,
  };
  
  await setDoc(orderRef, cleanUndefined(newOrder));
  
  return orderId;
}

export const updateOrder = async (id: string, updates: Partial<Order>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await updateDoc(doc(db, 'orders', id), cleanUndefined(updates));
};

export const attachControlledPrescriptionToItem = async (boxId: string, recipeId: string, newFolio: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const batch = writeBatch(db);
    
    const boxRef = doc(db, 'monthlyDispensations', boxId);
    const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("Dispensation box not found.");
    
    const boxData = boxSnap.data() as MonthlyDispensationBox;
    const itemIndex = boxData.items.findIndex(item => item.id === recipeId && item.type === 'magistral');
    if (itemIndex === -1) throw new Error("Item not found in dispensation box.");

    const updatedItems = [...boxData.items];
    updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        status: DispensationItemStatus.OkToInclude,
        reason: `Receta controlada adjuntada. Folio: ${newFolio}`,
        pharmacistNotes: `Folio adjuntado: ${newFolio}`
    };

    batch.update(boxRef, cleanUndefined({ items: updatedItems }));

    const recipeRef = doc(db, 'recipes', recipeId);
    batch.update(recipeRef, cleanUndefined({ controlledRecipeFolio: newFolio }));

    await batch.commit();
};

export const unlockCommercialControlledItemInBox = async (boxId: string, itemId: string, newFolio: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    
    const boxRef = doc(db, 'monthlyDispensations', boxId);
    const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("Dispensation box not found.");
    
    const boxData = boxSnap.data() as MonthlyDispensationBox;
    const itemIndex = boxData.items.findIndex(item => item.id === itemId && item.type === 'commercial');
    if (itemIndex === -1) throw new Error("Commercial item not found in dispensation box.");

    const updatedItems = [...boxData.items];
    updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        status: DispensationItemStatus.OkToInclude,
        reason: `Receta controlada adjuntada. Folio: ${newFolio}`,
        pharmacistNotes: `Folio adjuntado: ${newFolio}`
    };

    await updateDoc(boxRef, cleanUndefined({ items: updatedItems, updatedAt: new Date().toISOString() }));
};

/**
 * Syncs the quantity of local 'Fraccionamiento' inventory items
 * with the total stock from Lioren, using barcode as the key.
 */
export async function syncFraccionamientoStock(): Promise<{ success: boolean; updatedCount: number; message: string }> {
  console.log("Starting stock sync with Lioren...");
  
  if (!db) {
    return { success: false, updatedCount: 0, message: 'Firestore no está inicializado.' };
  }

  try {
    const localInventory = await getInventory();
    const fraccionamientoItems = localInventory.filter(item => item.inventoryType === 'Fraccionamiento');

    if (fraccionamientoItems.length === 0) {
      return { success: true, updatedCount: 0, message: 'No hay productos de fraccionamiento para sincronizar.' };
    }

    const batch = writeBatch(db);
    let updatedCount = 0;
    const errors: string[] = [];

    for (const localItem of fraccionamientoItems) {
      const localItemSku = localItem.sku || localItem.barcode;
      
      if (localItemSku) {
        // Use the new, more precise search function
        const { product: liorenProduct, error } = await searchLiorenProductByCode(localItemSku);

        if (error) {
            errors.push(`Error fetching ${localItem.name}: ${error}`);
            continue; // Skip to next item
        }

        if (liorenProduct) {
            let liorenTotalStock = 0;
            if (Array.isArray(liorenProduct.stocks)) {
                for (const stockDetail of liorenProduct.stocks) {
                    const stockValue = Number(stockDetail.stock ?? stockDetail.cantidad);
                    if (!isNaN(stockValue)) {
                        liorenTotalStock += stockValue;
                    }
                }
            }

            if (localItem.quantity !== liorenTotalStock) {
              const itemRef = doc(db, 'inventory', localItem.id);
              batch.update(itemRef, { quantity: liorenTotalStock });
              updatedCount++;
            }
        } else {
            console.log(`Product with SKU ${localItemSku} (${localItem.name}) not found in Lioren.`);
        }
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }
    
    const message = `Sincronización completa. Se actualizaron ${updatedCount} productos. ${errors.length > 0 ? `Errores: ${errors.join(', ')}` : ''}`;
    console.log(message);
    return { success: true, updatedCount, message };

  } catch (error) {
    console.error('Failed to run stock sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, updatedCount: 0, message: `La sincronización falló: ${errorMessage}` };
  }
}

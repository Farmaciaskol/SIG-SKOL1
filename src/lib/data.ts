
import { db, storage } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { RecipeStatus, SkolSuppliedItemsDispatchStatus, DispatchStatus, ControlledLogEntryType } from './types';
import type { Recipe, Doctor, InventoryItem, User, Role, ExternalPharmacy, Patient, PharmacovigilanceReport, AppData, AuditTrailEntry, DispatchNote, DispatchItem, ControlledSubstanceLogEntry } from './types';
import { getMockData } from './mock-data';
import { statusConfig } from './constants';

export * from './types';

const USE_MOCK_DATA_ON_EMPTY_FIRESTORE = process.env.NODE_ENV === 'development';

// A flag to prevent seeding more than once per app load
const seededCollections = new Set<string>();

async function fetchCollection<T extends { id: string }>(collectionName: keyof AppData & string): Promise<T[]> {
  if (!db) {
    console.error("Firestore is not initialized.");
    // Return empty array instead of mock data if db is not available to avoid confusion
    return [];
  }
  try {
    let querySnapshot = await getDocs(collection(db, collectionName));
    
    // If the collection is empty, seed it with mock data
    if (querySnapshot.empty && USE_MOCK_DATA_ON_EMPTY_FIRESTORE && !seededCollections.has(collectionName)) {
      console.warn(`Firestore collection '${collectionName}' is empty. Seeding with mock data...`);
      const mockData = getMockData()[collectionName];
      if (mockData && mockData.length > 0) {
        const batch = writeBatch(db);
        mockData.forEach((item: any) => {
          const docRef = doc(db, collectionName, item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`Successfully seeded ${mockData.length} documents into '${collectionName}'.`);
        seededCollections.add(collectionName);
        // Re-fetch the data after seeding
        querySnapshot = await getDocs(collection(db, collectionName));
      }
    }

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamps to ISO strings for dates
      for (const key in data) {
        if (data[key] instanceof Timestamp) {
          data[key] = data[key].toDate().toISOString();
        }
      }
      return { id: doc.id, ...data } as T;
    });
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    // In case of error, returning an empty array is safer than falling back to mock data,
    // which can hide connection issues.
    return [];
  }
}


// Specific fetch functions for each data type
export const getRecipes = async (): Promise<Recipe[]> => fetchCollection<Recipe>('recipes');
export const getPatients = async (): Promise<Patient[]> => fetchCollection<Patient>('patients');
export const getDoctors = async (): Promise<Doctor[]> => fetchCollection<Doctor>('doctors');
export const getExternalPharmacies = async (): Promise<ExternalPharmacy[]> => fetchCollection<ExternalPharmacy>('externalPharmacies');
export const getInventory = async (): Promise<InventoryItem[]> => fetchCollection<InventoryItem>('inventory');
export const getUsers = async (): Promise<User[]> => fetchCollection<User>('users');
export const getRoles = async (): Promise<Role[]> => fetchCollection<Role>('roles');
export const getPharmacovigilanceReports = async (): Promise<PharmacovigilanceReport[]> => fetchCollection<PharmacovigilanceReport>('pharmacovigilanceReports');
export const getDispatchNotes = async (): Promise<DispatchNote[]> => fetchCollection<DispatchNote>('dispatchNotes');
export const getControlledSubstanceLog = async (): Promise<ControlledSubstanceLogEntry[]> => fetchCollection<ControlledSubstanceLogEntry>('controlledSubstanceLog');


// Example of getting a single document
export const getRecipe = async (id: string): Promise<Recipe | null> => {
    if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
    try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
             // Convert Firestore Timestamps to ISO strings for dates
            for (const key in data) {
                if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate().toISOString();
                }
            }
            // Ensure auditTrail is an array
            if (!data.auditTrail) {
                data.auditTrail = [];
            }
            return { id: docSnap.id, ...data } as Recipe;
        } else {
            console.log(`Document with id ${id} not found in recipes collection.`);
            return null;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        return null;
    }
};

export const deleteRecipe = async (id: string): Promise<void> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        const recipeRef = doc(db, 'recipes', id);
        await deleteDoc(recipeRef);
    } catch (error) {
        console.error("Error deleting recipe:", error);
        throw new Error("Could not delete recipe.");
    }
};

export const addDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<string> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        const doctorData = {
            name: doctor.name,
            specialty: doctor.specialty,
            license: doctor.license || '',
            rut: doctor.rut || '',
            phone: doctor.phone || '',
            email: doctor.email || '',
        };
        const docRef = await addDoc(collection(db, 'doctors'), doctorData);
        return docRef.id;
    } catch (error) {
        console.error("Error adding doctor:", error);
        throw new Error("Could not add doctor.");
    }
};

export const addExternalPharmacy = async (pharmacy: Omit<ExternalPharmacy, 'id'>): Promise<string> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        // Ensure all optional fields are at least empty strings
        const pharmacyData = {
            ...pharmacy,
            contactPerson: pharmacy.contactPerson || '',
            email: pharmacy.email || '',
            phone: pharmacy.phone || '',
            address: pharmacy.address || '',
            paymentDetails: pharmacy.paymentDetails || '',
        };
        const docRef = await addDoc(collection(db, 'externalPharmacies'), pharmacyData);
        return docRef.id;
    } catch (error) {
        console.error("Error adding external pharmacy:", error);
        throw new Error("Could not add external pharmacy.");
    }
};

export const updateRecipe = async (id: string, updates: Partial<Recipe>): Promise<void> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        const recipeRef = doc(db, 'recipes', id);
        const dataToUpdate = {
            ...updates,
            updatedAt: new Date().toISOString()
        };
        // Firestore cannot store 'undefined' values, so we should clean them.
        Object.keys(dataToUpdate).forEach(key => {
            if ((dataToUpdate as any)[key] === undefined) {
                delete (dataToUpdate as any)[key];
            }
        });
        await updateDoc(recipeRef, dataToUpdate as any);
    } catch (error) {
        console.error("Error updating recipe:", error);
        throw new Error("Could not update recipe.");
    }
};


export const saveRecipe = async (data: any, imageUri: string | null, recipeId?: string): Promise<string> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }

    let patientId = data.patientId;
    if (!patientId && data.newPatientName && data.newPatientRut) {
        const newPatientRef = doc(collection(db, 'patients'));
        patientId = newPatientRef.id;
        await setDoc(newPatientRef, {
            name: data.newPatientName,
            rut: data.newPatientRut,
            email: '',
            phone: '',
            isChronic: false,
            proactiveStatus: 'OK',
            proactiveMessage: 'No requiere acción.',
            actionNeeded: 'NONE',
            chronicCareStatus: 'OK'
        });
    }

    let doctorId = data.doctorId;
    if (!doctorId && data.newDoctorName && data.newDoctorLicense) {
        const newDoctorRef = doc(collection(db, 'doctors'));
        doctorId = newDoctorRef.id;
        await setDoc(newDoctorRef, {
            name: data.newDoctorName,
            specialty: data.newDoctorSpecialty || '',
            license: data.newDoctorLicense,
            rut: data.newDoctorRut || ''
        });
    }

    const effectiveRecipeId = recipeId || doc(collection(db, 'recipes')).id;
    let imageUrl: string | undefined;

    if (imageUri && storage && imageUri.startsWith('data:')) {
        try {
            const storageRef = ref(storage, `prescriptions/${effectiveRecipeId}`);
            const uploadResult = await uploadString(storageRef, imageUri, 'data_url');
            imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    } else if (imageUri) {
        imageUrl = imageUri; // It's an existing URL
    }
    
    const recipeDataForUpdate: Partial<Recipe> = {
        patientId: patientId,
        doctorId: doctorId,
        dispatchAddress: data.dispatchAddress,
        items: data.items,
        prescriptionDate: data.prescriptionDate,
        dueDate: data.dueDate,
        updatedAt: new Date().toISOString(),
        externalPharmacyId: data.externalPharmacyId,
        supplySource: data.supplySource,
        preparationCost: Number(data.preparationCost),
        isControlled: data.isControlled,
        controlledRecipeType: data.controlledRecipeType,
        controlledRecipeFolio: data.controlledRecipeFolio,
        prescriptionImageUrl: imageUrl,
    };
    
    if (data.supplySource === 'Insumos de Skol') {
        const hasFractionationItems = data.items.some((item: any) => item.requiresFractionation);
        if (hasFractionationItems) {
             recipeDataForUpdate.skolSuppliedItemsDispatchStatus = SkolSuppliedItemsDispatchStatus.Pending;
        }
    }


    if (recipeId) { // Editing existing recipe
        const recipeRef = doc(db, 'recipes', recipeId);
        const existingRecipe = await getRecipe(recipeId);
        
        // If editing a rejected recipe, reset status to Pending Validation
        if (existingRecipe && existingRecipe.status === RecipeStatus.Rejected) {
            const newAuditTrailEntry: AuditTrailEntry = {
                status: RecipeStatus.PendingValidation,
                date: new Date().toISOString(),
                userId: 'system-user', // Placeholder
                notes: 'Receta corregida y reenviada para validación.'
            };
            recipeDataForUpdate.status = RecipeStatus.PendingValidation;
            recipeDataForUpdate.rejectionReason = ''; // Clear rejection reason
            recipeDataForUpdate.auditTrail = [...(existingRecipe.auditTrail || []), newAuditTrailEntry];
        }

        await updateDoc(recipeRef, recipeDataForUpdate as any);
        return recipeId;
    } else { // Creating new recipe
        const recipeRef = doc(db, 'recipes', effectiveRecipeId);
        
        const firstAuditEntry: AuditTrailEntry = {
            status: RecipeStatus.PendingValidation,
            date: new Date().toISOString(),
            userId: 'system-user', // Placeholder
            notes: 'Receta creada en el sistema.'
        };
        
        const recipeDataForCreate: Omit<Recipe, 'id'> = {
            ...recipeDataForUpdate,
            status: RecipeStatus.PendingValidation,
            paymentStatus: 'Pendiente',
            createdAt: new Date().toISOString(),
            auditTrail: [firstAuditEntry]
        } as Omit<Recipe, 'id'>;

        await setDoc(recipeRef, recipeDataForCreate);
        return effectiveRecipeId;
    }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'quantity' | 'lots'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    try {
        const itemData = {
            ...item,
            quantity: 0,
            lots: [],
        };
        const docRef = await addDoc(collection(db, 'inventory'), itemData);
        return docRef.id;
    } catch (error) {
        console.error("Error adding inventory item:", error);
        throw new Error("Could not add inventory item.");
    }
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    try {
        const itemRef = doc(db, 'inventory', id);
        await updateDoc(itemRef, updates as any);
    } catch (error) {
        console.error("Error updating inventory item:", error);
        throw new Error("Could not update inventory item.");
    }
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
        if (!inventorySnap.exists()) {
            throw new Error(`Inventory item ${item.inventoryItemId} not found.`);
        }
        const inventoryData = inventorySnap.data() as InventoryItem;

        const lotIndex = inventoryData.lots?.findIndex(l => l.lotNumber === item.lotNumber);
        if (lotIndex === undefined || lotIndex === -1 || !inventoryData.lots) {
            throw new Error(`Lot ${item.lotNumber} not found for item ${item.inventoryItemId}.`);
        }

        const lot = inventoryData.lots[lotIndex];
        if (lot.quantity < item.quantity) {
            throw new Error(`Not enough stock for lot ${item.lotNumber}. Required: ${item.quantity}, Available: ${lot.quantity}`);
        }

        lot.quantity -= item.quantity;
        inventoryData.quantity -= item.quantity;

        batch.update(inventoryRef, { lots: inventoryData.lots, quantity: inventoryData.quantity });

        if (!recipeUpdates[item.recipeId]) {
            const recipeSnap = await getDoc(doc(db, 'recipes', item.recipeId));
            const recipeData = recipeSnap.data() as Recipe;
            const itemsToDispatch = recipeData.items.filter(i => i.requiresFractionation).length;
            recipeUpdates[item.recipeId] = { itemsToDispatch, dispatchedItems: 0 };
        }
        recipeUpdates[item.recipeId].dispatchedItems++;
    }

    for (const [recipeId, counts] of Object.entries(recipeUpdates)) {
        const recipeRef = doc(db, 'recipes', recipeId);
        const newStatus = counts.dispatchedItems >= counts.itemsToDispatch
            ? SkolSuppliedItemsDispatchStatus.Dispatched
            : SkolSuppliedItemsDispatchStatus.PartiallyDispatched;
        batch.update(recipeRef, { skolSuppliedItemsDispatchStatus: newStatus });
    }

    const newDispatchNote: DispatchNote = {
        id: dispatchNoteId,
        externalPharmacyId: pharmacyId,
        status: DispatchStatus.Active,
        createdAt: new Date().toISOString(),
        items: dispatchItems,
    };
    batch.set(dispatchNoteRef, newDispatchNote);

    await batch.commit();

    return dispatchNoteId;
};

export const logControlledMagistralDispensation = async (recipe: Recipe, patient: Patient): Promise<void> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    if (!recipe.isControlled || !recipe.controlledRecipeFolio || !recipe.controlledRecipeType) {
        throw new Error("Recipe is not a valid controlled substance recipe.");
    }
    if (recipe.items.length === 0) {
        throw new Error("Recipe has no items to log.");
    }

    try {
        const logCol = collection(db, 'controlledSubstanceLog');
        const logSnapshot = await getDocs(logCol);
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
                controlledType: 'Psicotrópico', // This might need to be more dynamic if recipes can contain estupefacientes
                prescriptionFolio: recipe.controlledRecipeFolio,
                prescriptionType: recipe.controlledRecipeType as any,
                retrievedBy_Name: patient.name,
                retrievedBy_RUT: patient.rut,
                prescriptionImageUrl: recipe.controlledRecipeImageUrl || recipe.prescriptionImageUrl,
            };

            const logDocRef = doc(logCol);
            batch.set(logDocRef, newLogEntry);
        }

        await batch.commit();

    } catch (error) {
        console.error("Error logging controlled substance dispensation:", error);
        throw new Error("Could not log controlled substance dispensation.");
    }
};

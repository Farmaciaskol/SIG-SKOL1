import { db, storage } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { RecipeStatus } from './types';
import type { Recipe, Doctor, InventoryItem, User, Role, ExternalPharmacy, Patient, PharmacovigilanceReport, AppData, AuditTrailEntry } from './types';
import { getMockData } from './mock-data';

export * from './types';

const USE_MOCK_DATA_ON_EMPTY_FIRESTORE = process.env.NODE_ENV === 'development';

async function fetchCollection<T extends { id: string }>(collectionName: keyof AppData & string): Promise<T[]> {
  if (!db) {
    console.error("Firestore is not initialized. Falling back to mock data.");
    return getMockData()[collectionName] as T[];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    // If the collection is empty in Firestore, return mock data for a better dev experience.
    if (querySnapshot.empty && USE_MOCK_DATA_ON_EMPTY_FIRESTORE) {
      console.warn(`Firestore collection '${collectionName}' is empty. Using mock data for testing.`);
      return getMockData()[collectionName] as T[];
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
    if (USE_MOCK_DATA_ON_EMPTY_FIRESTORE) {
      console.warn(`Firestore fetch failed for '${collectionName}'. Using mock data as a fallback.`);
      return getMockData()[collectionName] as T[];
    }
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


// Example of getting a single document
export const getRecipe = async (id: string): Promise<Recipe | null> => {
    if (!db) {
        console.error("Firestore is not initialized.");
        const mockRecipes = getMockData().recipes;
        return mockRecipes.find(r => r.id === id) || null;
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
            return { id: docSnap.id, ...data } as Recipe;
        } else {
             if (USE_MOCK_DATA_ON_EMPTY_FIRESTORE) {
                const mockRecipes = getMockData().recipes;
                return mockRecipes.find(r => r.id === id) || null;
            }
            console.log("No such document!");
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
        dueDate: data.expiryDate,
        updatedAt: new Date().toISOString(),
        externalPharmacyId: data.externalPharmacyId,
        supplySource: data.supplySource,
        preparationCost: Number(data.preparationCost),
        isControlled: data.isControlled,
        controlledRecipeType: data.controlledRecipeType,
        controlledRecipeFolio: data.controlledRecipeFolio,
        prescriptionImageUrl: imageUrl,
    };

    if (recipeId) { // Editing existing recipe
        const recipeRef = doc(db, 'recipes', recipeId);
        const existingRecipe = await getRecipe(recipeId);
        
        if (existingRecipe && existingRecipe.status === RecipeStatus.Rejected) {
            const newAuditTrailEntry: AuditTrailEntry = {
                status: RecipeStatus.PendingValidation,
                date: new Date().toISOString(),
                userId: 'system-user', // Placeholder
                notes: 'Receta corregida y reenviada para validación.'
            };
            recipeDataForUpdate.status = RecipeStatus.PendingValidation;
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

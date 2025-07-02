import { db, storage } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { RecipeStatus } from './types';
import type { Recipe, Patient, Doctor, InventoryItem, User, Role, ExternalPharmacy } from './types';

export * from './types';

// Generic function to fetch a collection
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  if (!db) {
    console.error("Firestore is not initialized.");
    return [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
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
            return { id: docSnap.id, ...data } as Recipe;
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        return null;
    }
};

export const addDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<string> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        const docRef = await addDoc(collection(db, 'doctors'), doctor);
        return docRef.id;
    } catch (error) {
        console.error("Error adding doctor:", error);
        throw new Error("Could not add doctor.");
    }
};

export const addExternalPharmacy = async (pharmacy: { name: string }): Promise<string> => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    try {
        const docRef = await addDoc(collection(db, 'externalPharmacies'), {
            name: pharmacy.name
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding external pharmacy:", error);
        throw new Error("Could not add external pharmacy.");
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

    if (imageUri && storage) {
        try {
            const storageRef = ref(storage, `prescriptions/${effectiveRecipeId}`);
            const uploadResult = await uploadString(storageRef, imageUri, 'data_url');
            imageUrl = await getDownloadURL(uploadResult.ref);
        } catch (error) {
            console.error("Error uploading image:", error);
        }
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

    if (recipeId) {
        const recipeRef = doc(db, 'recipes', recipeId);
        await updateDoc(recipeRef, recipeDataForUpdate);
        return recipeId;
    } else {
        const recipeRef = doc(db, 'recipes', effectiveRecipeId);
        const recipeDataForCreate: Omit<Recipe, 'id'> = {
            ...recipeDataForUpdate,
            status: RecipeStatus.PendingValidation,
            paymentStatus: 'Pendiente',
            createdAt: new Date().toISOString(),
        } as Omit<Recipe, 'id'>;

        await setDoc(recipeRef, recipeDataForCreate);
        return effectiveRecipeId;
    }
};

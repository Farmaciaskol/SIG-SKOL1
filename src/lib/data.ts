import { db } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Recipe, Patient, Doctor, InventoryItem, User, Role } from './types';

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

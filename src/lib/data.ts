import { LOCAL_STORAGE_KEY } from './constants';
import { getMockData, AppData } from './mock-data';
import type { Recipe, Patient, Doctor, InventoryItem, User, Role } from './types';

export * from './types';

let dataCache: AppData | null = null;

export function getInitialData(): AppData {
  if (typeof window === 'undefined') {
    return getMockData(); // Return mock data for SSR
  }

  if (dataCache) {
    return dataCache;
  }

  try {
    const storedData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      dataCache = JSON.parse(storedData) as AppData;
      return dataCache!;
    }
  } catch (error) {
    console.error('Failed to read from localStorage', error);
  }

  const mockData = getMockData();
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockData));
    dataCache = mockData;
  } catch (error) {
    console.error('Failed to write to localStorage', error);
  }
  
  return mockData;
}

export function updateData(newData: Partial<AppData>): AppData {
  const currentData = getInitialData();
  const updatedData = { ...currentData, ...newData };
  
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
      dataCache = updatedData;
    } catch (error) {
      console.error('Failed to write to localStorage', error);
    }
  }
  
  return updatedData;
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
  const currentData = getInitialData();
  const newRecipe: Recipe = {
    ...recipe,
    id: `R${(currentData.recipes.length + 1).toString().padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updatedRecipes = [...currentData.recipes, newRecipe];
  updateData({ recipes: updatedRecipes });
  return newRecipe;
}

export function clearAllData() {
  if (typeof window !== 'undefined') {
    try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        dataCache = null;
    } catch (error) {
        console.error('Failed to clear localStorage', error);
    }
  }
}

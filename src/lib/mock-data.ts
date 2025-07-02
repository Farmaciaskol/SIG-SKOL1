import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, DispatchNote } from './types';

export function getMockData(): AppData {
  const patients: Patient[] = [];
  const doctors: Doctor[] = [];
  const externalPharmacies: ExternalPharmacy[] = [];
  const inventory: InventoryItem[] = [];
  const recipes: Recipe[] = [];
  const users: User[] = [];
  const roles: Role[] = [];
  const dispatchNotes: DispatchNote[] = [];

  return { patients, doctors, inventory, recipes, users, roles, externalPharmacies, dispatchNotes };
}

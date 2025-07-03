
import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, PharmacovigilanceReport, ControlledSubstanceLogEntry } from './types';

// All mock data has been cleared. The arrays are intentionally empty.

const roles: Role[] = [];
const users: User[] = [];
const doctors: Doctor[] = [];
const patients: Patient[] = [];
const externalPharmacies: ExternalPharmacy[] = [];
const inventory: InventoryItem[] = [];
const recipes: Recipe[] = [];
const pharmacovigilanceReports: PharmacovigilanceReport[] = [];
const controlledSubstanceLog: ControlledSubstanceLogEntry[] = [];

export function getMockData(): AppData {
    return {
        recipes,
        patients,
        doctors,
        inventory,
        users,
        roles,
        externalPharmacies,
        dispatchNotes: [],
        pharmacovigilanceReports,
        controlledSubstanceLog,
    };
}

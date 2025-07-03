
import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, PharmacovigilanceReport, ControlledSubstanceLogEntry } from './types';
import { RecipeStatus, ProactivePatientStatus, PatientActionNeeded, SkolSuppliedItemsDispatchStatus, PharmacovigilanceReportStatus, ControlledLogEntryType } from './types';
import { subDays, addDays, formatISO, addMonths } from 'date-fns';

const now = new Date();

// --- ROLES ---
const roles: Role[] = [];

// --- USERS ---
const users: User[] = [];

// --- DOCTORS ---
const doctors: Doctor[] = [];

// --- PATIENTS ---
const patients: Patient[] = [];

// --- EXTERNAL PHARMACIES ---
const externalPharmacies: ExternalPharmacy[] = [];

// --- INVENTORY ---
const inventory: InventoryItem[] = [];

// --- RECIPES ---
const recipes: Recipe[] = [];

// --- PHARMACOVIGILANCE & CONTROLLED LOG (Can be empty for now) ---
const pharmacovigilanceReports: PharmacovigilanceReport[] = [];
const controlledSubstanceLog: ControlledSubstanceLogEntry[] = [];

// --- EXPORT MOCK DATA ---
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

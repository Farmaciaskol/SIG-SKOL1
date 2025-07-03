
import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, PharmacovigilanceReport, ControlledSubstanceLogEntry } from './types';
import { RecipeStatus, ProactivePatientStatus, PatientActionNeeded, SkolSuppliedItemsDispatchStatus, PharmacovigilanceReportStatus, ControlledLogEntryType } from './types';
import { subDays, addDays, formatISO, addMonths } from 'date-fns';

const now = new Date();

// --- ROLES ---
const roles: Role[] = [
  { id: 'role-admin', name: 'Administrador', permissions: ['all'] },
  { id: 'role-pharma', name: 'Farmacéutico', permissions: ['recipes:read', 'recipes:update'] },
];

// --- USERS ---
const users: User[] = [
  { id: 'user-1', name: 'Admin Skol', email: 'admin@skol.cl', roleId: 'role-admin' },
  { id: 'user-2', name: 'QF. Juan Pérez', email: 'juan.perez@skol.cl', roleId: 'role-pharma' },
];

// --- DOCTORS ---
const doctors: Doctor[] = [
  { id: 'doc-1', name: 'Dr. Ricardo González', specialty: 'Dermatología', license: '12345', rut: '9.876.543-2' },
  { id: 'doc-2', name: 'Dra. Carolina Soto', specialty: 'Reumatología', license: '54321', rut: '12.345.678-9' },
];

// --- PATIENTS ---
const patients: Patient[] = [
  { id: 'pat-1', name: 'Ana Torres', rut: '15.123.456-7', email: 'ana.torres@email.com', phone: '+56988887777', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-2', name: 'Carlos López', rut: '16.234.567-8', email: 'carlos.lopez@email.com', phone: '+56977776666', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-3', name: 'Luisa Martinez', rut: '17.345.678-9', email: 'luisa.martinez@email.com', phone: '+56966665555', isChronic: true, allergies: ['Penicilina'], proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Receta por vencer.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, chronicCareStatus: 'Atención' },
];

// --- EXTERNAL PHARMACIES ---
const externalPharmacies: ExternalPharmacy[] = [
    { id: 'ext-pharma-1', name: 'Farmacias Magistrales Central', contactPerson: 'Luisa Martínez' },
    { id: 'ext-pharma-2', name: 'Recetario Alameda', contactPerson: 'Roberto Carlos' },
];

// --- INVENTORY ---
const inventory: InventoryItem[] = [
  { 
    id: 'inv-minox', 
    name: 'Minoxidil Base Pura (Insumo)', 
    quantity: 500, unit: 'g', lowStockThreshold: 100, sku: 'SKOL-MINOX-P', barcode: '1111111111111', 
    itemsPerBaseUnit: 1, activePrincipleContentValue: 1000, activePrincipleContentUnit: 'mg',
    lots: [{ lotNumber: 'MINOX-P-2403B', quantity: 500, expiryDate: formatISO(addDays(now, 730)) }] 
  },
  { 
    id: 'inv-clona', 
    name: 'Clonazepam 2mg (Caja 30 comp)', 
    quantity: 20, unit: 'cajas', lowStockThreshold: 5, sku: 'SKOL-CLONA-2', barcode: '2222222222222', isControlled: true, controlledType: 'Psicotrópico',
    itemsPerBaseUnit: 30, activePrincipleContentValue: 2, activePrincipleContentUnit: 'mg',
    lots: [{ lotNumber: 'CLONA-2312C', quantity: 20, expiryDate: formatISO(addDays(now, 180)) }]
  },
  {
    id: 'inv-crema',
    name: 'Base Crema Hidrofílica',
    quantity: 4500, unit: 'g', lowStockThreshold: 5000, sku: 'SKOL-BASE-CREMA', barcode: '3333333333333',
    lots: [{ lotNumber: 'BC202403', quantity: 4500, expiryDate: formatISO(addDays(now, 730)) }]
  }
];

// --- RECIPES ---
const recipes: Recipe[] = [
    // 1. PendingReviewPortal
    {
        id: 'REC-001', patientId: 'pat-3', doctorId: 'doc-1', status: RecipeStatus.PendingReviewPortal,
        items: [{ principalActiveIngredient: 'Crema Hidratante', pharmaceuticalForm: 'crema', concentrationValue: '10', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '12', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '100', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar 2 veces al día.' }],
        paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 1)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 10000,
        prescriptionImageUrl: 'https://placehold.co/600x400.png'
    },
    // 2. PendingValidation (with fractionation)
    {
        id: 'REC-002', patientId: 'pat-1', doctorId: 'doc-1', status: RecipeStatus.PendingValidation,
        items: [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '90', treatmentDurationUnit: 'días', totalQuantityValue: '180', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en cuero cabelludo cada 12 horas.', requiresFractionation: true }],
        paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 2)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Insumos de Skol', preparationCost: 15000,
    },
    // 3. Validated (with fractionation, controlled)
    {
        id: 'REC-003', patientId: 'pat-2', doctorId: 'doc-2', status: RecipeStatus.Validated,
        items: [{ principalActiveIngredient: 'Clonazepam', pharmaceuticalForm: 'cápsulas', concentrationValue: '0.25', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar 1 cápsula por la noche.', requiresFractionation: true }],
        paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 3)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Insumos de Skol', preparationCost: 18000, isControlled: true, controlledRecipeType: 'Receta Cheque', controlledRecipeFolio: 'CH-A12345',
        skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending,
    },
    // 4. SentToExternal
    {
        id: 'REC-004', patientId: 'pat-1', doctorId: 'doc-2', status: RecipeStatus.SentToExternal,
        items: [{ principalActiveIngredient: 'Ácido Salicílico', pharmaceuticalForm: 'crema', concentrationValue: '2', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en zona afectada.' }],
        paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 8)), updatedAt: formatISO(subDays(now, 7)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 12500,
    },
    // 5. Preparation
    {
        id: 'REC-005', patientId: 'pat-3', doctorId: 'doc-1', status: RecipeStatus.Preparation,
        items: [{ principalActiveIngredient: 'Betametasona', pharmaceuticalForm: 'crema', concentrationValue: '0.05', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '12', treatmentDurationValue: '14', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar capa fina cada 12 horas.' }],
        paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 6)), updatedAt: formatISO(subDays(now, 4)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 14000,
    },
    // 6. ReceivedAtSkol
    {
        id: 'REC-006', patientId: 'pat-2', doctorId: 'doc-2', status: RecipeStatus.ReceivedAtSkol,
        items: [{ principalActiveIngredient: 'Vitamina C', pharmaceuticalForm: 'solución', concentrationValue: '15', concentrationUnit: '% p/v', dosageValue: '5', dosageUnit: 'gota(s)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 5 gotas en el rostro por la mañana.' }],
        paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 10)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 22000,
        internalPreparationLot: 'SKOL-24-001', preparationExpiryDate: formatISO(addMonths(now, 3)),
    },
    // 7. ReadyForPickup (with fractionation)
    {
        id: 'REC-007', patientId: 'pat-1', doctorId: 'doc-1', status: RecipeStatus.ReadyForPickup,
        items: [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '3', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL por la noche.', requiresFractionation: true }],
        paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 15)), updatedAt: formatISO(subDays(now, 3)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Insumos de Skol', preparationCost: 16000,
        internalPreparationLot: 'SKOL-24-002', preparationExpiryDate: formatISO(addMonths(now, 2)),
    },
    // 8. Dispensed
    {
        id: 'REC-008', patientId: 'pat-3', doctorId: 'doc-2', status: RecipeStatus.Dispensed,
        items: [{ principalActiveIngredient: 'Hidroquinona', pharmaceuticalForm: 'crema', concentrationValue: '4', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar por las noches.' }],
        paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 45)), updatedAt: formatISO(subDays(now, 30)), dueDate: formatISO(addMonths(now, 4)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 19500,
        dispensationDate: formatISO(subDays(now, 30))
    },
    // 9. Rejected
    {
        id: 'REC-009', patientId: 'pat-2', doctorId: 'doc-1', status: RecipeStatus.Rejected,
        items: [{ principalActiveIngredient: 'Ivermectina', pharmaceuticalForm: 'cápsulas', concentrationValue: '6', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '2', treatmentDurationUnit: 'días', totalQuantityValue: '2', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Dosis no corresponde a lo habitual.' }],
        paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 5)), updatedAt: formatISO(subDays(now, 4)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 0,
        rejectionReason: 'Dosis terapéutica incorrecta. Contactar al médico.'
    },
    // 10. Cancelled
    {
        id: 'REC-010', patientId: 'pat-1', doctorId: 'doc-2', status: RecipeStatus.Cancelled,
        items: [{ principalActiveIngredient: 'Cafeína', pharmaceuticalForm: 'gel', concentrationValue: '5', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '12', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '100', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en zona de celulitis.' }],
        paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 12)), updatedAt: formatISO(subDays(now, 10)), dueDate: formatISO(addMonths(now, 5)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 0,
        auditTrail: [{status: RecipeStatus.Cancelled, date: formatISO(subDays(now, 10)), userId: 'user-1', notes: 'Cancelado a petición del paciente.'}]
    },
];

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
        dispatchNotes: [], // Always starts empty
        pharmacovigilanceReports,
        controlledSubstanceLog,
    };
}

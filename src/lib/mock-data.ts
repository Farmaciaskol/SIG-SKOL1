
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
  { id: 'user-2', name: 'Juan Pérez', email: 'juan.perez@skol.cl', roleId: 'role-pharma' },
];

// --- DOCTORS ---
const doctors: Doctor[] = [
  { id: 'doc-1', name: 'Dr. Ricardo González', specialty: 'Dermatología', license: '12345', rut: '9.876.543-2', email: 'ricardo.gonzalez@med.cl', phone: '+56911112222' },
  { id: 'doc-2', name: 'Dra. Carolina Soto', specialty: 'Reumatología', license: '54321', rut: '12.345.678-9', email: 'carolina.soto@med.cl', phone: '+56922223333' },
  { id: 'doc-3', name: 'Dr. Matías Fernández', specialty: 'Geriatría', license: '67890', rut: '8.765.432-1', email: 'matias.fernandez@med.cl', phone: '+56933334444' },
  { id: 'doc-4', name: 'Dra. Valentina Rojas', specialty: 'Endocrinología', license: '11223', rut: '14.567.890-K', email: 'valentina.rojas@med.cl', phone: '+56944445555' },
  { id: 'doc-5', name: 'Dr. Benjamín Reyes', specialty: 'Neurología', license: '33445', rut: '10.987.654-3', email: 'benjamin.reyes@med.cl', phone: '+56955556666' },
];

// --- PATIENTS ---
const patients: Patient[] = [
  { id: 'pat-1', name: 'Ana Torres', rut: '15.123.456-7', email: 'ana.torres@email.com', phone: '+56988887777', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día. Próxima dispensación en 25 días.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-2', name: 'Carlos López', rut: '16.234.567-8', email: 'carlos.lopez@email.com', phone: '+56977776666', isChronic: true, proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Receta para tratamiento crónico vencerá en 15 días.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, chronicCareStatus: 'Atención' },
  { id: 'pat-3', name: 'Luisa Martinez', rut: '17.345.678-9', email: 'luisa.martinez@email.com', phone: '+56966665555', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento puntual finalizado.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-4', name: 'Jorge Castillo', rut: '12.456.789-K', email: 'jorge.castillo@email.com', phone: '+56955554444', isChronic: true, proactiveStatus: ProactivePatientStatus.URGENT, proactiveMessage: '¡Urgente! Última dispensación de ciclo finalizada.', actionNeeded: PatientActionNeeded.REPREPARE_CYCLE, chronicCareStatus: 'Urgente' },
  { id: 'pat-5', name: 'Sofía Núñez', rut: '18.567.890-1', email: 'sofia.nunez@email.com', phone: '+56944443333', isChronic: false, allergies: ['Penicilina'], proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
];

// --- EXTERNAL PHARMACIES ---
const externalPharmacies: ExternalPharmacy[] = [
    { id: 'ext-pharma-1', name: 'Farmacias Magistrales Central', contactPerson: 'Luisa Martínez', email: 'contacto@fmagistral.cl', phone: '221234567', address: 'Av. Providencia 123', defaultPaymentModel: 'Por Receta', paymentDetails: 'Cta Cte 12345, Banco Chile' },
    { id: 'ext-pharma-2', name: 'Recetario Alameda', contactPerson: 'Roberto Carlos', email: 'roberto@recetarioalameda.cl', phone: '229876543', address: 'Alameda 456', defaultPaymentModel: 'Factura Mensual' },
];

// --- INVENTORY ---
const inventory: InventoryItem[] = [
  { 
    id: 'inv-1', 
    name: 'Fenobarbital 100mg (Caja 30 comps)',
    quantity: 10, 
    unit: 'cajas', 
    lowStockThreshold: 5, 
    sku: 'SKOL-FENO-100', 
    barcode: '1111111111111', 
    costPrice: 5000, 
    isControlled: true, 
    controlledType: 'Psicotrópico',
    activePrincipleContentValue: 100,
    activePrincipleContentUnit: 'mg',
    itemsPerBaseUnit: 30,
    lots: [{ lotNumber: 'FENO-2401A', quantity: 10, expiryDate: formatISO(addDays(now, 365)) }] 
  },
  { 
    id: 'inv-2', 
    name: 'Minoxidil Base Pura (para Fraccionar)', 
    quantity: 500, 
    unit: 'g', 
    lowStockThreshold: 200, 
    sku: 'SKOL-MINOX-P', 
    barcode: '2222222222222', 
    costPrice: 20, 
    isControlled: false,
    activePrincipleContentValue: 1000,
    activePrincipleContentUnit: 'mg',
    itemsPerBaseUnit: 1, // 1 gramo = 1 unidad base
    lots: [{ lotNumber: 'MINOX-P-2403B', quantity: 500, expiryDate: formatISO(addDays(now, 730)) }] 
  },
  { 
    id: 'inv-3', 
    name: 'Clonazepam 2mg (caja 30 comp)', 
    quantity: 8, 
    unit: 'cajas', 
    lowStockThreshold: 10, 
    sku: 'SKOL-CLONA-2', 
    barcode: '3333333333333', 
    costPrice: 8000, 
    isControlled: true, 
    controlledType: 'Psicotrópico',
    lots: [{ lotNumber: 'CLONA-2312C', quantity: 8, expiryDate: formatISO(addDays(now, 180)) }]
  },
  { 
    id: 'inv-4', 
    name: 'Base Crema Hidrofílica', 
    quantity: 4500, 
    unit: 'g', 
    lowStockThreshold: 5000, 
    sku: 'SKOL-BASE-CREMA', 
    barcode: '4444444444444', 
    costPrice: 5, 
    isControlled: false, 
    lots: [{ lotNumber: 'BC202403', quantity: 4500, expiryDate: formatISO(addDays(now, 730)) }] 
  },
  { 
    id: 'inv-5', 
    name: 'Morfina Clorhidrato Ampolla', 
    quantity: 40, 
    unit: 'ampollas', 
    lowStockThreshold: 20, 
    sku: 'SKOL-MORF-AMP', 
    barcode: '5555555555555', 
    costPrice: 1500, 
    isControlled: true, 
    controlledType: 'Estupefaciente', 
    lots: [{ lotNumber: 'MCL202311D', quantity: 40, expiryDate: formatISO(addDays(now, 250)) }] 
  },
  { 
    id: 'inv-6', 
    name: 'Ácido Hialurónico', 
    quantity: 80, 
    unit: 'g', 
    lowStockThreshold: 50, 
    sku: 'SKOL-HIAL-G', 
    barcode: '6666666666666', 
    costPrice: 100, 
    isControlled: false, 
    lots: [{ lotNumber: 'AH202210A', quantity: 80, expiryDate: formatISO(subDays(now, 30)) }] // Expired Lot
  },
];

// --- RECIPES ---
const recipes: Recipe[] = [
  // 1. Recipe requiring fractionation (non-controlled), ready for dispatch
  { 
    id: 'rec-frac-01', 
    patientId: 'pat-1', 
    doctorId: 'doc-1', 
    items: [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '90', treatmentDurationUnit: 'días', totalQuantityValue: '180', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en cuero cabelludo cada 12 horas.', requiresFractionation: true }],
    status: RecipeStatus.Validated, 
    paymentStatus: 'Pendiente', 
    createdAt: formatISO(subDays(now, 2)), 
    updatedAt: formatISO(subDays(now, 1)), 
    dueDate: formatISO(addMonths(now, 6)), 
    externalPharmacyId: 'ext-pharma-1', 
    supplySource: 'Insumos de Skol', 
    skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending,
    preparationCost: 15000, 
    auditTrail: [{status: RecipeStatus.Validated, date: formatISO(subDays(now, 1)), userId: 'user-2', notes: 'Receta validada.'}] 
  },
  // 2. Recipe requiring fractionation (controlled), ready for dispatch
  { 
    id: 'rec-frac-02', 
    patientId: 'pat-4', 
    doctorId: 'doc-5', 
    items: [{ principalActiveIngredient: 'Fenobarbital', pharmaceuticalForm: 'cápsulas', concentrationValue: '15', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '60', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar 1 cápsula al día.', requiresFractionation: true }],
    status: RecipeStatus.Validated, 
    paymentStatus: 'Pendiente', 
    isControlled: true,
    controlledRecipeType: 'Receta Retenida',
    controlledRecipeFolio: 'RR-A12345',
    createdAt: formatISO(subDays(now, 3)), 
    updatedAt: formatISO(subDays(now, 2)), 
    dueDate: formatISO(addMonths(now, 6)), 
    externalPharmacyId: 'ext-pharma-2', 
    supplySource: 'Insumos de Skol', 
    skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending,
    preparationCost: 22000, 
    auditTrail: [{status: RecipeStatus.Validated, date: formatISO(subDays(now, 2)), userId: 'user-2', notes: 'Receta validada.'}] 
  },
  // 3. Standard recipe (non-fractionated), pending validation
  {
    id: 'rec-std-01',
    patientId: 'pat-3',
    doctorId: 'doc-2',
    items: [{ principalActiveIngredient: 'Ácido Salicílico', pharmaceuticalForm: 'crema', concentrationValue: '2', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en la zona afectada una vez al día.' }],
    status: RecipeStatus.PendingValidation,
    paymentStatus: 'Pendiente',
    createdAt: formatISO(subDays(now, 1)),
    updatedAt: formatISO(subDays(now, 1)),
    dueDate: formatISO(addMonths(now, 6)),
    externalPharmacyId: 'ext-pharma-1',
    supplySource: 'Stock del Recetario Externo',
    preparationCost: 12000,
    auditTrail: [{status: RecipeStatus.PendingValidation, date: formatISO(subDays(now, 1)), userId: 'user-2', notes: 'Receta creada.'}]
  },
  // 4. Dispensed controlled recipe
  {
    id: 'rec-ctrl-01',
    patientId: 'pat-2',
    doctorId: 'doc-5',
    items: [{ principalActiveIngredient: 'Clonazepam', pharmaceuticalForm: 'cápsulas', concentrationValue: '0.25', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar 1 cápsula por la noche.' }],
    status: RecipeStatus.Dispensed,
    paymentStatus: 'Pagado',
    isControlled: true,
    controlledRecipeType: 'Receta Cheque',
    controlledRecipeFolio: 'CH-B67890',
    createdAt: formatISO(subDays(now, 40)),
    updatedAt: formatISO(subDays(now, 35)),
    dueDate: formatISO(addMonths(now, 5)),
    externalPharmacyId: 'ext-pharma-2',
    supplySource: 'Stock del Recetario Externo',
    preparationCost: 18000,
    auditTrail: [{status: RecipeStatus.Dispensed, date: formatISO(subDays(now, 35)), userId: 'user-2', notes: 'Dispensado al paciente.'}]
  },
  // 5. Recipe ready for pickup
  {
    id: 'rec-pickup-01',
    patientId: 'pat-5',
    doctorId: 'doc-1',
    items: [{ principalActiveIngredient: 'Crema Despigmentante', pharmaceuticalForm: 'crema', concentrationValue: '4', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '100', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en manchas por la noche.' }],
    status: RecipeStatus.ReadyForPickup,
    paymentStatus: 'Pagado',
    createdAt: formatISO(subDays(now, 5)),
    updatedAt: formatISO(subDays(now, 1)),
    dueDate: formatISO(addMonths(now, 6)),
    externalPharmacyId: 'ext-pharma-1',
    supplySource: 'Stock del Recetario Externo',
    preparationCost: 25000,
    internalPreparationLot: 'SKOL-24-001',
    preparationExpiryDate: formatISO(addMonths(now, 3)),
    auditTrail: [{status: RecipeStatus.ReadyForPickup, date: formatISO(subDays(now, 1)), userId: 'user-2', notes: 'Marcado para retiro.'}]
  }
];

// --- PHARMACOVIGILANCE REPORTS ---
const pharmacovigilanceReports: PharmacovigilanceReport[] = [
  { id: 'pv-1', reportedAt: formatISO(subDays(now, 20)), reporterName: 'Juan Pérez', recipeId: 'rec-frac-01', patientId: 'pat-1', externalPharmacyId: 'ext-pharma-1', involvedMedications: 'Minoxidil 5%', problemDescription: 'Paciente reporta irritación y enrojecimiento en la zona de aplicación.', status: PharmacovigilanceReportStatus.Resolved, resolutionDetails: 'Se contactó al paciente, se recomendó suspender uso. Se clasificó como reacción leve esperable.', updatedAt: formatISO(subDays(now, 15)) },
  { id: 'pv-2', reportedAt: formatISO(subDays(now, 5)), reporterName: 'Admin Skol', recipeId: 'rec-frac-02', patientId: 'pat-4', externalPharmacyId: 'ext-pharma-2', involvedMedications: 'Fenobarbital 15mg', problemDescription: 'Recetario externo reporta que las cápsulas tienen un color no homogéneo.', status: PharmacovigilanceReportStatus.UnderInvestigation, actionsTaken: 'Se solicitó al recetario el envío de una muestra para análisis. Se puso en cuarentena el lote de producción.', updatedAt: formatISO(subDays(now, 2)) },
];

// --- CONTROLLED SUBSTANCE LOG ---
const controlledSubstanceLog: ControlledSubstanceLogEntry[] = [
    {
        id: 'csl-1', 
        entryType: ControlledLogEntryType.MagistralDispensation, 
        dispensationDate: formatISO(subDays(now, 35)), 
        internalFolio: 'CSL-24-001', 
        patientId: 'pat-2', 
        doctorId: 'doc-5', 
        medicationName: 'Clonazepam 0.25mg', 
        recipeId: 'rec-ctrl-01', 
        quantityDispensed: 30, 
        quantityUnit: 'cápsulas', 
        controlledType: 'Psicotrópico', 
        prescriptionFolio: 'CH-B67890', 
        prescriptionType: 'Receta Cheque', 
        retrievedBy_Name: 'Carlos López', 
        retrievedBy_RUT: '16.234.567-8'
    },
    {
        id: 'csl-2', 
        entryType: ControlledLogEntryType.DirectSale, 
        dispensationDate: formatISO(subDays(now, 10)), 
        internalFolio: 'CSL-24-002', 
        patientId: 'pat-4', 
        doctorId: 'doc-3', 
        medicationName: 'Morfina Clorhidrato Ampolla', 
        inventoryItemId: 'inv-5', 
        quantityDispensed: 5, 
        quantityUnit: 'ampollas', 
        controlledType: 'Estupefaciente', 
        prescriptionFolio: 'CH-555444', 
        prescriptionType: 'Receta Cheque', 
        retrievedBy_Name: 'Familiar', 
        retrievedBy_RUT: '7.890.123-4'
    },
];

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

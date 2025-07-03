

import { addMonths, subDays } from 'date-fns';
import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, PharmacovigilanceReport, ControlledSubstanceLogEntry, DispatchNote, MonthlyDispensationBox } from './types';
import { RecipeStatus, ProactivePatientStatus, PatientActionNeeded, SkolSuppliedItemsDispatchStatus, DispatchStatus, PharmacovigilanceReportStatus, ControlledLogEntryType, MonthlyDispensationBoxStatus, DispensationItemStatus } from './types';
import { MAX_REPREPARATIONS } from './constants';

// --- ROLES & USERS ---
const roles: Role[] = [
    { id: 'role-01', name: 'Administrador', permissions: ['*'] },
    { id: 'role-02', name: 'Farmacéutico', permissions: ['recipes:read', 'recipes:update'] },
];

const users: User[] = [
    { id: 'user-01', name: 'Admin Skol', email: 'admin@skol.cl', roleId: 'role-01' },
    { id: 'user-02', name: 'Químico Farmacéutico', email: 'qf@skol.cl', roleId: 'role-02' },
];

// --- DOCTORS ---
const doctors: Doctor[] = [
    { id: 'doc-01', name: 'Dr. Ana Torres', specialty: 'Dermatología', license: '11111-1', rut: '11.111.111-1', email: 'ana.torres@med.cl', phone: '+56911111111' },
    { id: 'doc-02', name: 'Dr. Carlos Ruiz', specialty: 'Neurología', license: '22222-2', rut: '22.222.222-2', email: 'carlos.ruiz@med.cl', phone: '+56922222222' },
    { id: 'doc-03', name: 'Dr. Ricardo Solis', specialty: 'Neurología', license: '33333-3', rut: '33.333.333-3', email: 'ricardo.solis@med.cl', phone: '+56933333333' },
];

// --- PATIENTS ---
const patients: Patient[] = [
    { id: 'pat-01', name: 'Gaspar Mendoza', rut: '11.111.111-1', email: 'gaspar.mendoza@email.com', phone: '+56987654321', gender: 'Masculino', address: 'Av. Siempre Viva 742, Santiago', isChronic: true, proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Receta de Minoxidil vence en 15 días.', actionNeeded: PatientActionNeeded.REPREPARE_CYCLE, allergies: ['Penicilina'], commercialMedications: ['Aspirina 100mg'] },
    { id: 'pat-02', name: 'Lucía Fernández', rut: '22.222.222-2', email: 'lucia.fernandez@email.com', phone: '+56912345678', gender: 'Femenino', address: 'Pasaje El Roble 123, Providencia', isChronic: true, proactiveStatus: ProactivePatientStatus.URGENT, proactiveMessage: 'Ciclo de Fenobarbital vencido. Requiere nueva receta.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, allergies: [], commercialMedications: ['Losartan 50mg', 'Metformina 850mg'], adverseReactions: [{ medication: 'Enalapril', description: 'Tos seca persistente' }] },
    { id: 'pat-03', name: 'Benjamín Soto', rut: '33.333.333-3', email: 'benjamin.soto@email.com', phone: '+56955555555', gender: 'Masculino', address: 'Calle Los Cerezos 45, La Florida', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, allergies: ['AINEs'] },
    { id: 'pat-04', name: 'Catalina Flores', rut: '21.345.678-K', email: 'catalina.flores@email.com', phone: '923456789', gender: 'Femenino', address: 'Pasaje Secreto 456, Las Condes', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, allergies: ['AINEs'], commercialMedications: [], adverseReactions: [{ medication: 'Clonazepam', description: 'Somnolencia excesiva'}] },
];

// --- EXTERNAL PHARMACIES ---
const externalPharmacies: ExternalPharmacy[] = [
    { id: 'ext-ph-01', name: 'Farmacias Magistrales Central', contactPerson: 'Sofía Lara', email: 'contacto@magistralcentral.cl', phone: '+56212345678' },
    { id: 'ext-ph-02', name: 'Recetario Alameda', contactPerson: 'Roberto Gómez', email: 'rgomez@recetarioalameda.cl', phone: '+56287654321' },
];

// --- INVENTORY ---
const inventory: InventoryItem[] = [
    { id: 'inv-001', name: 'Minoxidil 5% (Base)', unit: 'g', lowStockThreshold: 100, quantity: 500, costPrice: 50, lots: [{ lotNumber: 'MX202401', quantity: 500, expiryDate: addMonths(new Date(), 12).toISOString() }], itemsPerBaseUnit: 1, activePrincipleContentValue: 5, activePrincipleContentUnit: '%' },
    { id: 'inv-002', name: 'Fenobarbital 100mg (Caja 30 comps)', unit: 'caja', lowStockThreshold: 5, quantity: 10, costPrice: 15000, isControlled: true, controlledType: 'Psicotrópico', lots: [{ lotNumber: 'FB202312', quantity: 10, expiryDate: addMonths(new Date(), 6).toISOString() }], itemsPerBaseUnit: 30, activePrincipleContentValue: 100, activePrincipleContentUnit: 'mg' },
    { id: 'inv-003', name: 'Clonazepam 2mg (Caja 30 comps)', unit: 'caja', lowStockThreshold: 10, quantity: 19, costPrice: 8000, isControlled: true, controlledType: 'Psicotrópico', lots: [{ lotNumber: 'CZ202402', quantity: 19, expiryDate: addMonths(new Date(), 24).toISOString() }], itemsPerBaseUnit: 30, activePrincipleContentValue: 2, activePrincipleContentUnit: 'mg' },
    { id: 'inv-004', name: 'Crema Base Hidratante', unit: 'kg', lowStockThreshold: 2, quantity: 5, costPrice: 20000, lots: [{ lotNumber: 'CB202403', quantity: 5, expiryDate: addMonths(new Date(), 18).toISOString() }] },
    { id: 'inv-005', name: 'Aspirina 100mg (Caja 30 comps)', unit: 'caja', lowStockThreshold: 10, quantity: 50, costPrice: 2000, lots: [{ lotNumber: 'AS202405', quantity: 50, expiryDate: addMonths(new Date(), 12).toISOString() }] },
    { id: 'inv-006', name: 'Losartan 50mg (Caja 30 comps)', unit: 'caja', lowStockThreshold: 10, quantity: 30, costPrice: 4000, lots: [{ lotNumber: 'LS202406', quantity: 30, expiryDate: addMonths(new Date(), 18).toISOString() }] },
    { id: 'inv-007', name: 'Metformina 850mg (Caja 30 comps)', unit: 'caja', lowStockThreshold: 10, quantity: 5, costPrice: 3500, lots: [{ lotNumber: 'MT202407', quantity: 5, expiryDate: addMonths(new Date(), 24).toISOString() }] },
];

// --- RECIPES ---
const today = new Date();
const recipes: Recipe[] = [
    // 1. Pendiente Revisión (Portal)
    { id: 'rec-portal-01', patientId: 'pat-04', doctorId: 'doc-03', status: RecipeStatus.PendingReviewPortal, paymentStatus: 'Pendiente', items: [{ principalActiveIngredient: 'Ácido Salicílico', pharmaceuticalForm: 'crema', concentrationValue: '2', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en la zona afectada una vez al día.' }], createdAt: subDays(today, 1).toISOString(), updatedAt: subDays(today, 1).toISOString(), prescriptionDate: subDays(today, 2).toISOString(), dueDate: addMonths(subDays(today, 2), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Stock del Recetario Externo', preparationCost: 12000 },
    
    // 2. Pendiente Validación (Fractionation)
    { id: 'rec-validation-01', patientId: 'pat-01', doctorId: 'doc-01', status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', items: [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '90', treatmentDurationUnit: 'días', totalQuantityValue: '90', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en el cuero cabelludo cada 12 horas.', requiresFractionation: true }], createdAt: subDays(today, 2).toISOString(), updatedAt: subDays(today, 2).toISOString(), prescriptionDate: subDays(today, 3).toISOString(), dueDate: addMonths(subDays(today, 3), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Insumos de Skol', preparationCost: 18000, skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending },

    // 3. Validada (Controlled + Fractionation) -> Ready for Dispatch
    { id: 'rec-validated-01', patientId: 'pat-02', doctorId: 'doc-02', status: RecipeStatus.Validated, paymentStatus: 'Pendiente', isControlled: true, controlledRecipeType: 'Receta Cheque', controlledRecipeFolio: 'A12345678', items: [{ principalActiveIngredient: 'Fenobarbital', pharmaceuticalForm: 'cápsulas', concentrationValue: '15', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar una cápsula por la noche.', requiresFractionation: true }], createdAt: subDays(today, 3).toISOString(), updatedAt: subDays(today, 1).toISOString(), prescriptionDate: subDays(today, 4).toISOString(), dueDate: addMonths(subDays(today, 4), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Insumos de Skol', preparationCost: 25000, skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending, auditTrail: [{ status: RecipeStatus.PendingValidation, date: subDays(today, 3).toISOString(), userId: 'user-02' }, { status: RecipeStatus.Validated, date: subDays(today, 1).toISOString(), userId: 'user-02', notes: 'Receta validada clínicamente.' }] },
    
    // 4. Enviada a Recetario
    { id: 'rec-sent-01', patientId: 'pat-03', doctorId: 'doc-01', status: RecipeStatus.SentToExternal, paymentStatus: 'Pendiente', items: [{ principalActiveIngredient: 'Betametasona', pharmaceuticalForm: 'crema', concentrationValue: '0.1', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '12', treatmentDurationValue: '14', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar capa fina en área afectada dos veces al día.' }], createdAt: subDays(today, 5).toISOString(), updatedAt: subDays(today, 3).toISOString(), prescriptionDate: subDays(today, 6).toISOString(), dueDate: addMonths(subDays(today, 6), 6).toISOString(), externalPharmacyId: 'ext-ph-02', supplySource: 'Stock del Recetario Externo', preparationCost: 14000, auditTrail: [{ status: RecipeStatus.PendingValidation, date: subDays(today, 5).toISOString(), userId: 'user-02' }, { status: RecipeStatus.Validated, date: subDays(today, 4).toISOString(), userId: 'user-02' }, { status: RecipeStatus.SentToExternal, date: subDays(today, 3).toISOString(), userId: 'user-01' }] },
    
    // 5. En Preparación
    { id: 'rec-prep-01', patientId: 'pat-01', doctorId: 'doc-01', status: RecipeStatus.Preparation, paymentStatus: 'Pagado', items: [{ principalActiveIngredient: 'Clobetasol', pharmaceuticalForm: 'solución', concentrationValue: '0.05', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '60', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar en el cuero cabelludo una vez al día.' }], createdAt: subDays(today, 10).toISOString(), updatedAt: subDays(today, 4).toISOString(), prescriptionDate: subDays(today, 11).toISOString(), dueDate: addMonths(subDays(today, 11), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Stock del Recetario Externo', preparationCost: 16500 },
    
    // 6. Recepcionado en Skol
    { id: 'rec-received-01', patientId: 'pat-02', doctorId: 'doc-02', status: RecipeStatus.ReceivedAtSkol, paymentStatus: 'Pendiente', isControlled: true, controlledRecipeType: 'Receta Cheque', controlledRecipeFolio: 'A12345670', items: [{ principalActiveIngredient: 'Fenobarbital', pharmaceuticalForm: 'gotas', concentrationValue: '2', concentrationUnit: 'mg/gota', dosageValue: '5', dosageUnit: 'gota(s)', frequency: '8', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'mL', usageInstructions: 'Tomar 5 gotas cada 8 horas.' }], createdAt: subDays(today, 15).toISOString(), updatedAt: subDays(today, 2).toISOString(), prescriptionDate: subDays(today, 16).toISOString(), dueDate: addMonths(subDays(today, 16), 6).toISOString(), externalPharmacyId: 'ext-ph-02', supplySource: 'Stock del Recetario Externo', preparationCost: 28000, internalPreparationLot: 'SKL-2024-00123' },
    
    // 7. Lista para Retiro
    { id: 'rec-pickup-01', patientId: 'pat-03', doctorId: 'doc-01', status: RecipeStatus.ReadyForPickup, paymentStatus: 'Pagado', items: [{ principalActiveIngredient: 'Hidroquinona', pharmaceuticalForm: 'crema', concentrationValue: '4', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar por la noche, usar protector solar durante el día.' }], createdAt: subDays(today, 8).toISOString(), updatedAt: subDays(today, 1).toISOString(), prescriptionDate: subDays(today, 9).toISOString(), dueDate: addMonths(subDays(today, 9), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Stock del Recetario Externo', preparationCost: 22000 },
    
    // 8. Dispensada
    { id: 'rec-dispensed-01', patientId: 'pat-01', doctorId: 'doc-01', status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', items: [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '90', treatmentDurationUnit: 'días', totalQuantityValue: '90', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en el cuero cabelludo cada 12 horas.' }], createdAt: subDays(today, 45).toISOString(), updatedAt: subDays(today, 35).toISOString(), prescriptionDate: subDays(today, 46).toISOString(), dueDate: addMonths(subDays(today, 46), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Stock del Recetario Externo', preparationCost: 18000, dispensationDate: subDays(today, 35).toISOString(), auditTrail: [{status: RecipeStatus.Dispensed, date: subDays(today, 35).toISOString(), userId: 'user-01'}]},
    
    // 9. Rechazada
    { id: 'rec-rejected-01', patientId: 'pat-04', doctorId: 'doc-01', status: RecipeStatus.Rejected, paymentStatus: 'N/A', items: [{ principalActiveIngredient: 'Tretinoína', pharmaceuticalForm: 'crema', concentrationValue: '0.05', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en el rostro.' }], rejectionReason: 'Receta ilegible, no se puede confirmar la dosis.', createdAt: subDays(today, 4).toISOString(), updatedAt: subDays(today, 3).toISOString(), prescriptionDate: subDays(today, 5).toISOString(), dueDate: addMonths(subDays(today, 5), 6).toISOString(), externalPharmacyId: 'ext-ph-01', supplySource: 'Stock del Recetario Externo', preparationCost: 0 },
    
    // 10. Anulada
    { id: 'rec-cancelled-01', patientId: 'pat-03', doctorId: 'doc-01', status: RecipeStatus.Cancelled, paymentStatus: 'N/A', items: [{ principalActiveIngredient: 'Cafeína', pharmaceuticalForm: 'gel', concentrationValue: '3', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '12', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '100', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en zona de celulitis.' }], createdAt: subDays(today, 7).toISOString(), updatedAt: subDays(today, 6).toISOString(), prescriptionDate: subDays(today, 8).toISOString(), dueDate: addMonths(subDays(today, 8), 6).toISOString(), externalPharmacyId: 'ext-ph-02', supplySource: 'Stock del Recetario Externo', preparationCost: 0 },

    // 11. Dispensada (Controlled)
    { id: 'rec-dispensed-controlled-01', patientId: 'pat-02', doctorId: 'doc-02', status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', isControlled: true, controlledRecipeType: 'Receta Retenida', controlledRecipeFolio: 'RR9876543', items: [{ principalActiveIngredient: 'Clonazepam', pharmaceuticalForm: 'cápsulas', concentrationValue: '0.25', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar una cápsula por la noche.' }], createdAt: subDays(today, 50).toISOString(), updatedAt: subDays(today, 40).toISOString(), prescriptionDate: subDays(today, 51).toISOString(), dueDate: addMonths(subDays(today, 51), 6).toISOString(), externalPharmacyId: 'ext-ph-02', supplySource: 'Stock del Recetario Externo', preparationCost: 20000, dispensationDate: subDays(today, 40).toISOString() },

    // 12. Validada (Fractionation, another one for dispatch)
    { id: 'rec-frac-03', patientId: 'pat-04', doctorId: 'doc-02', status: RecipeStatus.Validated, paymentStatus: 'Pendiente', isControlled: true, controlledRecipeType: 'Receta Retenida', controlledRecipeFolio: 'RR11223344', items: [{ principalActiveIngredient: 'Clonazepam', pharmaceuticalForm: 'cápsulas', concentrationValue: '0.5', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar 1 cápsula antes de dormir si es necesario.', requiresFractionation: true }], createdAt: subDays(today, 2).toISOString(), updatedAt: subDays(today, 1).toISOString(), prescriptionDate: subDays(today, 3).toISOString(), dueDate: addMonths(subDays(today, 3), 6).toISOString(), externalPharmacyId: 'ext-ph-02', supplySource: 'Insumos de Skol', preparationCost: 21000, skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Pending },
];


const pharmacovigilanceReports: PharmacovigilanceReport[] = [
    {
        id: 'fv-001',
        reportedAt: subDays(today, 20).toISOString(),
        reporterName: 'Lucía Fernández (Paciente)',
        patientId: 'pat-02',
        recipeId: 'rec-dispensed-controlled-01',
        involvedMedications: 'Clonazepam 0.25mg',
        problemDescription: 'El paciente reporta somnolencia excesiva y mareos durante el día.',
        status: PharmacovigilanceReportStatus.UnderInvestigation,
        updatedAt: subDays(today, 18).toISOString(),
    }
];
const controlledSubstanceLog: ControlledSubstanceLogEntry[] = [
    {
        id: 'csl-001',
        entryType: ControlledLogEntryType.MagistralDispensation,
        dispensationDate: subDays(today, 40).toISOString(),
        internalFolio: `CSL-MG-${today.getFullYear()}-0001`,
        patientId: 'pat-02',
        doctorId: 'doc-02',
        medicationName: 'Clonazepam 0.25mg',
        recipeId: 'rec-dispensed-controlled-01',
        quantityDispensed: 30,
        quantityUnit: 'cápsula(s)',
        controlledType: 'Psicotrópico',
        prescriptionFolio: 'RR9876543',
        prescriptionType: 'Receta Retenida',
        retrievedBy_Name: 'Lucía Fernández',
        retrievedBy_RUT: '22.222.222-2',
    },
    {
        id: 'csl-002',
        entryType: ControlledLogEntryType.MagistralDispensation,
        dispensationDate: subDays(today, 2).toISOString(),
        internalFolio: `CSL-MG-${today.getFullYear()}-0002`,
        patientId: 'pat-02',
        doctorId: 'doc-02',
        medicationName: 'Fenobarbital 2mg/gota',
        recipeId: 'rec-received-01',
        quantityDispensed: 30,
        quantityUnit: 'mL',
        controlledType: 'Psicotrópico',
        prescriptionFolio: 'A12345670',
        prescriptionType: 'Receta Cheque',
        retrievedBy_Name: 'Tutor Legal',
        retrievedBy_RUT: '10.111.222-3',
    }
];
const dispatchNotes: DispatchNote[] = [];

const monthlyDispensations: MonthlyDispensationBox[] = [
  {
    id: 'disp-box-01',
    patientId: 'pat-01',
    period: '2024-07',
    status: MonthlyDispensationBoxStatus.InPreparation,
    createdAt: subDays(today, 5).toISOString(),
    updatedAt: subDays(today, 2).toISOString(),
    items: [
      {
        id: 'rec-dispensed-01',
        type: 'magistral',
        name: 'Receta Magistral',
        details: 'Minoxidil 5%',
        status: DispensationItemStatus.OkToInclude,
        reason: 'Receta vigente y con ciclos disponibles.',
      },
      {
        id: 'inv-005',
        type: 'commercial',
        name: 'Medicamento Comercial',
        details: 'Aspirina 100mg',
        status: DispensationItemStatus.OkToInclude,
        reason: 'Stock suficiente.',
      }
    ]
  },
  {
    id: 'disp-box-02',
    patientId: 'pat-02',
    period: '2024-07',
    status: MonthlyDispensationBoxStatus.InPreparation,
    createdAt: subDays(today, 3).toISOString(),
    updatedAt: subDays(today, 1).toISOString(),
    items: [
      {
        id: 'rec-validated-01',
        type: 'magistral',
        name: 'Receta Magistral',
        details: 'Fenobarbital',
        status: DispensationItemStatus.RequiresAttention,
        reason: 'La receta original ha vencido. Se requiere nueva prescripción.',
      },
      {
        id: 'inv-006',
        type: 'commercial',
        name: 'Medicamento Comercial',
        details: 'Losartan 50mg',
        status: DispensationItemStatus.OkToInclude,
        reason: 'Stock suficiente.',
      },
      {
        id: 'inv-007',
        type: 'commercial',
        name: 'Medicamento Comercial',
        details: 'Metformina 850mg',
        status: DispensationItemStatus.RequiresAttention,
        reason: 'Stock insuficiente en inventario.',
      }
    ]
  }
];

export function getMockData(): AppData {
    return {
        recipes,
        patients,
        doctors,
        inventory,
        users,
        roles,
        externalPharmacies,
        dispatchNotes,
        pharmacovigilanceReports,
        controlledSubstanceLog,
        monthlyDispensations,
    };
}

import type { AppData, Patient, Doctor, Recipe, InventoryItem, User, Role, ExternalPharmacy, PharmacovigilanceReport, ControlledSubstanceLogEntry } from './types';
import { RecipeStatus, ProactivePatientStatus, PatientActionNeeded, SkolSuppliedItemsDispatchStatus, PharmacovigilanceReportStatus } from './types';
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
  { id: 'pat-2', name: 'Carlos López', rut: '16.234.567-8', email: 'carlos.lopez@email.com', phone: '+56977776666', isChronic: true, proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Receta para tratamiento crónico vencerá en 15 días. Es necesario contactar para gestionar una nueva receta.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, chronicCareStatus: 'Atención' },
  { id: 'pat-3', name: 'Luisa Martinez', rut: '17.345.678-9', email: 'luisa.martinez@email.com', phone: '+56966665555', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento puntual finalizado. No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-4', name: 'Jorge Castillo', rut: '12.456.789-K', email: 'jorge.castillo@email.com', phone: '+56955554444', isChronic: true, proactiveStatus: ProactivePatientStatus.URGENT, proactiveMessage: '¡Urgente! Última dispensación de ciclo finalizada. El paciente podría interrumpir su tratamiento. Crear nueva receta ahora.', actionNeeded: PatientActionNeeded.REPREPARE_CYCLE, chronicCareStatus: 'Urgente' },
  { id: 'pat-5', name: 'Sofía Núñez', rut: '18.567.890-1', email: 'sofia.nunez@email.com', phone: '+56944443333', isChronic: false, allergies: ['Penicilina'], proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-6', name: 'Miguel Ángel Soto', rut: '10.678.901-2', email: 'miguel.soto@email.com', phone: '+56933332222', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Dispensación mensual de producto comercial programada. Gestionar envío.', actionNeeded: PatientActionNeeded.DISPENSE_COMMERCIAL, chronicCareStatus: 'OK' },
  { id: 'pat-7', name: 'Fernanda Díaz', rut: '19.789.012-3', email: 'fernanda.diaz@email.com', phone: '+56922221111', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
];

// --- EXTERNAL PHARMACIES ---
const externalPharmacies: ExternalPharmacy[] = [
    { id: 'ext-pharma-1', name: 'Farmacias Magistrales Central', contactPerson: 'Luisa Martínez', email: 'contacto@fmagistral.cl', phone: '221234567', address: 'Av. Providencia 123', defaultPaymentModel: 'Por Receta', paymentDetails: 'Cta Cte 12345, Banco Chile' },
    { id: 'ext-pharma-2', name: 'Recetario Alameda', contactPerson: 'Roberto Carlos', email: 'roberto@recetarioalameda.cl', phone: '229876543', address: 'Alameda 456', defaultPaymentModel: 'Factura Mensual' },
    { id: 'ext-pharma-3', name: 'Compounding Solutions', contactPerson: 'Ana Frank', email: 'ana.f@compoundingsolutions.com', phone: '225554433', address: 'Apoquindo 789' },
];

// --- INVENTORY ---
const inventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Minoxidil', quantity: 1500, unit: 'g', lowStockThreshold: 500, sku: 'SKOL-MINOX-G', barcode: '1111111111111', costPrice: 20, isControlled: false, lots: [{ lotNumber: 'M202401A', quantity: 1500, expiryDate: formatISO(addDays(now, 365)) }] },
  { id: 'inv-2', name: 'Clonazepam 0.5mg', quantity: 85, unit: 'comprimidos', lowStockThreshold: 100, sku: 'SKOL-CLONA-05', barcode: '2222222222222', costPrice: 150, isControlled: true, controlledType: 'Psicotrópico', lots: [{ lotNumber: 'C202312B', quantity: 85, expiryDate: formatISO(addDays(now, 180)) }] },
  { id: 'inv-3', name: 'Base Crema Hidrofílica', quantity: 4500, unit: 'g', lowStockThreshold: 5000, sku: 'SKOL-BASE-CREMA', barcode: '3333333333333', costPrice: 5, isControlled: false, lots: [{ lotNumber: 'BC202403', quantity: 4500, expiryDate: formatISO(addDays(now, 730)) }] }, // Low Stock
  { id: 'inv-4', name: 'Finasteride', quantity: 5000, unit: 'mg', lowStockThreshold: 2000, sku: 'SKOL-FINAS-MG', barcode: '4444444444444', costPrice: 50, isControlled: false, lots: [{ lotNumber: 'F202402C', quantity: 5000, expiryDate: formatISO(addDays(now, 400)) }] },
  { id: 'inv-5', name: 'Metformina 850mg', quantity: 0, unit: 'comprimidos', lowStockThreshold: 200, sku: 'SKOL-METF-850', barcode: '5555555555555', costPrice: 90, isControlled: false, lots: [] }, // Agotado
  { id: 'inv-6', name: 'Morfina Clorhidrato Ampolla', quantity: 40, unit: 'ampollas', lowStockThreshold: 20, sku: 'SKOL-MORF-AMP', barcode: '6666666666666', costPrice: 1500, isControlled: true, controlledType: 'Estupefaciente', lots: [{ lotNumber: 'MCL202311D', quantity: 40, expiryDate: formatISO(addDays(now, 250)) }] },
  { id: 'inv-7', name: 'Vitamina C Pura', quantity: 200, unit: 'g', lowStockThreshold: 100, sku: 'SKOL-VITC-G', barcode: '7777777777777', costPrice: 10, isControlled: false, lots: [{ lotNumber: 'VC202405A', quantity: 200, expiryDate: formatISO(addDays(now, 60)) }] }, // Próximo a Vencer
  { id: 'inv-8', name: 'Ácido Hialurónico', quantity: 80, unit: 'g', lowStockThreshold: 50, sku: 'SKOL-HIAL-G', barcode: '8888888888888', costPrice: 100, isControlled: false, lots: [{ lotNumber: 'AH202210A', quantity: 80, expiryDate: formatISO(subDays(now, 30)) }] }, // Vencido
];

// --- RECIPES ---
const recipeItemsSample1 = [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '3', treatmentDurationUnit: 'meses', totalQuantityValue: '180', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en el cuero cabelludo cada 12 horas.' }];
const recipeItemsSample2 = [{ principalActiveIngredient: 'Finasteride', pharmaceuticalForm: 'cápsulas', concentrationValue: '1', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar una cápsula al día.' }];
const recipeItemsSample3 = [{ principalActiveIngredient: 'Vitamina C Pura', pharmaceuticalForm: 'crema', concentrationValue: '10', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en el rostro por la mañana.' }];

const recipes: Recipe[] = [
  // A completely finished recipe
  { id: 'rec-1', patientId: 'pat-1', doctorId: 'doc-1', items: recipeItemsSample1, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 45)), updatedAt: formatISO(subDays(now, 40)), dueDate: formatISO(addMonths(subDays(now, 45), 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 15000, auditTrail: [] },
  // A recipe ready for the patient to pick up
  { id: 'rec-2', patientId: 'pat-2', doctorId: 'doc-1', items: recipeItemsSample2, status: RecipeStatus.ReadyForPickup, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 5)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(subDays(now, 5), 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 25000, auditTrail: [] },
  // A recipe just received from the external pharmacy
  { id: 'rec-3', patientId: 'pat-7', doctorId: 'doc-4', items: recipeItemsSample3, status: RecipeStatus.ReceivedAtSkol, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 7)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(subDays(now, 7), 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 18000, auditTrail: [] },
  // A new recipe waiting for validation
  { id: 'rec-4', patientId: 'pat-3', doctorId: 'doc-2', items: recipeItemsSample1, status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 0)), updatedAt: formatISO(subDays(now, 0)), dueDate: formatISO(addMonths(subDays(now, 0), 6)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 16000, auditTrail: [] },
  // A recipe sent to an external pharmacy for preparation
  { id: 'rec-5', patientId: 'pat-4', doctorId: 'doc-3', items: recipeItemsSample2, status: RecipeStatus.SentToExternal, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 10)), updatedAt: formatISO(subDays(now, 3)), dueDate: formatISO(addMonths(subDays(now, 10), 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 22000, auditTrail: [] },
  // A rejected recipe
  { id: 'rec-6', patientId: 'pat-5', doctorId: 'doc-2', items: recipeItemsSample1, status: RecipeStatus.Rejected, rejectionReason: 'Firma de médico no coincide', paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 12)), updatedAt: formatISO(subDays(now, 11)), dueDate: formatISO(addMonths(subDays(now, 12), 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 0, auditTrail: [] },
  // A cancelled recipe
  { id: 'rec-7', patientId: 'pat-1', doctorId: 'doc-1', items: recipeItemsSample2, status: RecipeStatus.Cancelled, paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 30)), updatedAt: formatISO(subDays(now, 20)), dueDate: formatISO(addMonths(subDays(now, 30), 6)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 0, auditTrail: [] },
  // A validated recipe waiting for SKOL to dispatch items
  { id: 'rec-8', patientId: 'pat-6', doctorId: 'doc-5', items: recipeItemsSample1, status: RecipeStatus.Validated, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 2)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(subDays(now, 2), 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Insumos de Skol', skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.PendingDispatch, preparationCost: 19000, auditTrail: [] },
  // A validated recipe ready to be sent to an external pharmacy
  { id: 'rec-9', patientId: 'pat-7', doctorId: 'doc-4', items: recipeItemsSample3, status: RecipeStatus.Validated, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 3)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(subDays(now, 3), 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 21000, auditTrail: [] },
];

// --- PHARMACOVIGILANCE ---
const pharmacovigilanceReports: PharmacovigilanceReport[] = [
  { id: 'pv-1', reportedAt: formatISO(subDays(now, 20)), reporterName: 'Juan Pérez', recipeId: 'rec-1', patientId: 'pat-1', externalPharmacyId: 'ext-pharma-1', involvedMedications: 'Minoxidil 5%', problemDescription: 'Paciente reporta irritación y enrojecimiento en la zona de aplicación.', status: PharmacovigilanceReportStatus.Resolved, resolutionDetails: 'Se contactó al paciente, se recomendó suspender uso. Se clasificó como reacción leve esperable.', updatedAt: formatISO(subDays(now, 15)) },
  { id: 'pv-2', reportedAt: formatISO(subDays(now, 5)), reporterName: 'Admin Skol', recipeId: 'rec-5', patientId: 'pat-4', externalPharmacyId: 'ext-pharma-2', involvedMedications: 'Finasteride 1mg', problemDescription: 'Recetario externo reporta que las cápsulas tienen un color no homogéneo.', status: PharmacovigilanceReportStatus.UnderInvestigation, actionsTaken: 'Se solicitó al recetario el envío de una muestra para análisis. Se puso en cuarentena el lote de producción.', updatedAt: formatISO(subDays(now, 2)) },
  { id: 'pv-3', reportedAt: formatISO(subDays(now, 2)), reporterName: 'Juan Pérez', patientId: 'pat-2', involvedMedications: 'Producto comercial X', problemDescription: 'Paciente informa que la caja del producto comercial X venía con el sello de seguridad roto.', status: PharmacovigilanceReportStatus.New, updatedAt: formatISO(subDays(now, 2)) },
];

// --- CONTROLLED LOG (Starts Empty) ---
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

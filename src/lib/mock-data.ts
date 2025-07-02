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

// --- DOCTORS (7) ---
const doctors: Doctor[] = [
  { id: 'doc-1', name: 'Dr. Ricardo González', specialty: 'Dermatología', license: '12345', rut: '9.876.543-2', email: 'ricardo.gonzalez@med.cl', phone: '+56911112222' },
  { id: 'doc-2', name: 'Dra. Carolina Soto', specialty: 'Reumatología', license: '54321', rut: '12.345.678-9', email: 'carolina.soto@med.cl', phone: '+56922223333' },
  { id: 'doc-3', name: 'Dr. Matías Fernández', specialty: 'Geriatría', license: '67890', rut: '8.765.432-1', email: 'matias.fernandez@med.cl', phone: '+56933334444' },
  { id: 'doc-4', name: 'Dra. Valentina Rojas', specialty: 'Endocrinología', license: '11223', rut: '14.567.890-K', email: 'valentina.rojas@med.cl', phone: '+56944445555' },
  { id: 'doc-5', name: 'Dr. Benjamín Reyes', specialty: 'Neurología', license: '33445', rut: '10.987.654-3', email: 'benjamin.reyes@med.cl', phone: '+56955556666' },
  { id: 'doc-6', name: 'Dra. Isidora Morales', specialty: 'Pediatría', license: '22334', rut: '13.123.123-4' },
  { id: 'doc-7', name: 'Dr. Felipe Castro', specialty: 'Cardiología', license: '44556', rut: '11.456.456-5' },
];

// --- PATIENTS (15) ---
const patients: Patient[] = [
  { id: 'pat-1', name: 'Ana Torres', rut: '15.123.456-7', email: 'ana.torres@email.com', phone: '+56988887777', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día. Próxima dispensación en 25 días.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-2', name: 'Carlos López', rut: '16.234.567-8', email: 'carlos.lopez@email.com', phone: '+56977776666', isChronic: true, proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Receta para tratamiento crónico vencerá en 15 días.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, chronicCareStatus: 'Atención' },
  { id: 'pat-3', name: 'Luisa Martinez', rut: '17.345.678-9', email: 'luisa.martinez@email.com', phone: '+56966665555', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento puntual finalizado.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-4', name: 'Jorge Castillo', rut: '12.456.789-K', email: 'jorge.castillo@email.com', phone: '+56955554444', isChronic: true, proactiveStatus: ProactivePatientStatus.URGENT, proactiveMessage: '¡Urgente! Última dispensación de ciclo finalizada.', actionNeeded: PatientActionNeeded.REPREPARE_CYCLE, chronicCareStatus: 'Urgente' },
  { id: 'pat-5', name: 'Sofía Núñez', rut: '18.567.890-1', email: 'sofia.nunez@email.com', phone: '+56944443333', isChronic: false, allergies: ['Penicilina'], proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-6', name: 'Miguel Soto', rut: '10.678.901-2', email: 'miguel.soto@email.com', phone: '+56933332222', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Dispensación mensual de producto comercial programada.', actionNeeded: PatientActionNeeded.DISPENSE_COMMERCIAL, chronicCareStatus: 'OK' },
  { id: 'pat-7', name: 'Fernanda Díaz', rut: '19.789.012-3', email: 'fernanda.diaz@email.com', phone: '+56922221111', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-8', name: 'Roberto Herrera', rut: '14.890.123-4', email: 'roberto.h@email.com', phone: '+56911110000', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-9', name: 'Javiera Reyes', rut: '20.901.234-5', email: 'javiera.reyes@email.com', phone: '+56900001111', isChronic: false, allergies: ['Ibuprofeno'], proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-10', name: 'Andrés Morales', rut: '13.012.345-6', email: 'andres.m@email.com', phone: '+56999998888', isChronic: true, proactiveStatus: ProactivePatientStatus.ATTENTION, proactiveMessage: 'Último ciclo de re-preparación en curso.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'Atención' },
  { id: 'pat-11', name: 'Camila Flores', rut: '15.123.456-8', email: 'camila.f@email.com', phone: '+56988887776', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-12', name: 'Diego Silva', rut: '16.234.567-9', email: 'diego.s@email.com', phone: '+56977776665', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-13', name: 'Valentina Vega', rut: '17.345.678-0', email: 'valentina.v@email.com', phone: '+56966665554', isChronic: false, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'No requiere acción.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
  { id: 'pat-14', name: 'Martín Rojas', rut: '12.456.789-L', email: 'martin.r@email.com', phone: '+56955554443', isChronic: true, proactiveStatus: ProactivePatientStatus.URGENT, proactiveMessage: 'Receta crónica vencida. Contactar urgentemente.', actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE, chronicCareStatus: 'Urgente' },
  { id: 'pat-15', name: 'Isidora Castro', rut: '18.567.890-2', email: 'isidora.c@email.com', phone: '+56944443332', isChronic: true, proactiveStatus: ProactivePatientStatus.OK, proactiveMessage: 'Tratamiento crónico al día.', actionNeeded: PatientActionNeeded.NONE, chronicCareStatus: 'OK' },
];

// --- EXTERNAL PHARMACIES (4) ---
const externalPharmacies: ExternalPharmacy[] = [
    { id: 'ext-pharma-1', name: 'Farmacias Magistrales Central', contactPerson: 'Luisa Martínez', email: 'contacto@fmagistral.cl', phone: '221234567', address: 'Av. Providencia 123', defaultPaymentModel: 'Por Receta', paymentDetails: 'Cta Cte 12345, Banco Chile' },
    { id: 'ext-pharma-2', name: 'Recetario Alameda', contactPerson: 'Roberto Carlos', email: 'roberto@recetarioalameda.cl', phone: '229876543', address: 'Alameda 456', defaultPaymentModel: 'Factura Mensual' },
    { id: 'ext-pharma-3', name: 'Compounding Solutions', contactPerson: 'Ana Frank', email: 'ana.f@compoundingsolutions.com', phone: '225554433', address: 'Apoquindo 789' },
    { id: 'ext-pharma-4', name: 'PharmaCrea', contactPerson: 'Pedro Pascal', email: 'pedro.p@pharmacrea.cl', phone: '224443322', address: 'Las Condes 123' },
];

// --- INVENTORY (15) ---
const inventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Minoxidil', quantity: 1500, unit: 'g', lowStockThreshold: 500, sku: 'SKOL-MINOX-G', barcode: '1111111111111', costPrice: 20, isControlled: false, lots: [{ lotNumber: 'M202401A', quantity: 1500, expiryDate: formatISO(addDays(now, 365)) }] },
  { id: 'inv-2', name: 'Clonazepam 0.5mg', quantity: 85, unit: 'comprimidos', lowStockThreshold: 100, sku: 'SKOL-CLONA-05', barcode: '2222222222222', costPrice: 150, isControlled: true, controlledType: 'Psicotrópico', lots: [{ lotNumber: 'C202312B', quantity: 85, expiryDate: formatISO(addDays(now, 180)) }] },
  { id: 'inv-3', name: 'Base Crema Hidrofílica', quantity: 4500, unit: 'g', lowStockThreshold: 5000, sku: 'SKOL-BASE-CREMA', barcode: '3333333333333', costPrice: 5, isControlled: false, lots: [{ lotNumber: 'BC202403', quantity: 4500, expiryDate: formatISO(addDays(now, 730)) }] },
  { id: 'inv-4', name: 'Finasteride', quantity: 5000, unit: 'mg', lowStockThreshold: 2000, sku: 'SKOL-FINAS-MG', barcode: '4444444444444', costPrice: 50, isControlled: false, lots: [{ lotNumber: 'F202402C', quantity: 5000, expiryDate: formatISO(addDays(now, 400)) }] },
  { id: 'inv-5', name: 'Metformina 850mg', quantity: 0, unit: 'comprimidos', lowStockThreshold: 200, sku: 'SKOL-METF-850', barcode: '5555555555555', costPrice: 90, isControlled: false, lots: [] },
  { id: 'inv-6', name: 'Morfina Clorhidrato Ampolla', quantity: 40, unit: 'ampollas', lowStockThreshold: 20, sku: 'SKOL-MORF-AMP', barcode: '6666666666666', costPrice: 1500, isControlled: true, controlledType: 'Estupefaciente', lots: [{ lotNumber: 'MCL202311D', quantity: 40, expiryDate: formatISO(addDays(now, 250)) }] },
  { id: 'inv-7', name: 'Vitamina C Pura', quantity: 200, unit: 'g', lowStockThreshold: 100, sku: 'SKOL-VITC-G', barcode: '7777777777777', costPrice: 10, isControlled: false, lots: [{ lotNumber: 'VC202405A', quantity: 200, expiryDate: formatISO(addDays(now, 60)) }] },
  { id: 'inv-8', name: 'Ácido Hialurónico', quantity: 80, unit: 'g', lowStockThreshold: 50, sku: 'SKOL-HIAL-G', barcode: '8888888888888', costPrice: 100, isControlled: false, lots: [{ lotNumber: 'AH202210A', quantity: 80, expiryDate: formatISO(subDays(now, 30)) }] },
  { id: 'inv-9', name: 'Ketoprofeno Gel', quantity: 120, unit: 'g', lowStockThreshold: 100, sku: 'SKOL-KETO-G', barcode: '9999999999999', costPrice: 15, isControlled: false, lots: [{ lotNumber: 'KG202404B', quantity: 120, expiryDate: formatISO(addDays(now, 300)) }] },
  { id: 'inv-10', name: 'Lidocaína Clorhidrato', quantity: 300, unit: 'mL', lowStockThreshold: 150, sku: 'SKOL-LIDO-ML', barcode: '1010101010101', costPrice: 25, isControlled: false, lots: [{ lotNumber: 'LC202401C', quantity: 300, expiryDate: formatISO(addDays(now, 450)) }] },
  { id: 'inv-11', name: 'Excipiente para Cápsulas', quantity: 10000, unit: 'g', lowStockThreshold: 2000, sku: 'SKOL-EXCIP-G', barcode: '1212121212121', costPrice: 2, isControlled: false, lots: [{ lotNumber: 'EX202406A', quantity: 10000, expiryDate: formatISO(addDays(now, 800)) }] },
  { id: 'inv-12', name: 'Zopiclona 7.5mg', quantity: 50, unit: 'comprimidos', lowStockThreshold: 50, sku: 'SKOL-ZOPI-75', barcode: '1313131313131', costPrice: 200, isControlled: true, controlledType: 'Psicotrópico', lots: [{ lotNumber: 'ZOP202310A', quantity: 50, expiryDate: formatISO(addDays(now, 90)) }] },
  { id: 'inv-13', name: 'Frasco Gotero 30mL', quantity: 250, unit: 'unidades', lowStockThreshold: 100, sku: 'SKOL-FRASCO-30', barcode: '1414141414141', costPrice: 500, isControlled: false, lots: [{ lotNumber: 'FR30-2024', quantity: 250, expiryDate: 'N/A' }] },
  { id: 'inv-14', name: 'Pote Crema 100g', quantity: 80, unit: 'unidades', lowStockThreshold: 100, sku: 'SKOL-POTE-100', barcode: '1515151515151', costPrice: 700, isControlled: false, lots: [{ lotNumber: 'PO100-2024', quantity: 80, expiryDate: 'N/A' }] },
  { id: 'inv-15', name: 'Ácido Salicílico', quantity: 500, unit: 'g', lowStockThreshold: 200, sku: 'SKOL-SALI-G', barcode: '1616161616161', costPrice: 18, isControlled: false, lots: [{ lotNumber: 'AS202403A', quantity: 500, expiryDate: formatISO(addDays(now, 500)) }] },
];

// --- RECIPE ITEMS SAMPLES ---
const recipeItemsSample1 = [{ principalActiveIngredient: 'Minoxidil', pharmaceuticalForm: 'solución', concentrationValue: '5', concentrationUnit: '% p/v', dosageValue: '1', dosageUnit: 'mL', frequency: '12', treatmentDurationValue: '3', treatmentDurationUnit: 'meses', totalQuantityValue: '180', totalQuantityUnit: 'mL', usageInstructions: 'Aplicar 1 mL en el cuero cabelludo cada 12 horas.' }];
const recipeItemsSample2 = [{ principalActiveIngredient: 'Finasteride', pharmaceuticalForm: 'cápsulas', concentrationValue: '1', concentrationUnit: 'mg', dosageValue: '1', dosageUnit: 'cápsula(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '30', totalQuantityUnit: 'cápsula(s)', usageInstructions: 'Tomar una cápsula al día.' }];
const recipeItemsSample3 = [{ principalActiveIngredient: 'Vitamina C Pura', pharmaceuticalForm: 'crema', concentrationValue: '10', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '24', treatmentDurationValue: '60', treatmentDurationUnit: 'días', totalQuantityValue: '50', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en el rostro por la mañana.' }];
const recipeItemsSample4 = [{ principalActiveIngredient: 'Ketoprofeno', pharmaceuticalForm: 'gel', concentrationValue: '2.5', concentrationUnit: '% p/p', dosageValue: '1', dosageUnit: 'aplicación(es)', frequency: '8', treatmentDurationValue: '7', treatmentDurationUnit: 'días', totalQuantityValue: '60', totalQuantityUnit: 'gramo(s)', usageInstructions: 'Aplicar en la zona afectada cada 8 horas.' }];
const recipeItemsSample5 = [{ principalActiveIngredient: 'Clonazepam', pharmaceuticalForm: 'gotas', concentrationValue: '2.5', concentrationUnit: 'mg/mL', dosageValue: '10', dosageUnit: 'gota(s)', frequency: '24', treatmentDurationValue: '30', treatmentDurationUnit: 'días', totalQuantityValue: '1', totalQuantityUnit: 'frasco(s)', usageInstructions: 'Tomar 10 gotas por la noche.' }];

// --- RECIPES (20) ---
const recipes: Recipe[] = [
  { id: 'rec-01', patientId: 'pat-1', doctorId: 'doc-1', items: recipeItemsSample1, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 45)), updatedAt: formatISO(subDays(now, 40)), dueDate: formatISO(addMonths(now, 5)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 15000, auditTrail: [{status: RecipeStatus.Dispensed, date: formatISO(subDays(now, 40)), userId: 'user-2'}] },
  { id: 'rec-02', patientId: 'pat-2', doctorId: 'doc-1', items: recipeItemsSample2, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 200)), updatedAt: formatISO(subDays(now, 195)), dueDate: formatISO(subDays(now, 5)), externalPharmacyId: 'ext-pharma-2', preparationCost: 25000, auditTrail: [{status: RecipeStatus.Dispensed, date: formatISO(subDays(now, 195)), userId: 'user-2'}] },
  { id: 'rec-03', patientId: 'pat-4', doctorId: 'doc-3', items: recipeItemsSample2, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 30)), updatedAt: formatISO(subDays(now, 25)), dueDate: formatISO(addMonths(now, 5)), externalPharmacyId: 'ext-pharma-2', preparationCost: 22000, auditTrail: [...Array(5)].map((_, i) => ({status: RecipeStatus.Dispensed, date: formatISO(subDays(now, 30*(i+1))), userId: 'user-2'}))},
  { id: 'rec-04', patientId: 'pat-15', doctorId: 'doc-7', items: recipeItemsSample4, status: RecipeStatus.ReadyForPickup, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 3)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-4', supplySource: 'Stock del Recetario Externo', preparationCost: 12000, auditTrail: []},
  { id: 'rec-05', patientId: 'pat-12', doctorId: 'doc-5', items: recipeItemsSample5, status: RecipeStatus.ReadyForPickup, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 4)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 18000, isControlled: true, controlledRecipeFolio: 'F123456'},
  { id: 'rec-06', patientId: 'pat-7', doctorId: 'doc-4', items: recipeItemsSample3, status: RecipeStatus.ReceivedAtSkol, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 7)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 5)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 18000, auditTrail: [] },
  { id: 'rec-07', patientId: 'pat-8', doctorId: 'doc-2', items: recipeItemsSample1, status: RecipeStatus.SentToExternal, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 8)), updatedAt: formatISO(subDays(now, 5)), dueDate: formatISO(addMonths(now, 4)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 16500, auditTrail: [] },
  { id: 'rec-08', patientId: 'pat-6', doctorId: 'doc-5', items: [{...recipeItemsSample1[0], principalActiveIngredient: 'Minoxidil'}], status: RecipeStatus.Validated, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 2)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Insumos de Skol', skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.PendingDispatch, preparationCost: 19000, auditTrail: [] },
  { id: 'rec-09', patientId: 'pat-9', doctorId: 'doc-6', items: recipeItemsSample3, status: RecipeStatus.Validated, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 3)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(now, 3)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 21000, auditTrail: [] },
  { id: 'rec-10', patientId: 'pat-3', doctorId: 'doc-2', items: recipeItemsSample1, status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 0)), updatedAt: formatISO(subDays(now, 0)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 16000, auditTrail: [] },
  { id: 'rec-11', patientId: 'pat-14', doctorId: 'doc-5', items: recipeItemsSample5, status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 1)), updatedAt: formatISO(subDays(now, 1)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 17500, isControlled: true, controlledRecipeFolio: 'B987654', controlledRecipeType: 'Receta Cheque'},
  { id: 'rec-12', patientId: 'pat-5', doctorId: 'doc-2', items: recipeItemsSample1, status: RecipeStatus.Rejected, rejectionReason: 'Firma de médico no coincide', paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 12)), updatedAt: formatISO(subDays(now, 11)), dueDate: formatISO(addMonths(now, 2)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 0, auditTrail: [] },
  { id: 'rec-13', patientId: 'pat-1', doctorId: 'doc-1', items: recipeItemsSample2, status: RecipeStatus.Cancelled, paymentStatus: 'N/A', createdAt: formatISO(subDays(now, 30)), updatedAt: formatISO(subDays(now, 20)), dueDate: formatISO(addMonths(now, 3)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 0, auditTrail: [] },
  { id: 'rec-14', patientId: 'pat-10', doctorId: 'doc-7', items: recipeItemsSample4, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 50)), updatedAt: formatISO(subDays(now, 45)), dueDate: formatISO(addMonths(now, 1)), externalPharmacyId: 'ext-pharma-4', supplySource: 'Stock del Recetario Externo', preparationCost: 13000, auditTrail: []},
  { id: 'rec-15', patientId: 'pat-11', doctorId: 'doc-6', items: recipeItemsSample3, status: RecipeStatus.PendingValidation, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 2)), updatedAt: formatISO(subDays(now, 2)), dueDate: formatISO(addMonths(now, 6)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 19500, auditTrail: []},
  { id: 'rec-16', patientId: 'pat-13', doctorId: 'doc-4', items: recipeItemsSample1, status: RecipeStatus.Validated, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 5)), updatedAt: formatISO(subDays(now, 4)), dueDate: formatISO(addMonths(now, 5)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Stock del Recetario Externo', preparationCost: 15500, auditTrail: []},
  { id: 'rec-17', patientId: 'pat-4', doctorId: 'doc-3', items: recipeItemsSample3, status: RecipeStatus.Dispensed, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 60)), updatedAt: formatISO(subDays(now, 55)), dueDate: formatISO(addMonths(now, 0)), externalPharmacyId: 'ext-pharma-2', supplySource: 'Stock del Recetario Externo', preparationCost: 23000, auditTrail: []},
  { id: 'rec-18', patientId: 'pat-8', doctorId: 'doc-7', items: recipeItemsSample2, status: RecipeStatus.SentToExternal, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 10)), updatedAt: formatISO(subDays(now, 8)), dueDate: formatISO(addMonths(now, 2)), externalPharmacyId: 'ext-pharma-3', supplySource: 'Stock del Recetario Externo', preparationCost: 24000, auditTrail: []},
  { id: 'rec-19', patientId: 'pat-2', doctorId: 'doc-5', items: recipeItemsSample5, status: RecipeStatus.ReceivedAtSkol, paymentStatus: 'Pagado', createdAt: formatISO(subDays(now, 15)), updatedAt: formatISO(subDays(now, 3)), dueDate: formatISO(addMonths(now, 1)), externalPharmacyId: 'ext-pharma-1', supplySource: 'Insumos de Skol', skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.Dispatched, preparationCost: 20000, isControlled: true, controlledRecipeFolio: 'A7654321' },
  { id: 'rec-20', patientId: 'pat-10', doctorId: 'doc-3', items: recipeItemsSample1, status: RecipeStatus.ReadyForPickup, paymentStatus: 'Pendiente', createdAt: formatISO(subDays(now, 6)), updatedAt: formatISO(subDays(now, 3)), dueDate: formatISO(addMonths(now, 4)), externalPharmacyId: 'ext-pharma-4', supplySource: 'Stock del Recetario Externo', preparationCost: 14000, auditTrail: []},
];

// --- PHARMACOVIGILANCE (5) ---
const pharmacovigilanceReports: PharmacovigilanceReport[] = [
  { id: 'pv-1', reportedAt: formatISO(subDays(now, 20)), reporterName: 'Juan Pérez', recipeId: 'rec-01', patientId: 'pat-1', externalPharmacyId: 'ext-pharma-1', involvedMedications: 'Minoxidil 5%', problemDescription: 'Paciente reporta irritación y enrojecimiento en la zona de aplicación.', status: PharmacovigilanceReportStatus.Resolved, resolutionDetails: 'Se contactó al paciente, se recomendó suspender uso. Se clasificó como reacción leve esperable.', updatedAt: formatISO(subDays(now, 15)) },
  { id: 'pv-2', reportedAt: formatISO(subDays(now, 5)), reporterName: 'Admin Skol', recipeId: 'rec-18', patientId: 'pat-8', externalPharmacyId: 'ext-pharma-3', involvedMedications: 'Finasteride 1mg', problemDescription: 'Recetario externo reporta que las cápsulas tienen un color no homogéneo.', status: PharmacovigilanceReportStatus.UnderInvestigation, actionsTaken: 'Se solicitó al recetario el envío de una muestra para análisis. Se puso en cuarentena el lote de producción.', updatedAt: formatISO(subDays(now, 2)) },
  { id: 'pv-3', reportedAt: formatISO(subDays(now, 2)), reporterName: 'Juan Pérez', patientId: 'pat-2', involvedMedications: 'Producto comercial X', problemDescription: 'Paciente informa que la caja del producto comercial X venía con el sello de seguridad roto.', status: PharmacovigilanceReportStatus.New, updatedAt: formatISO(subDays(now, 2)) },
  { id: 'pv-4', reportedAt: formatISO(subDays(now, 35)), reporterName: 'Admin Skol', recipeId: 'rec-17', patientId: 'pat-4', externalPharmacyId: 'ext-pharma-2', involvedMedications: 'Vitamina C Pura 10%', problemDescription: 'Paciente alega que la crema tiene un olor rancio.', status: PharmacovigilanceReportStatus.Closed, resolutionDetails: 'Se analizó la contramuestra y no se encontraron problemas. Se contactó al paciente para indagar sobre el almacenamiento. Se cierra el caso.', updatedAt: formatISO(subDays(now, 30))},
  { id: 'pv-5', reportedAt: formatISO(subDays(now, 10)), reporterName: 'Admin Skol', recipeId: 'rec-19', patientId: 'pat-2', externalPharmacyId: 'ext-pharma-1', involvedMedications: 'Clonazepam Gotas', problemDescription: 'El recetario informa una discrepancia en el despacho de insumos. Se enviaron 2 frascos en vez de 1.', status: PharmacovigilanceReportStatus.ActionRequired, actionsTaken: 'Revisar registro de despacho y contactar a logística.', updatedAt: formatISO(subDays(now, 9))},
];

// --- CONTROLLED LOG (5) ---
const controlledSubstanceLog: ControlledSubstanceLogEntry[] = [
    {id: 'csl-1', entryType: ControlledLogEntryType.MagistralDispensation, dispensationDate: formatISO(subDays(now, 5)), internalFolio: 'CSL-24-001', patientId: 'pat-12', doctorId: 'doc-5', medicationName: 'Clonazepam Gotas', recipeId: 'rec-05', quantityDispensed: 1, quantityUnit: 'frasco(s)', controlledType: 'Psicotrópico', prescriptionFolio: 'F123456', prescriptionType: 'Receta Retenida', retrievedBy_Name: 'Diego Silva', retrievedBy_RUT: '16.234.567-9'},
    {id: 'csl-2', entryType: ControlledLogEntryType.DirectSale, dispensationDate: formatISO(subDays(now, 10)), internalFolio: 'CSL-24-002', patientId: 'pat-14', doctorId: 'doc-5', medicationName: 'Zopiclona 7.5mg', inventoryItemId: 'inv-12', quantityDispensed: 30, quantityUnit: 'comprimidos', controlledType: 'Psicotrópico', prescriptionFolio: 'C876543', prescriptionType: 'Receta Cheque', retrievedBy_Name: 'Martín Rojas', retrievedBy_RUT: '12.456.789-L'},
    {id: 'csl-3', entryType: ControlledLogEntryType.MagistralDispensation, dispensationDate: formatISO(subDays(now, 15)), internalFolio: 'CSL-24-003', patientId: 'pat-2', doctorId: 'doc-5', medicationName: 'Clonazepam Gotas', recipeId: 'rec-19', quantityDispensed: 1, quantityUnit: 'frasco(s)', controlledType: 'Psicotrópico', prescriptionFolio: 'A7654321', prescriptionType: 'Receta Retenida', retrievedBy_Name: 'Carlos López', retrievedBy_RUT: '16.234.567-8'},
    {id: 'csl-4', entryType: ControlledLogEntryType.DirectSale, dispensationDate: formatISO(subDays(now, 25)), internalFolio: 'CSL-24-004', patientId: 'pat-4', doctorId: 'doc-3', medicationName: 'Morfina Clorhidrato Ampolla', inventoryItemId: 'inv-6', quantityDispensed: 5, quantityUnit: 'ampollas', controlledType: 'Estupefaciente', prescriptionFolio: 'CH-555444', prescriptionType: 'Receta Cheque', retrievedBy_Name: 'Familiar', retrievedBy_RUT: '7.890.123-4'},
    {id: 'csl-5', entryType: ControlledLogEntryType.DirectSale, dispensationDate: formatISO(subDays(now, 40)), internalFolio: 'CSL-24-005', patientId: 'pat-8', doctorId: 'doc-2', medicationName: 'Clonazepam 0.5mg', inventoryItemId: 'inv-2', quantityDispensed: 30, quantityUnit: 'comprimidos', controlledType: 'Psicotrópico', prescriptionFolio: 'F-999888', prescriptionType: 'Receta Retenida', retrievedBy_Name: 'Roberto Herrera', retrievedBy_RUT: '14.890.123-4'},
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

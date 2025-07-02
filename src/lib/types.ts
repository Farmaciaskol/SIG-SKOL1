export enum RecipeStatus {
  PendingValidation = 'Pendiente Validación',
  Validated = 'Validada',
  Rejected = 'Rechazada',
  Preparation = 'En Preparación',
  QualityControl = 'Control de Calidad',
  Dispensed = 'Dispensada',
  Cancelled = 'Anulada',
}

export enum ProactivePatientStatus {
  OK = 'OK', // No action needed
  ATTENTION = 'ATTENTION', // Needs attention, but not urgent
  URGENT = 'URGENT', // Urgent action required
}

export enum PatientActionNeeded {
  NONE = 'NONE',
  CREATE_NEW_RECIPE = 'CREATE_NEW_RECIPE',
  REPREPARE_CYCLE = 'REPREPARE_CYCLE',
  DISPENSE_COMMERCIAL = 'DISPENSE_COMMERCIAL',
}

export enum SkolSuppliedItemsDispatchStatus {
  PendingDispatch = 'Pendiente Despacho',
  Dispatched = 'Despachado',
}

export enum DispatchStatus {
  Active = 'Activo',
  Received = 'Recibido',
  Cancelled = 'Cancelado',
}

export interface RecipeItem {
  principalActiveIngredient: string;
  pharmaceuticalForm: string;
  concentrationValue: string;
  concentrationUnit: string;
  dosageValue: string;
  dosageUnit: string;
  frequency: string;
  treatmentDurationValue: string;
  treatmentDurationUnit: string;
  totalQuantityValue: string;
  totalQuantityUnit: string;
  usageInstructions: string;
}

export interface Recipe {
  id: string;
  patientId: string;
  doctorId: string;
  dispatchAddress?: string;
  items: RecipeItem[];
  status: RecipeStatus;
  paymentStatus: 'Pagado' | 'Pendiente' | 'N/A';
  rejectionReason?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  externalPharmacyId?: string;
  supplySource?: 'Stock del Recetario Externo' | 'Insumos de Skol';
  preparationCost?: number;
  isControlled?: boolean;
  controlledRecipeType?: string;
  controlledRecipeFolio?: string;
  controlledRecipeImageUrl?: string;
  prescriptionImageUrl?: string;
  skolSuppliedItemsDispatchStatus?: SkolSuppliedItemsDispatchStatus;
}

export interface Patient {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  address?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro';
  isChronic: boolean;
  preferredDispensationDay?: number;
  allergies?: string[];
  adverseReactions?: AdverseReaction[];
  associatedDoctorIds?: string[];
  // Legacy field, to be replaced by proactive fields
  chronicCareStatus: 'OK' | 'Atención' | 'Urgente';
  // New proactive fields
  proactiveStatus: ProactivePatientStatus;
  proactiveMessage: string;
  actionNeeded: PatientActionNeeded;
}

export interface AdverseReaction {
  medication: string;
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  license?: string;
  rut?: string;
  email?: string;
  phone?: string;
}

export interface ExternalPharmacy {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentDetails?: string; // e.g., bank account info
  defaultPaymentModel?: 'Por Receta' | 'Factura Mensual';
}

export interface LotDetail {
    lotNumber: string;
    quantity: number;
    expiryDate: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  barcode?: string;
  lots?: LotDetail[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface DispatchItem {
    recipeId: string;
    inventoryItemId: string;
    lotNumber: string;
    quantity: number;
}

export interface DispatchNote {
    id: string;
    externalPharmacyId: string;
    status: DispatchStatus;
    createdAt: string;
    completedAt?: string;
    items: DispatchItem[];
    dispatcherName?: string;
    receivedByName?: string;
    notes?: string;
}


export interface AppData {
  recipes: Recipe[];
  patients: Patient[];
  doctors: Doctor[];
  inventory: InventoryItem[];
  users: User[];
  roles: Role[];
  externalPharmacies: ExternalPharmacy[];
  dispatchNotes: DispatchNote[];
}

    
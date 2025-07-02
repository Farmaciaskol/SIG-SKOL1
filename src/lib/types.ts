export enum RecipeStatus {
  PendingValidation = 'Pendiente Validación',
  Validated = 'Validada',
  Rejected = 'Rechazada',
  Preparation = 'En Preparación',
  QualityControl = 'Control de Calidad',
  Dispensed = 'Dispensada',
  Cancelled = 'Anulada',
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
  items: RecipeItem[];
  status: RecipeStatus;
  paymentStatus: 'Pagado' | 'Pendiente' | 'N/A';
  rejectionReason?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  isChronic: boolean;
  chronicCareStatus: 'OK' | 'Atención' | 'Urgente';
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
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

export interface AppData {
  recipes: Recipe[];
  patients: Patient[];
  doctors: Doctor[];
  inventory: InventoryItem[];
  users: User[];
  roles: Role[];
}

import {
  FileSearch,
  FileClock,
  XCircle,
  Send,
  PackageCheck,
  CheckCheck,
  Ban,
  Package,
  FlaskConical,
  ShieldCheck,
  Archive,
  LucideIcon
} from 'lucide-react';
import { RecipeStatus } from './types';

export const LOCAL_STORAGE_KEY = 'skol-app-data';

export const ROLES = {
  ADMIN: 'Administrador',
  PHARMACIST: 'Farmacéutico',
};

export const PERMISSIONS = {
  RECIPES: {
    CREATE: 'recipes:create',
    READ: 'recipes:read',
    UPDATE: 'recipes:update',
    DELETE: 'recipes:delete',
    VALIDATE: 'recipes:validate',
  },
  PATIENTS: {
    CREATE: 'patients:create',
    READ: 'patients:read',
    UPDATE: 'patients:update',
    DELETE: 'patients:delete',
  },
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
  },
};

export const PHARMACEUTICAL_FORM_DEFAULTS: Record<string, {
  concentrationUnit: string;
  dosageUnit: string;
  totalQuantityUnit: string;
}> = {
  'cápsulas': {
    concentrationUnit: 'mg',
    dosageUnit: 'cápsula(s)',
    totalQuantityUnit: 'cápsula(s)',
  },
  'crema': {
    concentrationUnit: '% p/p',
    dosageUnit: 'aplicación(es)',
    totalQuantityUnit: 'gramo(s)',
  },
  'solución': {
    concentrationUnit: 'mg/mL',
    dosageUnit: 'mL',
    totalQuantityUnit: 'mL',
  },
  'gel': {
    concentrationUnit: '% p/p',
    dosageUnit: 'aplicación(es)',
    totalQuantityUnit: 'gramo(s)',
  },
  'ungüento': {
    concentrationUnit: '% p/p',
    dosageUnit: 'aplicación(es)',
    totalQuantityUnit: 'gramo(s)',
  },
  'comprimidos': {
    concentrationUnit: 'mg',
    dosageUnit: 'comprimido(s)',
    totalQuantityUnit: 'comprimido(s)',
  },
  'gotas': {
    concentrationUnit: 'mg/gota',
    dosageUnit: 'gota(s)',
    totalQuantityUnit: 'mL',
  },
  'inyectable': {
    concentrationUnit: 'mg/mL',
    dosageUnit: 'mL',
    totalQuantityUnit: 'mL',
  },
  'papelillo': {
    concentrationUnit: 'mg',
    dosageUnit: 'papelillo(s)',
    totalQuantityUnit: 'papelillo(s)',
  },
};

export const MAX_REPREPARATIONS = 4;


export const statusConfig: Record<RecipeStatus, { text: string; badge: string; icon: LucideIcon }> = {
  [RecipeStatus.PendingReviewPortal]: { text: 'Pendiente Revisión - Portal', badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: FileSearch },
  [RecipeStatus.PendingValidation]: { text: 'Pendiente Validación', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: FileClock },
  [RecipeStatus.Validated]: { text: 'Validada', badge: 'bg-sky-100 text-sky-800 border-sky-200', icon: ShieldCheck },
  [RecipeStatus.SentToExternal]: { text: 'Enviada a Recetario', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Send },
  [RecipeStatus.Preparation]: { text: 'En Preparación', badge: 'bg-pink-100 text-pink-800 border-pink-200', icon: FlaskConical },
  [RecipeStatus.ReceivedAtSkol]: { text: 'Recepcionado en Skol', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: PackageCheck },
  [RecipeStatus.ReadyForPickup]: { text: 'Lista para Retiro', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package },
  [RecipeStatus.Dispensed]: { text: 'Dispensada', badge: 'bg-green-100 text-green-800 border-green-200', icon: CheckCheck },
  [RecipeStatus.Rejected]: { text: 'Rechazada', badge: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  [RecipeStatus.Cancelled]: { text: 'Anulada', badge: 'bg-slate-200 text-slate-800 border-slate-300', icon: Ban },
  [RecipeStatus.Archived]: { text: 'Archivada', badge: 'bg-gray-200 text-gray-800 border-gray-300', icon: Archive },
};

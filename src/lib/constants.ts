
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
  LucideIcon,
  Inbox
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
  'jarabe': {
    concentrationUnit: 'mg/mL',
    dosageUnit: 'mL',
    totalQuantityUnit: 'mL',
  },
};

export const MAX_REPREPARATIONS = 4;


export const statusConfig: Record<RecipeStatus, { text: string; badge: string; icon: LucideIcon }> = {
  [RecipeStatus.PendingReviewPortal]: { text: 'Revisión Portal', badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: Inbox },
  [RecipeStatus.PendingValidation]: { text: 'Pend. Validación', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FileClock },
  [RecipeStatus.Validated]: { text: 'Validada', badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: ShieldCheck },
  [RecipeStatus.SentToExternal]: { text: 'Enviada a Recetario', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Send },
  [RecipeStatus.Preparation]: { text: 'En Preparación', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: FlaskConical },
  [RecipeStatus.ReceivedAtSkol]: { text: 'Recepcionado en Skol', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: PackageCheck },
  [RecipeStatus.ReadyForPickup]: { text: 'Lista para Retiro', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package },
  [RecipeStatus.Dispensed]: { text: 'Dispensada', badge: 'bg-green-100 text-green-800 border-green-200', icon: CheckCheck },
  [RecipeStatus.Rejected]: { text: 'Rechazada', badge: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  [RecipeStatus.Cancelled]: { text: 'Anulada', badge: 'bg-slate-200 text-slate-800 border-slate-300', icon: Ban },
  [RecipeStatus.Archived]: { text: 'Archivada', badge: 'bg-gray-200 text-gray-800 border-gray-300', icon: Archive },
};


export const VADEMECUM_DATA = [
    { productName: "Tapsin 500mg Comprimidos", activeIngredient: "Paracetamol", sanitaryRegistry: "F-12345/21" },
    { productName: "Kitadol 1g", activeIngredient: "Paracetamol", sanitaryRegistry: "F-54321/20" },
    { productName: "Ibuprofeno 400mg L.CH.", activeIngredient: "Ibuprofeno", sanitaryRegistry: "F-23456/19" },
    { productName: "Niofen 400mg", activeIngredient: "Ibuprofeno", sanitaryRegistry: "F-65432/18" },
    { productName: "Diclofenaco Sódico 50mg", activeIngredient: "Diclofenaco", sanitaryRegistry: "F-11223/20" },
    { productName: "Lertus 50mg", activeIngredient: "Diclofenaco", sanitaryRegistry: "F-33445/19" },
    { productName: "Losartan Potásico 50mg", activeIngredient: "Losartán", sanitaryRegistry: "F-34567/22" },
    { productName: "Cozaar 50mg", activeIngredient: "Losartán", sanitaryRegistry: "F-76543/21" },
    { productName: "Enalapril 10mg", activeIngredient: "Enalapril", sanitaryRegistry: "F-56789/21" },
    { productName: "Eutirox 100mcg", activeIngredient: "Levotiroxina", sanitaryRegistry: "F-45678/20" },
    { productName: "Metformina 850mg", activeIngredient: "Metformina", sanitaryRegistry: "F-56789/19" },
    { productName: "Glafornil 850mg", activeIngredient: "Metformina", sanitaryRegistry: "F-98765/18" },
    { productName: "Amoxicilina 500mg", activeIngredient: "Amoxicilina", sanitaryRegistry: "F-67890/22" },
    { productName: "Amoval 500mg", activeIngredient: "Amoxicilina", sanitaryRegistry: "F-67891/22" },
    { productName: "Clavinex 500/125", activeIngredient: "Amoxicilina/Ácido Clavulánico", sanitaryRegistry: "F-11223/21" },
    { productName: "Ciprofloxacino 500mg", activeIngredient: "Ciprofloxacino", sanitaryRegistry: "F-22334/20" },
    { productName: "Atorvastatina 20mg", activeIngredient: "Atorvastatina", sanitaryRegistry: "F-78901/20" },
    { productName: "Lipitor 20mg", activeIngredient: "Atorvastatina", sanitaryRegistry: "F-22334/19" },
    { productName: "Sertralina 50mg", activeIngredient: "Sertralina", sanitaryRegistry: "F-89012/18" },
    { productName: "Altruline 50mg", activeIngredient: "Sertralina", sanitaryRegistry: "F-33445/22" },
    { productName: "Escitalopram 10mg", activeIngredient: "Escitalopram", sanitaryRegistry: "F-89013/19" },
    { productName: "Lexapro 10mg", activeIngredient: "Escitalopram", sanitaryRegistry: "F-33446/21" },
    { productName: "Fluoxetina 20mg", activeIngredient: "Fluoxetina", sanitaryRegistry: "F-89014/17" },
    { productName: "Prozac 20mg", activeIngredient: "Fluoxetina", sanitaryRegistry: "F-33447/20" },
    { productName: "Omeprazol 20mg", activeIngredient: "Omeprazol", sanitaryRegistry: "F-90123/21" },
    { productName: "Zotran 20mg", activeIngredient: "Omeprazol", sanitaryRegistry: "F-44556/20" },
    { productName: "Loratadina 10mg", activeIngredient: "Loratadina", sanitaryRegistry: "F-12121/23" },
    { productName: "Clarityne 10mg", activeIngredient: "Loratadina", sanitaryRegistry: "F-12122/23" },
    { productName: "Tramadol Clorhidrato 50mg", activeIngredient: "Tramadol", sanitaryRegistry: "F-10294/20", isControlled: true },
    { productName: "Tradol 50mg", activeIngredient: "Tramadol", sanitaryRegistry: "F-55668/19", isControlled: true },
    { productName: "Zopiclona 7.5mg", activeIngredient: "Zopiclona", sanitaryRegistry: "F-10295/18", isControlled: true },
    { productName: "Metilfenidato 10mg", activeIngredient: "Metilfenidato", sanitaryRegistry: "F-10296/21", isControlled: true },
    { productName: "Ritalin 10mg", activeIngredient: "Metilfenidato", sanitaryRegistry: "F-55669/20", isControlled: true },
    { productName: "Clonazepam 0.5mg", activeIngredient: "Clonazepam", sanitaryRegistry: "F-10293/19", isControlled: true },
    { productName: "Ravotril 0.5mg", activeIngredient: "Clonazepam", sanitaryRegistry: "F-55667/18", isControlled: true },
    { productName: "Alprazolam 0.5mg", activeIngredient: "Alprazolam", sanitaryRegistry: "F-20384/22", isControlled: true },
    { productName: "Minoxidilo 5%", activeIngredient: "Minoxidilo", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Ácido Retinoico 0.05%", activeIngredient: "Ácido Retinoico", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Clobetasol Propionato 0.05%", activeIngredient: "Clobetasol Propionato", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Hidroquinona 4%", activeIngredient: "Hidroquinona", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Cafeína Anhidra", activeIngredient: "Cafeína", sanitaryRegistry: "N/A - Preparado Magistral" },
    { productName: "Finasterida 1mg", activeIngredient: "Finasterida", sanitaryRegistry: "F-66778/21" },
];

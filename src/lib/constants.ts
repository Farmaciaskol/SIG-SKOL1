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

export const PHARMACEUTICAL_FORMS = [
  'Cápsulas',
  'Crema',
  'Solución',
  'Gel',
  'Ungüento',
  'Comprimidos',
  'Gotas',
  'Inyectable',
  'Otro',
];

export const CONCENTRATION_UNITS = [
  '% p/p',
  '% p/v',
  '% v/v',
  'mg/mL',
  'g/mL',
  'mcg/mL',
  'UI/mL',
  'mg/g',
  'g/g',
  'mg',
  'g',
  'mcg',
  'UI',
  'mg/dosis',
  'mcg/dosis',
  'mg/gota',
  'Otro',
];

export const DOSAGE_UNITS = [
  'cápsula(s)', 'comprimido(s)', 'gragea(s)', 'papelillo(s)',
  'mL', 'gota(s)', 'cucharadita(s) (5mL)', 'cucharada(s) (15mL)',
  'aplicación(es)', 'gramo(s)', 'UI', 'parche(s)', 'óvulo(s)', 'supositorio(s)',
  'puff(s)', 'inhalación(es)', 'nebulización(es)', 'frasco(s)',
  'unidad(es)',
  'Otro'
];

export const TREATMENT_DURATION_UNITS = ['días', 'semanas', 'meses'];

export const QUANTITY_TO_PREPARE_UNITS = [
  'cápsula(s)', 'comprimido(s)', 'gragea(s)', 'sachet(s)', 'papelillo(s)',
  'mL', 'L', 'gramo(s)', 'Kg',
  'frasco(s)', 'pote(s)', 'tubo(s)', 'blister(s)', 'caja(s)',
  'unidad(es)',
  'Otro'
];

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
};

export const MAX_REPREPARATIONS = 4;

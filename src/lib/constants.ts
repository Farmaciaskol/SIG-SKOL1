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

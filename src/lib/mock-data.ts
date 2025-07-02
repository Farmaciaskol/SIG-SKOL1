import type { AppData, Patient, Doctor, Recipe, RecipeItem, InventoryItem, User, Role } from './types';
import { RecipeStatus } from './types';
import { ROLES, PERMISSIONS } from './constants';

export function getMockData(): AppData {
  const patients: Patient[] = [
    { id: 'P001', name: 'Ana Martínez', rut: '12.345.678-9', email: 'ana.martinez@example.com', phone: '+56912345678', isChronic: true, chronicCareStatus: 'Atención' },
    { id: 'P002', name: 'Carlos Rodríguez', rut: '9.876.543-2', email: 'carlos.rodriguez@example.com', phone: '+56987654321', isChronic: false, chronicCareStatus: 'OK' },
    { id: 'P003', name: 'Luisa Gomez', rut: '15.111.222-K', email: 'luisa.gomez@example.com', phone: '+56911122233', isChronic: true, chronicCareStatus: 'Urgente' },
  ];

  const doctors: Doctor[] = [
    { id: 'D001', name: 'Dr. Ricardo Pérez', specialty: 'Dermatología' },
    { id: 'D002', name: 'Dra. Sofía López', specialty: 'Medicina General' },
  ];

  const inventory: InventoryItem[] = [
    { id: 'I001', name: 'Minoxidil 5%', stock: 500, unit: 'ml', lowStockThreshold: 100 },
    { id: 'I002', name: 'Crema Base Hidrófila', stock: 2000, unit: 'g', lowStockThreshold: 500 },
    { id: 'I003', name: 'Propranolol 10mg', stock: 150, unit: 'comprimidos', lowStockThreshold: 50 },
  ];

  const recipes: Recipe[] = [
    {
      id: 'R0001',
      patientId: 'P001',
      doctorId: 'D001',
      status: RecipeStatus.PendingValidation,
      items: [{ inventoryId: 'I001', quantity: 60, instructions: 'Aplicar 1ml en el cuero cabelludo dos veces al día.' }],
      paymentStatus: 'Pagado',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
      updatedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
      id: 'R0002',
      patientId: 'P002',
      doctorId: 'D002',
      status: RecipeStatus.Preparation,
      items: [{ inventoryId: 'I003', quantity: 30, instructions: 'Tomar 1 comprimido al día con abundante agua.' }],
      paymentStatus: 'Pendiente',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'R0003',
      patientId: 'P003',
      doctorId: 'D001',
      status: RecipeStatus.Dispensed,
      items: [{ inventoryId: 'I002', quantity: 100, instructions: 'Aplicar en zona afectada 3 veces al día.' }],
      paymentStatus: 'Pagado',
      dueDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
      updatedAt: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    },
    {
      id: 'R0004',
      patientId: 'P001',
      doctorId: 'D001',
      status: RecipeStatus.Rejected,
      items: [],
      rejectionReason: 'Firma del médico no es legible.',
      paymentStatus: 'N/A',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const users: User[] = [
      { id: 'U001', name: 'Admin User', email: 'admin@skol.com', roleId: 'R01' },
      { id: 'U002', name: 'Pharmacist User', email: 'pharmacist@skol.com', roleId: 'R02' },
  ];

  const roles: Role[] = [
      { id: 'R01', name: ROLES.ADMIN, permissions: Object.values(PERMISSIONS).flatMap(p => Object.values(p))},
      { id: 'R02', name: ROLES.PHARMACIST, permissions: [PERMISSIONS.RECIPES.READ, PERMISSIONS.RECIPES.UPDATE, PERMISSIONS.PATIENTS.READ] }
  ]

  return { patients, doctors, inventory, recipes, users, roles };
}

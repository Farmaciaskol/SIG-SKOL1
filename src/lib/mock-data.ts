import type { AppData, Patient, Doctor, Recipe, RecipeItem, InventoryItem, User, Role, ExternalPharmacy } from './types';
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

  const externalPharmacies: ExternalPharmacy[] = [
    { id: 'EP001', name: 'Recetario Central' },
    { id: 'EP002', name: 'Farmacias Magistrales S.A.' },
    { id: 'EP003', name: 'Tu Fórmula' },
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
      items: [
        {
          principalActiveIngredient: 'Minoxidil',
          pharmaceuticalForm: 'Solución',
          concentrationValue: '5',
          concentrationUnit: '%',
          dosageValue: '1',
          dosageUnit: 'ml',
          frequency: '12',
          treatmentDurationValue: '90',
          treatmentDurationUnit: 'días',
          totalQuantityValue: '180',
          totalQuantityUnit: 'ml',
          usageInstructions: 'Aplicar 1ml en el cuero cabelludo dos veces al día, mañana y noche.',
        },
      ],
      paymentStatus: 'Pagado',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
      updatedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
      externalPharmacyId: 'EP001',
      supplySource: 'Stock del Recetario Externo',
      preparationCost: 15000,
    },
    {
      id: 'R0002',
      patientId: 'P002',
      doctorId: 'D002',
      status: RecipeStatus.Preparation,
      items: [
        {
          principalActiveIngredient: 'Propranolol',
          pharmaceuticalForm: 'Cápsulas',
          concentrationValue: '10',
          concentrationUnit: 'mg',
          dosageValue: '1',
          dosageUnit: 'cápsula',
          frequency: '24',
          treatmentDurationValue: '30',
          treatmentDurationUnit: 'días',
          totalQuantityValue: '30',
          totalQuantityUnit: 'cápsulas',
          usageInstructions: 'Tomar 1 comprimido al día con abundante agua, preferiblemente por la mañana.',
        },
      ],
      paymentStatus: 'Pendiente',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
      updatedAt: new Date().toISOString(),
      externalPharmacyId: 'EP002',
      supplySource: 'Insumos de Skol',
      preparationCost: 25000,
    },
    {
      id: 'R0003',
      patientId: 'P003',
      doctorId: 'D001',
      status: RecipeStatus.Dispensed,
      items: [
        {
          principalActiveIngredient: 'Hidrocortisona',
          pharmaceuticalForm: 'Crema',
          concentrationValue: '1',
          concentrationUnit: '%',
          dosageValue: '1',
          dosageUnit: 'aplicación',
          frequency: '8',
          treatmentDurationValue: '14',
          treatmentDurationUnit: 'días',
          totalQuantityValue: '50',
          totalQuantityUnit: 'g',
          usageInstructions: 'Aplicar una capa fina en la zona afectada 3 veces al día.',
        },
      ],
      paymentStatus: 'Pagado',
      dueDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
      createdAt: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
      updatedAt: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
      externalPharmacyId: 'EP001',
      supplySource: 'Stock del Recetario Externo',
      preparationCost: 18500,
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

  return { patients, doctors, inventory, recipes, users, roles, externalPharmacies };
}

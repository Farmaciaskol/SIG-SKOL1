import type { AppData, Patient, Doctor, Recipe, RecipeItem, InventoryItem, User, Role, ExternalPharmacy, DispatchNote } from './types';
import { RecipeStatus, ProactivePatientStatus, PatientActionNeeded, SkolSuppliedItemsDispatchStatus } from './types';
import { ROLES, PERMISSIONS } from './constants';

export function getMockData(): AppData {
  const patients: Patient[] = [
    { 
      id: 'P001', 
      name: 'Catalina Flores', 
      rut: '21.345.678-K', 
      email: 'catalina.flores@example.com', 
      phone: '+56912345678', 
      isChronic: false, 
      chronicCareStatus: 'OK',
      proactiveStatus: ProactivePatientStatus.OK,
      proactiveMessage: 'Paciente no crónico. Gestión manual.',
      actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE,
      allergies: ['Penicilina'],
    },
    { 
      id: 'P002', 
      name: 'Anastasia Rojas', 
      rut: '19.876.543-2', 
      email: 'anastasia.rojas@example.com', 
      phone: '+56987654321', 
      isChronic: true, 
      chronicCareStatus: 'Atención',
      proactiveStatus: ProactivePatientStatus.ATTENTION,
      proactiveMessage: 'Paciente crónico sin tratamientos activos registrados. Considere añadir uno.',
      actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE,
      allergies: [],
    },
    { 
      id: 'P003', 
      name: 'Benjamín Soto', 
      rut: '20.123.456-7', 
      email: 'benjamin.soto@example.com', 
      phone: '+56911122233', 
      isChronic: false, 
      chronicCareStatus: 'OK',
      proactiveStatus: ProactivePatientStatus.OK,
      proactiveMessage: 'Paciente no crónico. Gestión manual.',
      actionNeeded: PatientActionNeeded.CREATE_NEW_RECIPE,
      allergies: [],
    },
    { 
      id: 'P004', 
      name: 'Diego Muñoz', 
      rut: '18.555.444-1', 
      email: 'diego.munoz@example.com', 
      phone: '+56955544411', 
      isChronic: true, 
      chronicCareStatus: 'Urgente',
      proactiveStatus: ProactivePatientStatus.URGENT,
      proactiveMessage: 'Dispensación de ciclo crónico atrasada por 5 días. Contactar urgentemente.',
      actionNeeded: PatientActionNeeded.REPREPARE_CYCLE,
      allergies: ['Aspirina', 'Ibuprofeno'],
    },
  ];

  const doctors: Doctor[] = [
    { id: 'D001', name: 'Dr. Ricardo Pérez', specialty: 'Dermatología', email: 'r.perez@med.cl', phone: '+5621234567' },
    { id: 'D002', name: 'Dra. Sofía López', specialty: 'Medicina General', email: 's.lopez@med.cl', phone: '+5627654321' },
  ];

  const externalPharmacies: ExternalPharmacy[] = [
    { id: 'EP001', name: 'Recetario Central', contactPerson: 'Juan Valdés', email: 'contacto@central.cl', phone: '22-123-4567' },
    { id: 'EP002', name: 'Farmacias Magistrales S.A.', contactPerson: 'Ana Reyes', email: 'ana.reyes@farma.com', phone: '22-987-6543' },
    { id: 'EP003', name: 'Tu Fórmula', contactPerson: 'Pedro Pascal', email: 'ppascal@tuformula.cl', phone: '22-555-1234' },
  ];

  const inventory: InventoryItem[] = [
    { 
      id: 'I001', name: 'Minoxidil', stock: 500, unit: 'g', lowStockThreshold: 100, 
      barcode: 'SKOL-MINOX-G', 
      lots: [
        { lotNumber: 'M202401A', quantity: 200, expiryDate: '2025-12-31'},
        { lotNumber: 'M202404B', quantity: 300, expiryDate: '2026-03-31'},
      ] 
    },
    { 
      id: 'I002', name: 'Crema Base Hidrófila', stock: 2000, unit: 'g', lowStockThreshold: 500,
      barcode: 'SKOL-CREAM-H-G',
      lots: [
        { lotNumber: 'CBH-2023-12', quantity: 2000, expiryDate: '2024-12-31' }
      ]
    },
    { 
      id: 'I003', name: 'Propranolol', stock: 1500, unit: 'cápsulas', lowStockThreshold: 500,
      barcode: 'SKOL-PROP-10MG-CAP',
      lots: [
        { lotNumber: 'PPL-A1', quantity: 500, expiryDate: '2025-08-31' },
        { lotNumber: 'PPL-A2', quantity: 1000, expiryDate: '2025-11-30' },
      ]
    },
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
      skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.PendingDispatch,
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
      skolSuppliedItemsDispatchStatus: SkolSuppliedItemsDispatchStatus.PendingDispatch,
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

  const dispatchNotes: DispatchNote[] = [];

  return { patients, doctors, inventory, recipes, users, roles, externalPharmacies, dispatchNotes };
}

    
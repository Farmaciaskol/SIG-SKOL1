import type { InventoryItem } from './types';

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'paracetamol-500',
    name: 'Paracetamol 500mg',
    activePrinciple: 'Paracetamol',
    sku: 'P-500',
    manufacturer: 'Laboratorio Chile',
    pharmaceuticalForm: 'Comprimido',
    doseValue: 500,
    doseUnit: 'mg',
    saleCondition: 'Receta Simple',
    itemsPerBaseUnit: 20,
    unit: 'caja',
    lowStockThreshold: 10,
    costPrice: 1000,
    salePrice: 1990,
    quantity: 50,
    lots: [
      {
        lotNumber: 'ABC-123',
        quantity: 20,
        expiryDate: new Date('2025-12-31').toISOString(),
      },
      {
        lotNumber: 'DEF-456',
        quantity: 30,
        expiryDate: new Date('2026-06-30').toISOString(),
      },
    ],
    isControlled: false,
    requiresRefrigeration: false,
    isBioequivalent: true,
    administrationRoute: 'Oral',
    atcCode: 'N02BE01',
    barcode: '7800010001234',
    location: 'Estante B-01',
    mainIndications: 'Analgésico y antipirético.',
    mainProvider: 'CENABAST',
    maxStock: 50,
    internalNotes: 'Producto de alta rotación.',
  },
];

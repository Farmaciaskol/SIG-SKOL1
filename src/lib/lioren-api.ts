
'use server';
import type { InventoryItem, LotDetail } from './types';

/**
 * ESTE ARCHIVO ES UNA SIMULACIÓN.
 * Aquí es donde se debe implementar la lógica real para conectarse a la API de Lioren.
 * Deberá manejar la autenticación (probablemente con una API Key en su archivo .env),
 * realizar las llamadas a los endpoints de inventario de Lioren y mapear
 * los datos recibidos al formato que utiliza la aplicación (el tipo `InventoryItem`).
 */


// Datos de ejemplo para simular la respuesta de la API de Lioren.
const MOCK_LIOREN_PRODUCTS = [
  {
    id: 'L-1001',
    name: 'Losartan Potásico 50mg',
    sku: 'F-12345',
    active_principle: 'Losartan Potásico',
    category: 'Cardiovascular',
    stock_total: 25,
    unit: 'caja',
    price: 3500,
    cost: 1800,
    is_controlled: false,
    lots: [
      { number: 'LOTE-A1', stock: 10, expiry: '2025-12-31T00:00:00.000Z' },
      { number: 'LOTE-A2', stock: 15, expiry: '2026-06-30T00:00:00.000Z' },
    ]
  },
  {
    id: 'L-1002',
    name: 'Clonazepam 2mg',
    sku: 'F-54321',
    active_principle: 'Clonazepam',
    category: 'Neurología',
    stock_total: 10,
    unit: 'caja',
    price: 4200,
    cost: 2100,
    is_controlled: true,
    controlled_type: 'Psicotrópico',
    lots: [
      { number: 'LOTE-B1', stock: 10, expiry: '2025-08-31T00:00:00.000Z' },
    ]
  },
  {
    id: 'L-1003',
    name: 'Paracetamol 500mg',
    sku: 'F-98765',
    active_principle: 'Paracetamol',
    category: 'Analgésicos',
    stock_total: 0,
    unit: 'caja',
    price: 1500,
    cost: 700,
    is_controlled: false,
    lots: []
  },
];

/**
 * Mapea un producto crudo de la API de Lioren a nuestro tipo interno InventoryItem.
 * Esta función deberá ser ajustada a la estructura de datos real de Lioren.
 * @param liorenProduct - El objeto de producto de la API de Lioren.
 * @returns Un objeto que conforma al tipo InventoryItem.
 */
function mapLiorenProductToInventoryItem(liorenProduct: any): InventoryItem {
  const lots: LotDetail[] = (liorenProduct.lots || []).map((lot: any) => ({
    lotNumber: lot.number,
    quantity: lot.stock,
    expiryDate: lot.expiry,
  }));

  return {
    id: liorenProduct.id,
    name: liorenProduct.name,
    activePrinciple: liorenProduct.active_principle,
    sku: liorenProduct.sku,
    quantity: liorenProduct.stock_total,
    unit: liorenProduct.unit,
    costPrice: liorenProduct.cost,
    salePrice: liorenProduct.price,
    isControlled: liorenProduct.is_controlled,
    controlledType: liorenProduct.controlled_type,
    lots: lots,
    // --- Campos que se deben mapear o definir valores por defecto ---
    manufacturer: 'Lioren',
    pharmaceuticalForm: 'Comprimido', // Debería venir de Lioren o tener un valor por defecto
    doseValue: 50, // Debería venir de Lioren
    doseUnit: 'mg', // Debería venir de Lioren
    itemsPerBaseUnit: 30, // Debería venir de Lioren
    saleCondition: 'Receta Simple', // Debería venir de Lioren
    lowStockThreshold: 5, // Podría ser un campo en Lioren o un valor por defecto
  };
}

/**
 * Simula la obtención del inventario desde la API de Lioren.
 * TODO: Reemplazar esta implementación con una llamada `fetch` real.
 * @returns Una promesa que resuelve a un array de InventoryItem.
 */
export async function fetchInventoryFromLioren(): Promise<InventoryItem[]> {
  console.log("Fetching inventory from MOCK Lioren API...");

  // EJEMPLO DE IMPLEMENTACIÓN REAL (DEBE SER ADAPTADO):
  /*
  try {
    const apiKey = process.env.LIOREN_API_KEY;
    if (!apiKey) {
      throw new Error("Lioren API key is not configured in .env");
    }
    
    const response = await fetch('https://api.lioren.cl/v1/productos', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`Lioren API responded with status: ${response.status}`);
    }

    const data = await response.json(); // Suponiendo que la respuesta es un JSON
    
    // Suponiendo que la API devuelve un objeto con una propiedad 'data' que es un array de productos
    if (data && Array.isArray(data.data)) {
        return data.data.map(mapLiorenProductToInventoryItem);
    } else {
        console.error("Unexpected data structure from Lioren API");
        return [];
    }
  } catch (error) {
    console.error("Failed to fetch from real Lioren API:", error);
    // Podrías devolver un array vacío o lanzar el error para que el llamador lo maneje
    return [];
  }
  */

  // Devolvemos datos de ejemplo por ahora.
  await new Promise(resolve => setTimeout(resolve, 500)); // Simular retraso de red
  return MOCK_LIOREN_PRODUCTS.map(mapLiorenProductToInventoryItem);
}

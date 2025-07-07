'use server';
import type { InventoryItem, LotDetail } from './types';

/**
 * ESTE ARCHIVO ES PARA CONECTARSE A LA API DE LIOREN.
 * Utiliza la API Key del archivo .env para autenticarse y obtener los datos de inventario.
 * La función `fetchInventoryFromLioren` es la principal exportación.
 */


/**
 * Mapea un producto crudo de la API de Lioren a nuestro tipo interno InventoryItem.
 * Esta función deberá ser ajustada si la estructura de datos real de Lioren cambia.
 * @param liorenProduct - El objeto de producto de la API de Lioren.
 * @returns Un objeto que conforma al tipo InventoryItem.
 */
function mapLiorenProductToInventoryItem(liorenProduct: any): InventoryItem {
  const lots: LotDetail[] = (liorenProduct.lots || []).map((lot: any) => ({
    lotNumber: lot.number,
    quantity: lot.stock || 0,
    expiryDate: lot.expiry,
  }));

  // Estos son campos que nuestra app necesita pero que no sabemos si vienen de Lioren.
  // Se han establecido valores por defecto que pueden necesitar ser ajustados o mapeados
  // desde campos reales de Lioren si existen.
  const defaults = {
    manufacturer: 'Lioren',
    pharmaceuticalForm: 'Comprimido',
    doseValue: 0,
    doseUnit: 'mg',
    itemsPerBaseUnit: 1,
    saleCondition: 'Receta Simple',
    lowStockThreshold: 5,
    barcode: liorenProduct.sku || '',
    requiresRefrigeration: false,
  };

  return {
    id: String(liorenProduct.id),
    name: liorenProduct.name,
    activePrinciple: liorenProduct.active_principle || 'N/A',
    sku: liorenProduct.sku,
    quantity: liorenProduct.stock_total || 0,
    unit: liorenProduct.unit,
    costPrice: liorenProduct.cost || 0,
    salePrice: liorenProduct.price || 0,
    isControlled: liorenProduct.is_controlled || false,
    controlledType: liorenProduct.controlled_type,
    lots: lots,
    ...defaults,
  };
}

/**
 * Obtiene el inventario desde la API de Lioren.
 * @returns Una promesa que resuelve a un array de InventoryItem.
 */
export async function fetchInventoryFromLioren(): Promise<InventoryItem[]> {
  const apiKey = process.env.LIOREN_API_KEY;
  if (!apiKey) {
    console.error("Lioren API key is not configured in .env. Falling back to empty inventory.");
    return [];
  }

  try {
    const response = await fetch('https://api.lioren.cl/v1/productos', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Lioren API responded with status: ${response.status}`, errorBody);
        throw new Error(`Lioren API responded with status: ${response.status}`);
    }

    // La API de Lioren devuelve un objeto con la llave "data" que contiene el arreglo de productos.
    const responseData = await response.json(); 
    
    if (responseData && Array.isArray(responseData.data)) {
        return responseData.data.map(mapLiorenProductToInventoryItem);
    } else {
        console.error("Unexpected data structure from Lioren API. Expected an object with a 'data' array.", responseData);
        return [];
    }
  } catch (error) {
    console.error("Failed to fetch from real Lioren API:", error);
    // En caso de error, devolvemos un array vacío para no romper la aplicación.
    return [];
  }
}

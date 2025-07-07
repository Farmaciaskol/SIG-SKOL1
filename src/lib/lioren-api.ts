'use server';
import type { InventoryItem } from './types';

/**
 * ESTE ARCHIVO ESTÁ DISEÑADO PARA CONECTARSE A LA API DE LIOREN.
 * La integración ha sido temporalmente deshabilitada.
 * Cuando esté listo para integrar, modifique esta función para que
 * realice la llamada a la API real y mapee los datos.
 */
export async function fetchInventoryFromLioren(): Promise<InventoryItem[]> {
  // Devolvemos un array vacío para desactivar la integración temporalmente.
  return [];
}

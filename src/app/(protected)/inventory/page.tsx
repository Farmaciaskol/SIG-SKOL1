import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchLiorenInventory } from '@/lib/lioren-api';
import type { LiorenProduct } from '@/lib/types';

export default async function InventoryPage() {
  const inventory = await getInventory();
  let liorenInventory: LiorenProduct[] = [];
  let liorenError: string | null = null;
  
  try {
    liorenInventory = await fetchLiorenInventory();
  } catch (error) {
    console.error("Lioren fetch failed:", error);
    liorenError = error instanceof Error ? error.message : "Error de conexión con Lioren.";
  }

  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} liorenError={liorenError} />;
}

import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchLiorenInventory, type LiorenProduct } from '@/lib/lioren-api';

export default async function InventoryPage() {
  let liorenInventory: LiorenProduct[] = [];
  let liorenError: string | null = null;
  
  try {
    liorenInventory = await fetchLiorenInventory();
  } catch(error) {
    console.error("Failed to fetch Lioren inventory on page:", error);
    liorenError = error instanceof Error ? error.message : "Error desconocido al conectar con Lioren.";
  }

  const inventory = await getInventory();
  
  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} liorenError={liorenError} />;
}

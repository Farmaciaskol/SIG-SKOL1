import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchLiorenInventory } from '@/lib/lioren-api';

export default async function InventoryPage() {
  const { products: liorenInventory, error: liorenError } = await fetchLiorenInventory();
  
  const inventory = await getInventory();
  
  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} liorenError={liorenError} />;
}

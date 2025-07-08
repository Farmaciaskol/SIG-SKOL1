import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchAllRawInventoryFromLioren } from '@/lib/lioren-api';

export default async function InventoryPage() {
  const [inventory, liorenInventory] = await Promise.all([
    getInventory(),
    fetchAllRawInventoryFromLioren(),
  ]);

  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} />;
}

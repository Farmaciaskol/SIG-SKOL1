import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchLiorenInventory } from '@/lib/lioren-api';

export default async function InventoryPage() {
  const [inventory, liorenInventory] = await Promise.all([
    getInventory(),
    fetchLiorenInventory(),
  ]);

  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} />;
}

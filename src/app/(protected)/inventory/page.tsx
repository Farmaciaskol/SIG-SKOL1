import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchRawInventoryFromLioren } from '@/lib/lioren-api';

export default async function InventoryPage() {
  const [inventory, liorenInventory] = await Promise.all([
    getInventory(),
    fetchRawInventoryFromLioren(),
  ]);

  return <InventoryClient initialInventory={inventory} initialLiorenInventory={liorenInventory} />;
}

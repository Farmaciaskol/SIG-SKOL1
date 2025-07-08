import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';

export default async function InventoryPage() {
  const inventory = await getInventory();
  
  return <InventoryClient initialInventory={inventory} />;
}

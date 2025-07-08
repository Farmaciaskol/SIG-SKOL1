
import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { getPatients } from '@/lib/data';

export default async function InventoryPage() {
  const [initialInventory, patients] = await Promise.all([
    getInventory(),
    getPatients(),
  ]);

  return (
    <InventoryClient
      initialInventory={initialInventory}
      patients={patients}
    />
  );
}

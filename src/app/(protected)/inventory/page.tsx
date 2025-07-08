import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory, getPatients } from '@/lib/data';

export default async function InventoryPage() {
  // Only fetch local data initially. Lioren data will be fetched on demand by the client.
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

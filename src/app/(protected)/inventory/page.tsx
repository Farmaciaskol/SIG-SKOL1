import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import { fetchLiorenInventory } from '@/lib/lioren-api';
import { getPatients } from '@/lib/data';

export default async function InventoryPage() {
  const [initialInventory, liorenData, patients] = await Promise.all([
    getInventory(),
    fetchLiorenInventory(),
    getPatients(),
  ]);

  return (
    <InventoryClient
      initialInventory={initialInventory}
      liorenData={liorenData}
      patients={patients}
    />
  );
}

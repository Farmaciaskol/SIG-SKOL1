import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory, getPatients } from '@/lib/data';
import { fetchLiorenInventory } from '@/lib/lioren-api';

export default async function InventoryPage() {
  const [initialInventory, patients, liorenData] = await Promise.all([
    getInventory(),
    getPatients(),
    fetchLiorenInventory(),
  ]);

  return (
    <InventoryClient
      initialInventory={initialInventory}
      patients={patients}
      liorenProducts={liorenData.products}
      liorenError={liorenData.error}
    />
  );
}

import { InventoryClient } from '@/components/app/inventory-client';
import { getInventory } from '@/lib/data';
import type { LiorenProduct } from '@/lib/types';

export default async function InventoryPage() {
  const inventory = await getInventory();
  // Lioren API call temporarily disabled for testing.
  const liorenInventory: LiorenProduct[] = [];
  const liorenError: string | null = "Conexión con Lioren desactivada para pruebas.";
  
  return <InventoryClient initialInventory={inventory} liorenInventory={liorenInventory} liorenError={liorenError} />;
}

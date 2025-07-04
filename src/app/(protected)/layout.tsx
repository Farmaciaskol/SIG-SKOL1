import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';
import { getRecipes, getInventory } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [recipes, inventory] = await Promise.all([
    getRecipes(),
    getInventory(),
  ]);

  const portalInboxCount = recipes.filter(r => r.status === RecipeStatus.PendingReviewPortal).length;
  
  const itemsToDispatchCount = recipes.filter(
    r => r.status === RecipeStatus.Validated && r.supplySource === 'Insumos de Skol'
  ).length;

  const lowStockCount = inventory.filter(i => i.quantity < i.lowStockThreshold).length;

  return (
      <AuthProvider>
        <MainNav 
          portalInboxCount={portalInboxCount}
          itemsToDispatchCount={itemsToDispatchCount}
          lowStockCount={lowStockCount}
        >
          {children}
        </MainNav>
      </AuthProvider>
  );
}

import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';
import { getRecipes, getInventory, getAllMessages } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [recipes, inventory, allMessages] = await Promise.all([
    getRecipes(),
    getInventory(),
    getAllMessages(),
  ]);

  const portalInboxCount = recipes.filter(r => r.status === RecipeStatus.PendingReviewPortal).length;
  
  const itemsToDispatchCount = recipes.filter(
    r => r.status === RecipeStatus.Validated && r.supplySource === 'Insumos de Skol'
  ).length;

  const lowStockCount = inventory.filter(i => i.quantity < i.lowStockThreshold).length;

  const unreadMessagesCount = allMessages.filter(m => m.sender === 'patient' && !m.read).length;

  return (
      <AuthProvider>
        <MainNav 
          portalInboxCount={portalInboxCount}
          itemsToDispatchCount={itemsToDispatchCount}
          lowStockCount={lowStockCount}
          unreadMessagesCount={unreadMessagesCount}
        >
          {children}
        </MainNav>
      </AuthProvider>
  );
}

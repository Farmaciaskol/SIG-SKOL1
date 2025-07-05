import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';
import { getRecipesCountByStatus, getItemsToDispatchCount, getLowStockInventoryCount, getUnreadPatientMessagesCount } from '@/lib/data';
import { RecipeStatus } from '@/lib/types';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [portalInboxCount, itemsToDispatchCount, lowStockCount, unreadMessagesCount] = await Promise.all([
    getRecipesCountByStatus(RecipeStatus.PendingReviewPortal),
    getItemsToDispatchCount(),
    getLowStockInventoryCount(),
    getUnreadPatientMessagesCount(),
  ]);

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

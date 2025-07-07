
import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';
import { getPendingPortalItemsCount, getLowStockInventoryCount, getUnreadPatientMessagesCount, getItemsToDispatchCount } from '@/lib/data';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [portalInboxCount, lowStockCount, unreadMessagesCount, itemsToDispatchCount] = await Promise.all([
    getPendingPortalItemsCount(),
    getLowStockInventoryCount(),
    getUnreadPatientMessagesCount(),
    getItemsToDispatchCount(),
  ]);

  return (
      <AuthProvider>
        <MainNav 
          portalInboxCount={portalInboxCount}
          lowStockCount={lowStockCount}
          unreadMessagesCount={unreadMessagesCount}
          itemsToDispatchCount={itemsToDispatchCount}
        >
          {children}
        </MainNav>
      </AuthProvider>
  );
}


import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';
import { getPendingPortalItemsCount, getLowStockInventoryCount, getUnreadPatientMessagesCount } from '@/lib/data';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [portalInboxCount, lowStockCount, unreadMessagesCount] = await Promise.all([
    getPendingPortalItemsCount(),
    getLowStockInventoryCount(),
    getUnreadPatientMessagesCount(),
  ]);

  return (
      <AuthProvider>
        <MainNav 
          portalInboxCount={portalInboxCount}
          lowStockCount={lowStockCount}
          unreadMessagesCount={unreadMessagesCount}
          itemsToDispatchCount={0} // Placeholder, will be restored
        >
          {children}
        </MainNav>
      </AuthProvider>
  );
}

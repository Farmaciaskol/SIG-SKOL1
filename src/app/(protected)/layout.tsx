import { MainNav } from '@/components/app/main-nav';
import { AuthProvider } from '@/components/app/auth-provider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
        <MainNav>
          {children}
        </MainNav>
      </AuthProvider>
  );
}

import { MainNav } from '@/components/app/main-nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
      <MainNav>
        {children}
      </MainNav>
  );
}

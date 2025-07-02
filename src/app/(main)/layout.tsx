import { MainNav } from '@/components/app/main-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <MainNav>
        {children}
      </MainNav>
  );
}

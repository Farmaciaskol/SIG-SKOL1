'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ClipboardList, FlaskConical, HeartPulse, LayoutDashboard, Settings, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recipes', label: 'Recetas', icon: ClipboardList },
  { href: '/patients', label: 'Pacientes', icon: Users },
  { href: '/chronic-care', label: 'Cuidado Crónico', icon: HeartPulse },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 justify-center">
            <FlaskConical className="w-8 h-8 text-primary" />
            <h1 className="font-headline text-2xl font-bold text-center truncate group-data-[collapsible=icon]:hidden">
              Skol
            </h1>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{
                    children: item.label,
                    className: 'group-data-[collapsible=icon]:block hidden',
                  }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
                <h1 className="font-headline text-lg font-semibold">Sistema de Gestión Skol</h1>
            </div>
        </header>
        {props.children}
      </main>
    </div>
  );
}

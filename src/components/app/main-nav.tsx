'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  BriefcaseMedical,
  Warehouse,
  Box,
  Truck,
  ShieldAlert,
  Lock,
  CreditCard,
  BarChart2,
  UserCog,
  Settings,
  UserSquare,
  LogOut,
  MoreHorizontal,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import React from 'react';
import { Separator } from '../ui/separator';

const menuGroups = [
    {
      title: 'PRINCIPAL',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/recipes', label: 'Recetas', icon: FileText },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        { href: '/patients', label: 'Pacientes', icon: Users },
        { href: '/doctors', label: 'Médicos', icon: BriefcaseMedical },
        { href: '/external-prescriptions', label: 'Recetarios Ext.', icon: Warehouse },
      ],
    },
    {
      title: 'OPERACIONES',
      items: [
        { href: '/inventory', label: 'Inventario Skol', icon: Warehouse },
        { href: '/monthly-dispensing', label: 'Dispensación Mensual', icon: Box },
        { href: '/dispatch-management', label: 'Gestión Despachos', icon: Truck },
        { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: ShieldAlert },
        { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { href: '/financial-management', label: 'Gestión Financiera', icon: CreditCard },
        { href: '/reports', label: 'Reportes', icon: BarChart2 },
        { href: '/user-management', label: 'Gestión Usuarios', icon: UserCog },
        { href: '/settings', label: 'Configuración', icon: Settings },
      ],
    },
];

const bottomMenuItems = [
    { href: '/patient-portal', label: 'Portal de Pacientes', icon: UserSquare },
];


export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  
  const defaultOpenGroup = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title || 'PRINCIPAL';
  const [openItems, setOpenItems] = React.useState([defaultOpenGroup]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  React.useEffect(() => {
    const activeGroup = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title;
    if (activeGroup && !openItems.includes(activeGroup)) {
      setOpenItems(prev => [...prev, activeGroup]);
    }
  }, [pathname, openItems]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="border-r bg-card">
          <SidebarHeader className="p-4 justify-center">
            <div className="w-full px-4 group-data-[collapsible=icon]:hidden">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                alt="Skol Pharmacy Logo"
                width={140}
                height={40}
                className="mx-auto"
                priority
              />
            </div>
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
              alt="Skol Pharmacy Logo"
              width={32}
              height={32}
              className="hidden group-data-[collapsible=icon]:block"
              priority
            />
          </SidebarHeader>
          <SidebarContent className="p-0 flex-1">
            <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full px-4">
              {menuGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="border-b-0">
                  <div className="relative">
                     {openItems.includes(group.title) && <div className="absolute left-[-16px] top-2 bottom-2 w-1 bg-accent rounded-full group-data-[collapsible=icon]:hidden" />}
                    <AccordionTrigger
                      className="py-2 px-0 hover:no-underline hover:bg-transparent rounded-none text-foreground/60 font-semibold text-xs justify-start"
                    >
                      <div className="flex-1 text-left tracking-wider uppercase">{group.title}</div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="pl-2 pt-1 pb-1">
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.href)}
                            className={cn(
                                "justify-start font-normal text-sm text-foreground",
                                pathname.startsWith(item.href) ? "bg-accent text-primary-foreground hover:bg-accent hover:text-primary-foreground font-semibold" : "hover:bg-accent/90 hover:text-primary-foreground"
                            )}
                          >
                            <Link href={item.href}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SidebarContent>
           <SidebarFooter className="mt-auto border-t p-4 space-y-4">
             <SidebarMenu className="px-0">
                {bottomMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.href)}
                           className={cn(
                                "justify-start font-normal text-sm text-foreground",
                                pathname.startsWith(item.href) ? "bg-accent text-primary-foreground hover:bg-accent hover:text-primary-foreground font-semibold" : "hover:bg-accent/90 hover:text-primary-foreground"
                            )}
                        >
                        <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
            <Separator className="bg-border/60" />
             {user && (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold text-foreground truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-muted-foreground">Administrador</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 group-data-[collapsible=icon]:hidden">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="end" side="top">
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
          </header>
          {props.children}
        </main>
      </div>
    </SidebarProvider>
  );
}

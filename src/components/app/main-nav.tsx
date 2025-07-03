

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Warehouse,
  Truck,
  ShieldAlert,
  Lock,
  BarChart2,
  UserCog,
  Settings,
  UserSquare,
  LogOut,
  MoreHorizontal,
  Wand2,
  Stethoscope,
  Building2,
  Package,
  CalendarDays,
  DollarSign,
  Inbox,
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
      title: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/portal-inbox', label: 'Bandeja Portal', icon: Inbox },
        { href: '/recipes', label: 'Recetas', icon: FileText },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { href: '/patients', label: 'Pacientes', icon: Users },
        { href: '/doctors', label: 'Médicos', icon: Stethoscope },
        { href: '/external-prescriptions', label: 'Recetarios', icon: Building2 },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: '/inventory', label: 'Inventario Skol', icon: Package },
        { href: '/monthly-dispensing', label: 'Dispensación Mensual', icon: CalendarDays },
        { href: '/dispatch-management', label: 'Gestión Despachos', icon: Truck },
        { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: ShieldAlert },
        { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
        { href: '/simplify-instructions', label: 'Simplificar Indicaciones', icon: Wand2 },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/financial-management', label: 'Gestión Financiera', icon: DollarSign },
        { href: '/reports', label: 'Reportes', icon: BarChart2 },
        { href: '/user-management', label: 'Gestión Usuarios', icon: UserCog },
        { href: '/settings', label: 'Configuración', icon: Settings },
      ],
    },
];

const bottomMenuItems = [
    { href: '/patient-portal/login', label: 'Portal de Pacientes', icon: UserSquare },
];


export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  
  const defaultOpenGroup = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title || 'Principal';
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
                  <AccordionTrigger
                    className="py-2 px-0 hover:no-underline hover:bg-transparent rounded-none text-foreground/60 font-semibold text-xs justify-start gap-1 capitalize data-[state=open]:text-primary"
                  >
                    <span className="tracking-wider">{group.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-2 pt-1 pb-1">
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.href)}
                            className={cn(
                                "justify-start font-normal text-sm",
                                pathname.startsWith(item.href) ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold" : "text-foreground hover:bg-accent hover:text-accent-foreground"
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
                                "justify-start font-normal text-sm",
                                pathname.startsWith(item.href) ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold" : "text-foreground hover:bg-accent hover:text-accent-foreground"
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
        <main className="flex-1 w-full overflow-y-auto">
          <header className="md:hidden flex h-14 items-center gap-4 bg-background px-6 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <div className="w-full px-6 md:px-8 py-8">
            {props.children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

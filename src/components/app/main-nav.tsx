'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BriefcaseMedical,
  FileText,
  Warehouse,
  CalendarClock,
  Truck,
  ShieldAlert,
  Lock,
  Landmark,
  BarChart2,
  UsersCog,
  Settings,
  UserSquare,
  LogOut,
  ChevronUp
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import React from 'react';

const menuGroups = [
    {
      title: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/recipes', label: 'Recetas', icon: ClipboardList },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { href: '/patients', label: 'Pacientes', icon: Users },
        { href: '/doctors', label: 'Médicos', icon: BriefcaseMedical },
        { href: '/external-prescriptions', label: 'Recetarios Ext.', icon: FileText },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: '/inventory', label: 'Inventario Skol', icon: Warehouse },
        { href: '/monthly-dispensing', label: 'Dispensación Mensual', icon: CalendarClock },
        { href: '/dispatch-management', label: 'Gestión Despachos', icon: Truck },
        { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: ShieldAlert },
        { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/financial-management', label: 'Gestión Financiera', icon: Landmark },
        { href: '/reports', label: 'Reportes', icon: BarChart2 },
        { href: '/user-management', label: 'Gestión Usuarios', icon: UsersCog },
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
  const [openItems, setOpenItems] = React.useState(['Principal']);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-4 justify-center">
            <div className="w-full px-4 group-data-[collapsible=icon]:hidden">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
                alt="Skol Pharmacy Logo"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=78ea6257-ea42-4127-8fe0-a0e4839132f5"
              alt="Skol Pharmacy Logo"
              width={32}
              height={32}
              className="hidden group-data-[collapsible=icon]:block"
            />
          </SidebarHeader>
          <SidebarContent>
            <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full px-2">
              {menuGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="border-b-0">
                  <div className="relative">
                     {openItems.includes(group.title) && <div className="absolute left-[-8px] top-2 bottom-2 w-1 bg-accent rounded-full" />}
                    <AccordionTrigger
                      className="py-2 px-2 hover:no-underline hover:bg-muted rounded-md text-foreground/80 font-semibold text-sm justify-start [&[data-state=open]>svg]:rotate-0"
                    >
                      <div className="flex-1 text-left">{group.title}</div>
                      <ChevronUp className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="pl-4 pt-1 pb-1">
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            className={cn(
                                "justify-start",
                                pathname === item.href && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
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
           <SidebarFooter className="mt-auto border-t">
             <SidebarMenu>
                {bottomMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        className={cn(
                            "justify-start",
                            pathname === item.href && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
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
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              <h1 className="font-headline text-lg font-semibold">Sistema de Gestión Skol</h1>
            </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Sesión iniciada</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>
          {props.children}
        </main>
      </div>
    </SidebarProvider>
  );
}

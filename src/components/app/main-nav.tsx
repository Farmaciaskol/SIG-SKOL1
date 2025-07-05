
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Truck,
  ShieldAlert,
  Lock,
  BarChart2,
  UserCog,
  Settings,
  LogOut,
  Wand2,
  Stethoscope,
  Building2,
  Package,
  CalendarDays,
  DollarSign,
  Inbox,
  Bell,
  User,
  MessageSquare,
  FlaskConical,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
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
import { Badge } from '../ui/badge';
import { getAvatar } from '@/components/app/predefined-avatars';
import { getUsers } from '@/lib/data';
import { User as AppUser } from '@/lib/types';
import { CommandPalette } from './command-palette';


const menuGroups = [
    {
      title: 'Principal',
      icon: LayoutDashboard,
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/portal-inbox', label: 'Bandeja Portal', icon: Inbox },
        { href: '/recipes', label: 'Recetas', icon: FileText },
      ],
    },
    {
      title: 'Gestión',
      icon: Users,
      items: [
        { href: '/patients', label: 'Pacientes', icon: Users },
        { href: '/doctors', label: 'Médicos', icon: Stethoscope },
        { href: '/external-prescriptions', label: 'Recetarios', icon: Building2 },
      ],
    },
    {
      title: 'Operaciones',
      icon: FlaskConical,
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
      icon: Settings,
      items: [
        { href: '/financial-management', label: 'Gestión Financiera', icon: DollarSign },
        { href: '/reports', label: 'Reportes', icon: BarChart2 },
        { href: '/user-management', label: 'Gestión Usuarios', icon: UserCog },
        { href: '/settings', label: 'Configuración', icon: Settings },
      ],
    },
];

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  portalInboxCount: number;
  itemsToDispatchCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
}

function AlertsBell({ portalInboxCount, itemsToDispatchCount, lowStockCount }: Omit<MainNavProps, keyof React.HTMLAttributes<HTMLElement> | 'unreadMessagesCount'>) {
  const totalAlerts = portalInboxCount + itemsToDispatchCount + lowStockCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0">
              {totalAlerts}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Alertas y Tareas Pendientes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {totalAlerts > 0 ? (
          <>
            {portalInboxCount > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/portal-inbox" className="flex justify-between items-center cursor-pointer">
                  <span>Nuevas Recetas del Portal</span>
                  <Badge>{portalInboxCount}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
            {itemsToDispatchCount > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/dispatch-management" className="flex justify-between items-center cursor-pointer">
                  <span>Insumos por Despachar</span>
                  <Badge>{itemsToDispatchCount}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
            {lowStockCount > 0 && (
              <DropdownMenuItem asChild>
                <Link href="/inventory" className="flex justify-between items-center cursor-pointer">
                  <span>Productos con Stock Bajo</span>
                  <Badge variant="secondary">{lowStockCount}</Badge>
                </Link>
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <DropdownMenuItem disabled>
            <p className="text-sm text-muted-foreground p-2">No hay notificaciones nuevas.</p>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PlaceholderUserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="9" r="4" />
    <path d="M12 14c-3.866 0-7 3.134-7 7v1h14v-1c0-3.866-3.134-7-7-7z" />
  </svg>
);


function MainNavContent({
  className,
  portalInboxCount,
  itemsToDispatchCount,
  lowStockCount,
  unreadMessagesCount,
  children,
  ...props
}: MainNavProps & { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const { state, toggleSidebar } = useSidebar();
  
  const defaultOpenGroup = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title || 'Principal';
  const [openItems, setOpenItems] = React.useState([defaultOpenGroup]);

  const fetchAppUser = React.useCallback(async () => {
    if (user?.email) {
      const allUsers = await getUsers();
      const foundUser = allUsers.find(u => u.email === user.email);
      setAppUser(foundUser || null);
    }
  }, [user]);

  React.useEffect(() => {
    fetchAppUser();

    const handleProfileUpdate = () => {
      fetchAppUser();
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, [fetchAppUser]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  React.useEffect(() => {
    const activeGroup = menuGroups.find(group => group.items.some(item => pathname.startsWith(item.href)))?.title;
    if (activeGroup && !openItems.includes(activeGroup)) {
      setOpenItems(prev => [...prev, activeGroup]);
    }
  }, [pathname, openItems]);

  const DisplayAvatar = appUser?.avatar 
    ? getAvatar(appUser.avatar) 
    : (
      <AvatarFallback className="bg-primary text-primary-foreground">
        <PlaceholderUserIcon className="h-5 w-5" />
      </AvatarFallback>
    );


  return (
    <div className="flex h-full w-full flex-col bg-background group/sidebar" data-state={state}>
      {/* === HEADER === */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        {/* Header Left Side */}
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full hidden md:flex"
                onClick={toggleSidebar}
            >
                <ChevronLeft
                    className={cn(
                        'h-5 w-5 transition-transform duration-300 ease-in-out',
                        state === 'collapsed' && 'rotate-180'
                    )}
                />
                <span className="sr-only">Toggle sidebar</span>
            </Button>
            
            <Link href="/dashboard" className="block">
                <div className="relative h-10 w-32 flex items-center">
                    {/* Full Logo: visible when expanded */}
                    <Image
                        src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=1a612d04-0f27-4317-bfd6-06b48f019a24"
                        alt="Skol Pharmacy Logo"
                        width={120}
                        height={33}
                        className="object-contain h-full w-auto transition-opacity duration-300 group-data-[state=collapsed]:opacity-0"
                        priority
                    />
                    {/* Imagotipo: visible when collapsed */}
                    <Image
                        src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/IMAGOTIPO_IMAGOTIPO%20FONDO%20-04_IMAGOTIPO%20BLANCO_IMAGOTIPO%20AZUL.png?alt=media&token=746abbd3-b1d7-4abc-80c4-d8125cf78fa2"
                        alt="Skol Pharmacy Imagotipo"
                        width={36}
                        height={36}
                        className="absolute left-0 top-1/2 -translate-y-1/2 object-contain h-9 w-9 transition-opacity duration-300 opacity-0 group-data-[state=collapsed]:opacity-100"
                        priority
                    />
                </div>
            </Link>

            <SidebarTrigger className="md:hidden" />
          </div>
        
        {/* Header Right Side */}
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
          <div className="w-full max-w-xs ml-auto">
            <CommandPalette />
          </div>
          <Button asChild variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
            <Link href="/messaging">
              <MessageSquare className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0">
                  {unreadMessagesCount}
                </Badge>
              )}
              <span className="sr-only">Mensajería</span>
            </Link>
          </Button>
          <AlertsBell 
            portalInboxCount={portalInboxCount} 
            itemsToDispatchCount={itemsToDispatchCount} 
            lowStockCount={lowStockCount} 
          />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {DisplayAvatar}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{appUser?.name || user.displayName || "Usuario"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* === MAIN CONTAINER (SIDEBAR + CONTENT) === */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar */}
        <Sidebar className="border-r bg-card" collapsible="icon">
          <SidebarContent className="p-0 flex-1 pt-4">
            <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full px-2">
              {menuGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="border-b-0">
                  <AccordionTrigger
                      className="py-2 px-2 hover:no-underline hover:bg-accent rounded-md text-foreground/80 data-[state=open]:text-primary data-[state=open]:bg-accent group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:px-0"
                  >
                    <div className="flex items-center gap-2">
                        <group.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{group.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-4 pt-1 pb-1">
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.startsWith(item.href)}
                            tooltip={item.label}
                            className={cn(pathname.startsWith(item.href) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                          >
                            <Link href={item.href}>
                              <item.icon className="h-4 w-4" />
                              <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                              {item.href === '/portal-inbox' && portalInboxCount > 0 && (
                                <Badge className="h-5 group-data-[collapsible=icon]:hidden">{portalInboxCount}</Badge>
                              )}
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
        </Sidebar>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MainNav(props: MainNavProps) {
  return (
    <SidebarProvider>
      <MainNavContent {...props}>{props.children}</MainNavContent>
    </SidebarProvider>
  )
}


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
  Lock,
  BarChart2,
  Settings,
  LogOut,
  CalendarDays,
  Inbox,
  Bell,
  User,
  MessageSquare,
  ChevronLeft,
  BriefcaseMedical,
  FlaskConical,
  Boxes,
  HeartPulse,
  Banknote,
  Menu,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarProvider,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import React from 'react';
import { Badge } from '../ui/badge';
import { getAvatar } from '@/components/app/predefined-avatars';
import { User as AppUser } from '@/lib/types';
import { CommandPalette } from './command-palette';
import { getUsers } from '@/lib/data';

const menuGroups = [
    {
      title: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/portal-inbox', label: 'Portal', icon: Inbox },
        { href: '/recipes', label: 'Recetas', icon: FileText },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { href: '/patients', label: 'Pacientes', icon: Users },
        { href: '/doctors', label: 'Médicos', icon: BriefcaseMedical },
        { href: '/external-prescriptions', label: 'Recetarios', icon: FlaskConical },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: '/inventory', label: 'Inventario', icon: Boxes },
        { href: '/monthly-dispensing', label: 'Dispensación', icon: CalendarDays },
        { href: '/dispatch-management', label: 'Despachos', icon: Truck },
        { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: HeartPulse },
        { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/financial-management', label: 'Finanzas', icon: Banknote },
        { href: '/reports', label: 'Reportes', icon: BarChart2 },
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

function AlertsBell({ itemsToDispatchCount, lowStockCount }: Omit<MainNavProps, keyof React.HTMLAttributes<HTMLElement> | 'unreadMessagesCount' | 'portalInboxCount'>) {
  const totalAlerts = itemsToDispatchCount + lowStockCount;

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
  const { state, toggleSidebar, isMobile } = useSidebar();
  
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

  const DisplayAvatar = appUser?.avatar 
    ? getAvatar(appUser.avatar) 
    : (
      <AvatarFallback className="bg-primary text-primary-foreground">
        <PlaceholderUserIcon className="h-5 w-5" />
      </AvatarFallback>
    );


  return (
    <div className="flex min-h-svh w-full bg-muted group/sidebar" data-state={state}>
      {/* Sidebar is now a direct child of the flex container */}
      <Sidebar className="bg-muted" collapsible="icon">
        <SidebarHeader className="h-16 flex items-center justify-center p-2">
          <Link href="/dashboard" className="block">
            <div className="relative h-10 w-32 flex items-center">
                {/* Full Logo: visible when expanded */}
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=1a612d04-0f27-4317-bfd6-06b48f019a24"
                    alt="Skol Pharmacy Logo"
                    width={120}
                    height={33}
                    className="object-contain h-full w-auto transition-opacity duration-300 group-data-[state=expanded]:opacity-100 group-data-[state=collapsed]:opacity-0"
                    priority
                />
                {/* Imagotipo: visible when collapsed */}
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/IMAGOTIPO_IMAGOTIPO%20FONDO%20-04_IMAGOTIPO%20BLANCO_IMAGOTIPO%20AZUL.png?alt=media&token=746abbd3-b1d7-4abc-80c4-d8125cf78fa2"
                    alt="Skol Pharmacy Imagotipo"
                    width={36}
                    height={36}
                    className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 object-contain h-9 w-9 transition-opacity duration-300 opacity-0 group-data-[state=collapsed]:opacity-100"
                    priority
                />
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2 flex-1">
          <div className="flex flex-col gap-0 group-data-[collapsible=icon]:gap-0">
            {menuGroups.map((group) => (
              <SidebarGroup key={group.title} className="p-0">
                <SidebarGroupLabel className="p-0 px-2 pb-1 font-normal text-xs uppercase">
                  {group.title}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href} className="p-0">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                        tooltip={item.label}
                        className={cn( (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && "bg-primary/10 text-primary hover:bg-primary/20")}
                      >
                        <Link href={item.href} className="flex items-center w-full">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1 ml-2 group-data-[collapsible=icon]:hidden">{item.label}</span>
                          {item.href === '/portal-inbox' && portalInboxCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full group-data-[collapsible=icon]:hidden">{portalInboxCount}</Badge>
                          )}
                          {item.href === '/inventory' && lowStockCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full group-data-[collapsible=icon]:hidden">{lowStockCount}</Badge>
                          )}
                          {item.href === '/dispatch-management' && itemsToDispatchCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full group-data-[collapsible=icon]:hidden">{itemsToDispatchCount}</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto">
            <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip="Toggle Sidebar"
                className="h-9 w-9 self-start justify-center rounded-full hover:bg-accent"
            >
                <ChevronLeft className="h-5 w-5 transition-transform duration-300 ease-in-out group-data-[state=collapsed]:rotate-180" />
                <span className="sr-only">Toggle Sidebar</span>
            </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      {/* Main content area wrapped in a new div */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        
        {/* === HEADER === */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between bg-muted px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={toggleSidebar}
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
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
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MainNav(props: MainNavProps & { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MainNavContent {...props}>{props.children}</MainNavContent>
    </SidebarProvider>
  )
}

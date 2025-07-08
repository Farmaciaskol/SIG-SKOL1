
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import React from 'react';
import { Badge } from '../ui/badge';
import { getAvatar } from '@/components/app/predefined-avatars';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User as AppUser } from '@/lib/types';
import { CommandPalette } from './command-palette';
import { getUsers } from '@/lib/data';

const menuGroups = [
    {
      title: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

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
    <div className="flex min-h-svh w-full bg-muted">
      <nav className={cn(
          "hidden md:flex flex-col gap-4 bg-muted p-2 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-[250px]" : "w-[72px]"
      )}>
        <div className={cn(
            "flex h-16 items-center",
            isSidebarOpen ? "px-4" : "px-3 justify-center"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/sgi-skol1.firebasestorage.app/o/LOGOTIPO%20FARMACIA%20SKOL_LOGO%20COLOR.png?alt=media&token=1a612d04-0f27-4317-bfd6-06b48f019a24"
                alt="Skol Pharmacy Logo"
                width={isSidebarOpen ? 120 : 32}
                height={isSidebarOpen ? 33 : 32}
                priority
                className="transition-all duration-300"
            />
          </Link>
        </div>
        <div className="flex-1 overflow-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="px-2 mb-2">
                <h3 className={cn(
                  "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 transition-opacity duration-300",
                  isSidebarOpen ? "opacity-100" : "opacity-0 text-center text-[10px]"
                )}>{isSidebarOpen ? group.title : ''}</h3>
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/5',
                        (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'bg-primary/10 text-primary font-semibold',
                        !isSidebarOpen && 'justify-center'
                      )}
                      title={isSidebarOpen ? '' : item.label}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className={cn(!isSidebarOpen && "hidden")}>{item.label}</span>
                       {item.href === '/inventory' && lowStockCount > 0 && (
                            <Badge variant="destructive" className={cn("ml-auto", !isSidebarOpen && "absolute top-1 right-1 h-2 w-2 p-0 justify-center")}>{isSidebarOpen ? lowStockCount : ''}</Badge>
                       )}
                       {item.href === '/dispatch-management' && itemsToDispatchCount > 0 && (
                            <Badge variant="destructive" className={cn("ml-auto", !isSidebarOpen && "absolute top-1 right-1 h-2 w-2 p-0 justify-center")}>{isSidebarOpen ? itemsToDispatchCount : ''}</Badge>
                       )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
        <div className="mt-auto p-2">
            <Button
                variant="ghost"
                className={cn("justify-start w-full", !isSidebarOpen && "justify-center")}
                onClick={toggleSidebar}
            >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", !isSidebarOpen && "rotate-180")} />
                <span className={cn("ml-2", !isSidebarOpen && "hidden")}>Cerrar Menú</span>
            </Button>
        </div>
      </nav>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 bg-muted px-6">
          <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
              >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Sidebar</span>
              </Button>
          </div>
          <div className="w-full max-w-md ml-auto">
             <CommandPalette />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                <Link href="/portal-inbox">
                    <Inbox className="h-5 w-5" />
                    {portalInboxCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0">
                            {portalInboxCount}
                        </Badge>
                    )}
                    <span className="sr-only">Portal Inbox</span>
                </Link>
            </Button>
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
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Configuración</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configuración</DialogTitle>
                        <DialogDescription>
                            Seleccione una sección para administrar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <DialogClose asChild>
                            <Link href="/settings" className="block">
                                <Card className="hover:bg-muted/50 transition-colors">
                                    <CardHeader className="flex flex-row items-center gap-4 p-4">
                                        <Settings className="h-6 w-6 text-primary"/>
                                        <div>
                                            <h3 className="font-semibold">General</h3>
                                            <p className="text-sm text-muted-foreground">Listas, parámetros y ajustes de la aplicación.</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </DialogClose>
                        <DialogClose asChild>
                            <Link href="/settings" className="block">
                                <Card className="hover:bg-muted/50 transition-colors">
                                     <CardHeader className="flex flex-row items-center gap-4 p-4">
                                        <Users className="h-6 w-6 text-primary"/>
                                        <div>
                                            <h3 className="font-semibold">Usuarios y Roles</h3>
                                            <p className="text-sm text-muted-foreground">Administre accesos y permisos del sistema.</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
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
        <main className="flex-1 p-6 md:p-8 overflow-auto bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MainNav(props: MainNavProps & { children: React.ReactNode }) {
  return (
      <MainNavContent {...props}>{props.children}</MainNavContent>
  )
}

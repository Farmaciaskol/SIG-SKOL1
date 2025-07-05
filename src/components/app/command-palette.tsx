'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  Stethoscope,
  LayoutDashboard,
  FlaskConical,
  Truck,
  ShieldAlert,
  Lock,
  Settings,
  UserCog,
  BarChart2,
  Search,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { getPatients, getDoctors, Patient, Doctor } from '@/lib/data';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const [patientsData, doctorsData] = await Promise.all([
          getPatients(),
          getDoctors(),
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
      };
      fetchData();
    }
  }, [open]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);
  
  const pages = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/recipes', label: 'Recetas', icon: FileText },
      { href: '/patients', label: 'Pacientes', icon: Users },
      { href: '/doctors', label: 'Médicos', icon: Stethoscope },
      { href: '/inventory', label: 'Inventario', icon: FlaskConical },
      { href: '/dispatch-management', label: 'Despachos', icon: Truck },
      { href: '/pharmacovigilance', label: 'Farmacovigilancia', icon: ShieldAlert },
      { href: '/controlled-drugs', label: 'Controlados', icon: Lock },
      { href: '/user-management', label: 'Usuarios', icon: UserCog },
      { href: '/reports', label: 'Reportes', icon: BarChart2 },
      { href: '/settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground w-full h-9 px-3 bg-muted rounded-md flex items-center justify-start shadow-none"
      >
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <span className="truncate">Buscar...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Escriba un comando o busque..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          
          <CommandGroup heading="Pacientes">
            {patients.map((patient) => (
              <CommandItem
                key={patient.id}
                value={`paciente ${patient.name} ${patient.rut}`}
                onSelect={() => {
                  runCommand(() => router.push(`/patients/${patient.id}`));
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{patient.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{patient.rut}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Médicos">
            {doctors.map((doctor) => (
              <CommandItem
                key={doctor.id}
                value={`doctor ${doctor.name} ${doctor.specialty}`}
                onSelect={() => {
                  runCommand(() => router.push(`/doctors/${doctor.id}`));
                }}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                <span>{doctor.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{doctor.specialty}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Páginas">
            {pages.map((page) => (
               <CommandItem
                key={page.href}
                value={page.label}
                onSelect={() => {
                  runCommand(() => router.push(page.href));
                }}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

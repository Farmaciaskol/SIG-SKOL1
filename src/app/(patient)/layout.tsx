
import { PatientAuthProvider } from "@/components/app/patient-auth-provider";

export default function PatientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientAuthProvider>
      {children}
    </PatientAuthProvider>
  );
}

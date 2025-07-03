
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface PatientAuthContextType {
  patient: Patient | null;
  loading: boolean;
  setPatient: (patient: Patient | null) => void;
  logout: () => void;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

const PATIENT_SESSION_KEY = 'patient-session-data';

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const setPatient = useCallback((newPatient: Patient | null) => {
    setPatientState(newPatient);
    if (newPatient) {
        try {
            sessionStorage.setItem(PATIENT_SESSION_KEY, JSON.stringify(newPatient));
        } catch (e) {
            console.error("Failed to save patient data to sessionStorage", e);
        }
    } else {
         try {
            sessionStorage.removeItem(PATIENT_SESSION_KEY);
        } catch (e) {
            console.error("Failed to remove patient data from sessionStorage", e);
        }
    }
  }, []);

  const logout = useCallback(() => {
    setPatient(null);
  }, [setPatient]);

  useEffect(() => {
    try {
        const storedPatient = sessionStorage.getItem(PATIENT_SESSION_KEY);
        if (storedPatient) {
            setPatientState(JSON.parse(storedPatient));
        }
    } catch (error) {
        console.error("Failed to initialize patient auth state from sessionStorage", error);
        logout();
    } finally {
        setLoading(false);
    }
  }, [logout]);
  
  const value = {
    patient,
    loading,
    setPatient,
    logout,
  };

  return (
    <PatientAuthContext.Provider value={value}>
      {loading ? (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
         </div>
      ) : children }
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  const context = useContext(PatientAuthContext);
  if (context === undefined) {
    throw new Error('usePatientAuth must be used within a PatientAuthProvider');
  }
  return context;
}


'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface PatientAuthContextType {
  patient: Patient | null;
  loading: boolean;
  setPatient: (patient: Patient | null) => void;
  logout: () => void;
  refreshPatient: (patientId: string) => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);
const PATIENT_SESSION_KEY = 'patient-session-data';

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth is not initialized.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated (either real or anonymous)
        // Now we can safely load the patient data
        try {
          const storedPatient = sessionStorage.getItem(PATIENT_SESSION_KEY);
          if (storedPatient) {
            setPatientState(JSON.parse(storedPatient));
          }
        } catch (error) {
          console.error("Failed to load patient from session storage", error);
        } finally {
          setLoading(false);
        }
      } else {
        // No user, sign in anonymously. onAuthStateChanged will run again once signed in.
        signInAnonymously(auth).catch(error => {
            console.error("Anonymous sign-in failed", error);
            // If sign-in fails, we should stop loading to avoid an infinite loop
            setLoading(false); 
        });
      }
    });

    return () => unsubscribe();
  }, []); // Run only once on mount

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
  
  const refreshPatient = useCallback(async (patientId: string) => {
    try {
      const { getPatient } = await import('@/lib/data');
      const updatedPatient = await getPatient(patientId);
      if (updatedPatient) {
        setPatient(updatedPatient);
      }
    } catch (error) {
      console.error("Failed to refresh patient data", error);
    }
  }, [setPatient]);


  const logout = useCallback(() => {
    setPatient(null);
  }, [setPatient]);

  const value = { patient, loading, setPatient, logout, refreshPatient };

  return (
    <PatientAuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : children}
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

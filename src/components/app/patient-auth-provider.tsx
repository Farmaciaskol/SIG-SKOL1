'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

interface PatientAuthContextType {
  patient: Patient | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  setPatient: (patient: Patient | null) => void;
  logout: () => void;
  refreshPatient: (patientId: string) => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);
const PATIENT_DATA_KEY = 'skol_patient_data';

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatientState] = useState<Patient | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth is not initialized.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is authenticated. We'll load patient data if it exists in session storage.
        // The login page is responsible for fetching and setting the initial patient data.
        const storedPatient = sessionStorage.getItem(PATIENT_DATA_KEY);
        if (storedPatient) {
          const parsedPatient = JSON.parse(storedPatient);
          // Make sure the logged-in user matches the stored patient data
          if (parsedPatient.email === user.email) {
            setPatientState(parsedPatient);
          } else {
             // Mismatch, clear stale data
             sessionStorage.removeItem(PATIENT_DATA_KEY);
             setPatientState(null);
          }
        }
      } else {
        // User is not authenticated, clear patient data.
        sessionStorage.removeItem(PATIENT_DATA_KEY);
        setPatientState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setPatient = useCallback((newPatient: Patient | null) => {
    setPatientState(newPatient);
    if (newPatient) {
      sessionStorage.setItem(PATIENT_DATA_KEY, JSON.stringify(newPatient));
    } else {
      sessionStorage.removeItem(PATIENT_DATA_KEY);
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

  const logout = useCallback(async () => {
    setPatient(null);
    if (auth) {
      await signOut(auth);
    }
  }, [setPatient]);

  const value = { patient, firebaseUser, loading, setPatient, logout, refreshPatient };

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

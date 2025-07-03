
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '@/lib/types';

interface PatientAuthContextType {
  patient: Patient | null;
  loading: boolean;
  setPatient: (patient: Patient) => void;
  logout: () => void;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

const PATIENT_KEY = 'patient-session-data';

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setPatientState(null);
    try {
        sessionStorage.removeItem(PATIENT_KEY);
    } catch (error) {
        console.error("Could not remove patient data from sessionStorage:", error);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedPatient = sessionStorage.getItem(PATIENT_KEY);
        if (storedPatient) {
          setPatientState(JSON.parse(storedPatient));
        }
      } catch (error) {
        console.error("Failed to parse patient data from sessionStorage", error);
        logout();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [logout]);
  
  const setPatient = (newPatient: Patient) => {
    try {
        sessionStorage.setItem(PATIENT_KEY, JSON.stringify(newPatient));
        setPatientState(newPatient);
    } catch (error) {
        console.error("Failed to save patient data to sessionStorage", error);
    }
  };

  const value = {
    patient,
    loading,
    setPatient,
    logout,
  };

  return (
    <PatientAuthContext.Provider value={value}>
      {children}
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

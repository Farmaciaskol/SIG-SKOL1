
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '@/lib/types';
import { validatePatientToken } from '@/lib/actions';

interface PatientAuthContextType {
  patient: Patient | null;
  token: string | null;
  loading: boolean;
  setTokenAndPatient: (token: string, patient: Patient) => void;
  logout: () => void;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'patient-auth-token';

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setPatient(null);
    setToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        const result = await validatePatientToken(storedToken);
        if (result.success && result.patient) {
          setPatient(result.patient);
        } else {
          logout(); // Token is invalid or expired
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [logout]);
  
  const setTokenAndPatient = (newToken: string, newPatient: Patient) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setPatient(newPatient);
  };

  const value = {
    patient,
    token,
    loading,
    setTokenAndPatient,
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

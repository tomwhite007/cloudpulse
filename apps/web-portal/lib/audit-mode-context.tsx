'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AuditMode = 'simulated' | 'live';

interface AuditModeContextValue {
  mode: AuditMode;
  setMode: (mode: AuditMode) => void;
  isSimulated: boolean;
}

const AuditModeContext = createContext<AuditModeContextValue | null>(null);

export function AuditModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AuditMode>('simulated');

  const setMode = useCallback((next: AuditMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isSimulated: mode === 'simulated',
    }),
    [mode, setMode],
  );

  return (
    <AuditModeContext.Provider value={value}>{children}</AuditModeContext.Provider>
  );
}

export function useAuditMode() {
  const context = useContext(AuditModeContext);
  if (!context) {
    throw new Error('useAuditMode must be used within an AuditModeProvider');
  }
  return context;
}

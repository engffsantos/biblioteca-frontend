// src/context/ErrorContext.tsx
// Contexto global para centralizar o estado de erro da aplicação.
// Qualquer parte do app pode disparar um erro (setError) e o banner global exibe.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type GlobalError = string | null;

type ErrorContextValue = {
    error: GlobalError;
    setError: (err: GlobalError) => void;
    clearError: () => void;
};

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [error, setErrorState] = useState<GlobalError>(null);

    const setError = useCallback((err: GlobalError) => {
        setErrorState(err || null);
        if (err) {
            // Opcional: log centralizado
            // console.error('[GlobalError]', err);
        }
    }, []);

    const clearError = useCallback(() => setErrorState(null), []);

    const value = useMemo(() => ({ error, setError, clearError }), [error, setError, clearError]);

    return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};

export function useError() {
    const ctx = useContext(ErrorContext);
    if (!ctx) {
        throw new Error('useError deve ser usado dentro de <ErrorProvider>');
    }
    return ctx;
}

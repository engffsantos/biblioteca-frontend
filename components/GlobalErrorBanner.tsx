// src/components/GlobalErrorBanner.tsx
// Banner global que aparece no topo quando houver erro no contexto.

import React from 'react';
import { useError } from '../context/ErrorContext';

const GlobalErrorBanner: React.FC = () => {
    const { error, clearError } = useError();

    if (!error) return null;

    return (
        <div className="w-full bg-red-600 text-white">
            <div className="container mx-auto px-4 py-3 flex items-start gap-3">
                <div className="text-sm md:text-base leading-snug">
                    <strong>Ops! </strong>{error}
                </div>
                <button
                    onClick={clearError}
                    className="ml-auto text-sm underline hover:no-underline"
                    aria-label="Fechar erro"
                >
                    fechar
                </button>
            </div>
        </div>
    );
};

export default GlobalErrorBanner;

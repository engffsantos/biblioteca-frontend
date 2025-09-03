// src/index.tsx
// Corrige a montagem da aplicação React.
// Não sobrescreva ReactDOM.createRoot: use a API padrão do React 18/19.

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Garante que o elemento #root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Could not find root element to mount to');
}

// Montagem padrão (React 18/19)
const root = createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

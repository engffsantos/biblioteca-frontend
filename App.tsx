// src/App.tsx
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ErrorProvider } from './context/ErrorContext';
import GlobalErrorBanner from './components/GlobalErrorBanner';

import Header from './components/Header';
import LibraryPage from './pages/LibraryPage';
import ItemFormPage from './pages/ItemFormPage';
import ItemDetailPage from './pages/ItemDetailPage';
import AkinPage from './pages/AkinPage';
import ApiDiagnosticPage from './pages/ApiDiagnosticPage';

const App: React.FC = () => {
    return (
        <ErrorProvider>
            <HashRouter>
                <div className="min-h-screen flex flex-col">
                    <Header />
                    {/* Banner global de erro logo abaixo do header */}
                    <GlobalErrorBanner />
                    <main className="flex-grow">
                        <Routes>
                            <Route path="/" element={<Navigate to="/library" replace />} />
                            <Route path="/library" element={<LibraryPage />} />
                            <Route path="/item/new" element={<ItemFormPage />} />
                            <Route path="/item/edit/:id" element={<ItemFormPage />} />
                            <Route path="/item/:id" element={<ItemDetailPage />} />
                            <Route path="/akin" element={<AkinPage />} />
                            {/* ✅ Nova rota de diagnóstico */}
                            <Route path="/diagnostico" element={<ApiDiagnosticPage />} />
                        </Routes>
                    </main>
                </div>
            </HashRouter>
        </ErrorProvider>
    );
};

export default App;

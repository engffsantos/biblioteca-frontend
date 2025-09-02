
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import LibraryPage from './pages/LibraryPage';
import ItemFormPage from './pages/ItemFormPage';
import ItemDetailPage from './pages/ItemDetailPage';
import AkinPage from './pages/AkinPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/item/new" element={<ItemFormPage />} />
            <Route path="/item/edit/:id" element={<ItemFormPage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
            <Route path="/akin" element={<AkinPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;

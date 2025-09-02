
import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  const activeLinkClass = 'bg-gray-700 text-white';
  const inactiveLinkClass = 'text-slate-300 hover:bg-gray-800 hover:text-white';
  
  return (
    <header className="bg-gray-900 shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/library" className="text-xl font-bold text-purple-accent">
              Biblioteca Ars Magica
            </NavLink>
          </div>
          <div className="flex space-x-4">
            <NavLink
              to="/library"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? activeLinkClass : inactiveLinkClass}`
              }
            >
              Biblioteca
            </NavLink>
            <NavLink
              to="/item/new"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? activeLinkClass : inactiveLinkClass}`
              }
            >
              Adicionar Item
            </NavLink>
            <NavLink
              to="/akin"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? activeLinkClass : inactiveLinkClass}`
              }
            >
              Ficha de AKIN
            </NavLink>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;

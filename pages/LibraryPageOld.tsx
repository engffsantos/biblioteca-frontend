
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Database, LibraryItem, ItemType, LabTextCategory, Summae, Tractatus, LabText } from '../types';
import { initialData } from '../data/initialData';
import Badge from '../components/Badge';

const typeColors: Record<ItemType, 'blue' | 'green' | 'purple'> = {
  [ItemType.Summae]: 'blue',
  [ItemType.Tractatus]: 'green',
  [ItemType.LabText]: 'purple',
};

const categoryColors: Record<LabTextCategory, 'orange' | 'red' | 'purple'> = {
    [LabTextCategory.Magia]: 'red',
    [LabTextCategory.ItemEncantado]: 'orange',
    [LabTextCategory.ScriptIniciacao]: 'purple',
};


const LibraryPage: React.FC = () => {
  const [db, setDb] = useLocalStorage<Database>('ars-magica-db', initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState({ min: '', max: '' });
  const [qualityFilter, setQualityFilter] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return db.library
      .filter(item => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        
        const minLevel = levelFilter.min ? parseInt(levelFilter.min) : -Infinity;
        const maxLevel = levelFilter.max ? parseInt(levelFilter.max) : Infinity;
        if ('level' in item && (item.level < minLevel || item.level > maxLevel)) return false;

        const minQuality = qualityFilter.min ? parseInt(qualityFilter.min) : -Infinity;
        const maxQuality = qualityFilter.max ? parseInt(qualityFilter.max) : Infinity;
        if ('quality' in item && (item.quality < minQuality || item.quality > maxQuality)) return false;

        if (searchTerm === '') return true;
        
        const lowerSearch = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(lowerSearch) ||
          item.author.toLowerCase().includes(lowerSearch) ||
          item.notes.toLowerCase().includes(lowerSearch) ||
          ('subject' in item && item.subject.toLowerCase().includes(lowerSearch)) ||
          ('effect' in item && item.effect.toLowerCase().includes(lowerSearch))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.library, searchTerm, typeFilter, levelFilter, qualityFilter]);

  const handleDelete = (itemId: string) => {
    setDb(prevDb => ({
      ...prevDb,
      library: prevDb.library.filter(item => item.id !== itemId),
    }));
    setShowDeleteModal(null);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
  }

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden flex flex-col justify-between transition-transform hover:scale-105 duration-300 print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-white pr-2 print:text-black">{item.title}</h2>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                        <Badge text={item.type} color={typeColors[item.type]}/>
                        {item.type === ItemType.LabText && <Badge text={item.category} color={categoryColors[item.category]}/>}
                    </div>
                </div>
              <p className="text-sm text-gray-400 mb-2 print:text-gray-600">Autor: {item.author}</p>
              
              <p className="text-sm text-gray-400 italic mb-3 line-clamp-1 print:text-gray-700">
                {item.type === ItemType.LabText ? `Efeito: ${(item as LabText).effect}` : `Assunto: ${(item as Summae | Tractatus).subject}`}
              </p>

              <div className="flex gap-4 text-sm mb-4">
                {'level' in item && <p className="text-gray-300 print:text-black"><span className="font-semibold">Nível:</span> {item.level}</p>}
                {'quality' in item && <p className="text-gray-300 print:text-black"><span className="font-semibold">Qualidade:</span> {item.quality}</p>}
              </div>

              <p className="text-gray-300 text-sm line-clamp-3 print:text-black">{item.notes}</p>
            </div>
            <div className="bg-gray-800 p-4 flex justify-between items-center print:hidden">
                <span className="text-xs text-gray-500">Criado em: {formatDate(item.createdAt)}</span>
                <div className="flex items-center gap-2">
                    <Link to={`/item/${item.id}`} className="text-blue-accent hover:underline text-sm font-medium">Ver</Link>
                    <Link to={`/item/edit/${item.id}`} className="text-green-accent hover:underline text-sm font-medium">Editar</Link>
                    <button onClick={() => setShowDeleteModal(item.id)} className="text-red-accent hover:underline text-sm font-medium">Excluir</button>
                </div>
            </div>
          </div>
        ))}
      </div>
  );

  const renderTable = () => (
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-x-auto print:bg-white print:shadow-none">
          <table className="w-full text-sm text-left text-gray-300 print:text-black">
              <thead className="text-xs text-gray-400 uppercase bg-gray-800 print:bg-gray-200 print:text-black">
                  <tr>
                      <th scope="col" className="px-6 py-3">Título</th>
                      <th scope="col" className="px-6 py-3">Tipo</th>
                      <th scope="col" className="px-6 py-3">Detalhes</th>
                      <th scope="col" className="px-6 py-3 text-center">Nível</th>
                      <th scope="col" className="px-6 py-3 text-center">Qualidade</th>
                      <th scope="col" className="px-6 py-3 print:hidden">Ações</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredItems.map(item => (
                      <tr key={item.id} className="bg-gray-900 border-b border-gray-800 hover:bg-gray-800/50 print:border-gray-300">
                          <td className="px-6 py-4 font-medium text-white print:text-black">{item.title} <span className="text-gray-400 block text-xs print:text-gray-600">por {item.author}</span></td>
                          <td className="px-6 py-4">
                            <Badge text={item.type} color={typeColors[item.type]}/>
                            {item.type === ItemType.LabText && <Badge text={item.category} color={categoryColors[item.category]} className="mt-1"/>}
                          </td>
                          <td className="px-6 py-4 text-gray-400 max-w-xs truncate print:text-black">{item.type === ItemType.LabText ? (item as LabText).effect : (item as Summae | Tractatus).subject}</td>
                          <td className="px-6 py-4 text-center">{'level' in item ? item.level : '–'}</td>
                          <td className="px-6 py-4 text-center">{'quality' in item ? item.quality : '–'}</td>
                          <td className="px-6 py-4 print:hidden">
                            <div className="flex items-center gap-3">
                                <Link to={`/item/${item.id}`} className="font-medium text-blue-accent hover:underline">Ver</Link>
                                <Link to={`/item/edit/${item.id}`} className="font-medium text-green-accent hover:underline">Editar</Link>
                                <button onClick={() => setShowDeleteModal(item.id)} className="font-medium text-red-accent hover:underline">Excluir</button>
                            </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white print:text-black">Acervo da Biblioteca</h1>
        <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => window.print()} className="w-full sm:w-auto bg-blue-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-blue-accent/80 transition-colors flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                Imprimir
            </button>
            <Link to="/item/new" className="w-full sm:w-auto bg-purple-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-purple-accent/80 transition-colors flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Adicionar Novo Item
            </Link>
        </div>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg mb-6 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Buscar por título, autor, notas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
            />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-accent"
            >
              <option value="all">Todos os Tipos</option>
              {Object.values(ItemType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
                <label className="text-xs text-gray-400">Nível</label>
                <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={levelFilter.min} onChange={e => setLevelFilter(p => ({...p, min: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent" />
                    <input type="number" placeholder="Max" value={levelFilter.max} onChange={e => setLevelFilter(p => ({...p, max: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent" />
                </div>
            </div>
             <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
                <label className="text-xs text-gray-400">Qualidade</label>
                <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={qualityFilter.min} onChange={e => setQualityFilter(p => ({...p, min: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent" />
                    <input type="number" placeholder="Max" value={qualityFilter.max} onChange={e => setQualityFilter(p => ({...p, max: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent" />
                </div>
            </div>
            <div className="flex justify-end items-center gap-2">
                <button onClick={() => setViewMode('cards')} className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-purple-accent text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                 <button onClick={() => setViewMode('table')} className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-purple-accent text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </button>
            </div>
        </div>
      </div>
      
      {viewMode === 'cards' ? renderCards() : renderTable()}
      
      {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-10 bg-gray-900 rounded-lg print:hidden">
              <p className="text-gray-500">Nenhum item encontrado. Tente ajustar sua busca ou adicione um novo item.</p>
          </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 print:hidden">
          <div className="bg-gray-900 rounded-lg p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-300 mb-6">Tem certeza de que deseja excluir este item? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowDeleteModal(null)} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteModal)} className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
// src/pages/ItemDetailPage.tsx
// Detalhes por ID, consultando o backend via hook useLibraryItem.

import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useLibraryItem, ItemType, LabTextCategory } from '../hooks/useApi';
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

const DetailField: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <p className="text-lg text-white">{value ?? '—'}</p>
    </div>
);

const ItemDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { item, loading, error } = useLibraryItem(id ?? null);

    if (!id) return <Navigate to="/library" replace />;
    if (loading) return <div className="p-6 text-white">Carregando...</div>;
    if (error)   return <div className="p-6 text-red-400">Erro: {error}</div>;
    if (!item)   return <Navigate to="/library" replace />;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between md:items-start mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{item.title}</h1>
                        <p className="text-lg text-gray-400">por {item.author}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge text={item.type} color={typeColors[item.type]} />
                        {item.type === ItemType.LabText && item.category && <Badge text={item.category} color={categoryColors[item.category]} />}
                    </div>
                </div>

                <div className="border-t border-gray-700 my-6"></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {item.type !== ItemType.LabText && <DetailField label="Assunto" value={(item as any).subject} />}
                    {'level' in item && <DetailField label="Nível" value={(item as any).level} />}
                    {'quality' in item && <DetailField label="Qualidade" value={(item as any).quality} />}
                    {item.type === ItemType.LabText && <DetailField label="Efeito" value={(item as any).effect} />}
                    {item.type === ItemType.LabText && <DetailField label="Total de Laboratório" value={(item as any).labTotal} />}
                    <DetailField label="Idioma" value={(item as any).language} />
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Notas</h2>
                    <p className="text-gray-300 whitespace-pre-wrap">{(item as any).notes}</p>
                </div>

                <div className="mt-6 flex gap-3">
                    <Link to={`/item/edit/${item.id}`} className="bg-green-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-green-accent/80 transition-colors">Editar</Link>
                    <Link to="/library" className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">Voltar</Link>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailPage;

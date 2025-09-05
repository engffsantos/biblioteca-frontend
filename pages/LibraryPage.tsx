// src/pages/LibraryPage.tsx
// REFATORADO • COMPLETO • COMENTADO (PT-BR)
// ------------------------------------------------------------
// O objetivo deste arquivo é unir o "layout/UX" rico (cards/tabela,
// filtros, impressão, modal de exclusão, badges e ordenação) do
// seu exemplo preferido com a implementação que já estava
// funcionando no projeto (hook useLibrary, link /diagnostico, etc.).
//
// Principais pontos:
// 1) Mantém o link para /diagnostico (presente no anexo).
// 2) Usa o hook useLibrary() já integrado ao backend.
// 3) Filtros completos: busca, tipo, nível (min/max), qualidade (min/max).
// 4) Alternância entre Cards e Tabela + botão "Imprimir".
// 5) Ordenação por createdAt (desc).
// 6) Modal de confirmação para exclusão com deleteItem() do hook.
// 7) Comentários explicando as decisões e garantindo segurança contra campos ausentes.
// ------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLibrary } from '../hooks/useApi';

// IMPORTS OPCIONAIS DE TIPOS E BADGE
// Se seu projeto já possui esses tipos/enum e o componente Badge, mantenha.
// Caso não possua, comente estas linhas e ajuste as referências no código.
// (Elas seguem o padrão do seu snippet “formato que você gosta”.)
import Badge from '../components/Badge';
import {
    ItemType,
    LabTextCategory,
    LibraryItem,
    LabText,
    Summae,
    Tractatus,
} from '../types';

// Mapeia cores para badges por tipo de item
const typeColors: Record<ItemType, 'blue' | 'green' | 'purple'> = {
    [ItemType.Summae]: 'blue',
    [ItemType.Tractatus]: 'green',
    [ItemType.LabText]: 'purple',
};

// Mapeia cores para badges por categoria de LabText
const categoryColors: Record<LabTextCategory, 'orange' | 'red' | 'purple'> = {
    [LabTextCategory.Magia]: 'red',
    [LabTextCategory.ItemEncantado]: 'orange',
    [LabTextCategory.ScriptIniciacao]: 'purple',
};

// Utilitário seguro para ler string minúscula (evita erro se vier undefined/null)
const safeLower = (v: unknown) => String(v ?? '').toLowerCase();

// Formata data em pt-BR (DD/MM/AAAA). Se inválida, mostra "—"
const formatDate = (dateString?: string) => {
    const d = dateString ? new Date(dateString) : null;
    return d && !isNaN(d.getTime())
        ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '—';
};

// Verifica se um item possui as propriedades de nível/qualidade (presentes em Summae/Tractatus)
const hasLevel = (it: LibraryItem): it is LibraryItem & { level: number } =>
    (it as any)?.level !== undefined && (it as any)?.level !== null;

const hasQuality = (it: LibraryItem): it is LibraryItem & { quality: number } =>
    (it as any)?.quality !== undefined && (it as any)?.quality !== null;

const isLabText = (it: LibraryItem): it is LabText => it.type === ItemType.LabText;

const LibraryPage: React.FC = () => {
    // Hook principal de dados da biblioteca
    const { items, loading, error, deleteItem } = useLibrary();

    // Estados de filtros/UX
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });
    const [qualityFilter, setQualityFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

    // Deriva lista filtrada e ordenada (memo para performance)
    const filteredItems = useMemo(() => {
        const list = Array.isArray(items) ? (items as LibraryItem[]) : [];

        const minLevel = levelFilter.min !== '' ? parseInt(levelFilter.min, 10) : Number.NEGATIVE_INFINITY;
        const maxLevel = levelFilter.max !== '' ? parseInt(levelFilter.max, 10) : Number.POSITIVE_INFINITY;

        const minQuality = qualityFilter.min !== '' ? parseInt(qualityFilter.min, 10) : Number.NEGATIVE_INFINITY;
        const maxQuality = qualityFilter.max !== '' ? parseInt(qualityFilter.max, 10) : Number.POSITIVE_INFINITY;

        const q = searchTerm.trim().toLowerCase();

        return list
            .filter((item) => {
                // Filtro por tipo
                if (typeFilter !== 'all' && String(item.type) !== typeFilter) return false;

                // Filtro por nível (apenas se o item tiver nível)
                if (hasLevel(item) && (item.level < minLevel || item.level > maxLevel)) return false;
                // Se o usuário preencheu min/max de nível, mas o item não tem nível, exclui
                if ((levelFilter.min || levelFilter.max) && !hasLevel(item)) return false;

                // Filtro por qualidade (apenas se o item tiver qualidade)
                if (hasQuality(item) && (item.quality < minQuality || item.quality > maxQuality)) return false;
                // Se o usuário preencheu min/max de qualidade, mas o item não tem qualidade, exclui
                if ((qualityFilter.min || qualityFilter.max) && !hasQuality(item)) return false;

                // Filtro de busca textual (título, autor, notas, subject/effect)
                if (!q) return true;
                const inTitle = safeLower(item.title).includes(q);
                const inAuthor = safeLower((item as any).author).includes(q);
                const inNotes = safeLower((item as any).notes).includes(q);
                const inSubject = safeLower((item as any).subject).includes(q);
                const inEffect = safeLower((item as any).effect).includes(q);
                return inTitle || inAuthor || inNotes || inSubject || inEffect;
            })
            // Ordena por createdAt desc, caindo para título asc se a data for inválida/ausente
            .sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
                if (!isNaN(ta) && !isNaN(tb)) return tb - ta; // mais recente primeiro
                if (!isNaN(ta)) return -1;
                if (!isNaN(tb)) return 1;
                return safeLower(a.title).localeCompare(safeLower(b.title));
            });
    }, [items, searchTerm, typeFilter, levelFilter, qualityFilter]);

    // Exclusão com confirmação (modal)
    const handleDelete = async (itemId: string) => {
        try {
            await deleteItem?.(itemId);
            setShowDeleteModal(null);
        } catch (err) {
            // Loga no console; na UI poderíamos exibir um toast/alert
            console.error('Erro ao deletar item:', err);
        }
    };

    // ESTADOS DE CARREGAMENTO/ERRO
    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex justify-center items-center min-h-64">
                    <div className="text-white text-lg">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error) {
        // Mostra bloco de erro amigável
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                    <h2 className="text-red-300 text-lg font-semibold mb-2">Erro</h2>
                    <p className="text-red-200">{String(error)}</p>
                    {/* Mantém acesso ao Diagnóstico para testes de conexão/CRUD */}
                    <p className="mt-3">
                        <Link to="/diagnostico" className="text-blue-accent underline hover:no-underline">
                            Ir para Diagnóstico
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    // RENDERIZAÇÃO DE CARDS
    const renderCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
            {filteredItems.map((item) => (
                <div
                    key={item.id}
                    className="bg-gray-900 rounded-lg shadow-lg overflow-hidden flex flex-col justify-between transition-transform hover:scale-105 duration-300 print:shadow-none print:border print:border-gray-300 print:break-inside-avoid"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-xl font-bold text-white pr-2 print:text-black">{item.title}</h2>

                            {/* Badges de tipo (e categoria se for LabText) */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                                <Badge text={String(item.type)} color={typeColors[item.type as ItemType]} />
                                {isLabText(item) && item.category && (
                                    <Badge text={String(item.category)} color={categoryColors[item.category as LabTextCategory]} />
                                )}
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 mb-2 print:text-gray-600">
                            Autor: {(item as any).author || '—'}
                        </p>

                        {/* Mostrar "Efeito" para LabText; caso contrário, "Assunto" para Summae/Tractatus */}
                        <p className="text-sm text-gray-400 italic mb-3 line-clamp-1 print:text-gray-700">
                            {isLabText(item)
                                ? `Efeito: ${(item as LabText).effect ?? '—'}`
                                : `Assunto: ${(item as Summae | Tractatus).subject ?? '—'}`}
                        </p>

                        <div className="flex gap-4 text-sm mb-4">
                            {hasLevel(item) && (
                                <p className="text-gray-300 print:text-black">
                                    <span className="font-semibold">Nível:</span> {item.level}
                                </p>
                            )}
                            {hasQuality(item) && (
                                <p className="text-gray-300 print:text-black">
                                    <span className="font-semibold">Qualidade:</span> {item.quality}
                                </p>
                            )}
                        </div>

                        <p className="text-gray-300 text-sm line-clamp-3 print:text-black">
                            {(item as any).notes || '—'}
                        </p>
                    </div>

                    {/* Rodapé com data e ações */}
                    <div className="bg-gray-800 p-4 flex justify-between items-center print:hidden">
                        <span className="text-xs text-gray-500">Criado em: {formatDate(item.createdAt)}</span>
                        <div className="flex items-center gap-2">
                            <Link to={`/item/${item.id}`} className="text-blue-accent hover:underline text-sm font-medium">
                                Ver
                            </Link>
                            <Link to={`/item/edit/${item.id}`} className="text-green-accent hover:underline text-sm font-medium">
                                Editar
                            </Link>
                            <button
                                onClick={() => setShowDeleteModal(item.id!)}
                                className="text-red-accent hover:underline text-sm font-medium"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // RENDERIZAÇÃO DE TABELA
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
                {filteredItems.map((item) => (
                    <tr key={item.id} className="bg-gray-900 border-b border-gray-800 hover:bg-gray-800/50 print:border-gray-300">
                        <td className="px-6 py-4 font-medium text-white print:text-black">
                            {item.title}
                            <span className="text-gray-400 block text-xs print:text-gray-600">por {(item as any).author || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                            <Badge text={String(item.type)} color={typeColors[item.type as ItemType]} />
                            {isLabText(item) && item.category && (
                                <Badge text={String(item.category)} color={categoryColors[item.category as LabTextCategory]} />
                            )}
                        </td>
                        <td className="px-6 py-4 text-gray-400 max-w-xs truncate print:text-black">
                            {isLabText(item) ? (item as LabText).effect ?? '—' : (item as Summae | Tractatus).subject ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-center">{hasLevel(item) ? item.level : '–'}</td>
                        <td className="px-6 py-4 text-center">{hasQuality(item) ? item.quality : '–'}</td>
                        <td className="px-6 py-4 print:hidden">
                            <div className="flex items-center gap-3">
                                <Link to={`/item/${item.id}`} className="font-medium text-blue-accent hover:underline">Ver</Link>
                                <Link to={`/item/edit/${item.id}`} className="font-medium text-green-accent hover:underline">Editar</Link>
                                <button
                                    onClick={() => setShowDeleteModal(item.id!)}
                                    className="font-medium text-red-accent hover:underline"
                                >
                                    Excluir
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}

                {filteredItems.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            Nenhum item encontrado. Ajuste os filtros ou adicione um novo item.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );

    // JSX principal
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
            {/* Cabeçalho com título, Diagnóstico, Imprimir e Novo Item */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-white print:text-black">Acervo da Biblioteca</h1>

                <div className="flex flex-wrap gap-2 print:hidden">
                    {/* Link mantido do arquivo em anexo */}
                    <Link
                        to="/diagnostico"
                        className="text-sm text-blue-accent underline hover:no-underline self-center"
                        title="Testes de conexão e CRUD"
                    >
                        Diagnóstico
                    </Link>

                    <button
                        onClick={() => window.print()}
                        className="w-full sm:w-auto bg-blue-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-blue-accent/80 transition-colors flex items-center justify-center shadow-md"
                    >
                        {/* Ícone de impressão (Heroicons solid) */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Imprimir
                    </button>

                    <Link
                        to="/item/new"
                        className="w-full sm:w-auto bg-purple-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-purple-accent/80 transition-colors flex items-center justify-center shadow-md"
                    >
                        {/* Ícone de plus (Heroicons solid) */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Adicionar Novo Item
                    </Link>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-gray-900 p-4 rounded-lg mb-6 space-y-4 print:hidden">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por título, autor, notas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
                        aria-label="Buscar"
                    />

                    {/* Filtro por tipo (aceita valores do enum ItemType e 'all') */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-accent"
                        aria-label="Filtrar por tipo"
                    >
                        <option value="all">Todos os Tipos</option>
                        {/* Gera as opções a partir do enum ItemType */}
                        {Object.values(ItemType).map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Filtros numéricos e alternância de visualização */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
                        <label className="text-xs text-gray-400">Nível</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={levelFilter.min}
                                onChange={(e) => setLevelFilter((p) => ({ ...p, min: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={levelFilter.max}
                                onChange={(e) => setLevelFilter((p) => ({ ...p, max: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
                        <label className="text-xs text-gray-400">Qualidade</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={qualityFilter.min}
                                onChange={(e) => setQualityFilter((p) => ({ ...p, min: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
                            />
                            <input
                                type="number"
                                placeholder="Max"
                                value={qualityFilter.max}
                                onChange={(e) => setQualityFilter((p) => ({ ...p, max: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-accent"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-2">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-purple-accent text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            aria-pressed={viewMode === 'cards'}
                            aria-label="Visualizar em cards"
                        >
                            {/* Ícone grid */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-purple-accent text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            aria-pressed={viewMode === 'table'}
                            aria-label="Visualizar em tabela"
                        >
                            {/* Ícone lista */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal: Cards ou Tabela */}
            {viewMode === 'cards' ? renderCards() : renderTable()}

            {/* Estado "vazio" (quando não encontrou nada) */}
            {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-10 bg-gray-900 rounded-lg print:hidden">
                    <p className="text-gray-500">Nenhum item encontrado. Tente ajustar sua busca ou adicione um novo item.</p>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 print:hidden" role="dialog" aria-modal="true">
                    <div className="bg-gray-900 rounded-lg p-8 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Confirmar Exclusão</h3>
                        <p className="text-gray-300 mb-6">
                            Tem certeza de que deseja excluir este item? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteModal)}
                                className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LibraryPage;

// hooks/useAPI.ts
// Hooks de alto nível para consumir a API no React com estados de carregamento e erro.

import { useEffect, useState, useCallback } from 'react';
import { apiService, ApiError } from '../services/api';
import type { LibraryItem } from '../types';

type ErrorState = string | null;

export function useLibrary() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<ErrorState>(null);

    /**
     * Busca a lista completa de itens.
     * Isola o tratamento de erro e loading.
     */
    const refetch = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getLibraryItems();
            setItems(data);
        } catch (e) {
            setError(normalizeError(e));
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Cria um item e atualiza o estado local.
     */
    const addItem = useCallback(
        async (payload: Partial<LibraryItem>) => {
            try {
                setError(null);
                const created = await apiService.createLibraryItem(payload);
                setItems((prev) => [created, ...prev]); // novo item no topo
                return created;
            } catch (e) {
                const msg = normalizeError(e);
                setError(msg);
                throw e;
            }
        },
        []
    );

    /**
     * Atualiza um item e sincroniza a lista.
     */
    const updateItem = useCallback(
        async (id: string, payload: Partial<LibraryItem>) => {
            try {
                setError(null);
                const updated = await apiService.updateLibraryItem(id, payload);
                setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
                return updated;
            } catch (e) {
                const msg = normalizeError(e);
                setError(msg);
                throw e;
            }
        },
        []
    );

    /**
     * Remove um item pelo ID e atualiza a lista.
     */
    const deleteItem = useCallback(async (id: string) => {
        try {
            setError(null);
            await apiService.deleteLibraryItem(id);
            setItems((prev) => prev.filter((i) => i.id !== id));
        } catch (e) {
            const msg = normalizeError(e);
            setError(msg);
            throw e;
        }
    }, []);

    // Busca inicial ao montar o componente.
    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        items,
        loading,
        error,
        // ações
        refetch,
        addItem,
        updateItem,
        deleteItem,
    };
}

/**
 * Hook auxiliar para carregar um único item por ID.
 * Útil em páginas de detalhe/edição.
 */
export function useLibraryItem(id: string | null) {
    const [item, setItem] = useState<LibraryItem | null>(null);
    const [loading, setLoading] = useState<boolean>(Boolean(id));
    const [error, setError] = useState<ErrorState>(null);

    const refetch = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getLibraryItem(id);
            setItem(data);
        } catch (e) {
            setError(normalizeError(e));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { item, loading, error, refetch, setItem };
}

/** Normaliza mensagens de erro vindas do fetch/ApiError. */
function normalizeError(e: unknown): string {
    if (e instanceof ApiError) {
        // Prioriza mensagem do backend, depois status/texto padrão
        return e.message || `Erro de API${e.status ? ` (${e.status})` : ''}`;
    }
    if (e instanceof Error) return e.message;
    try {
        return JSON.stringify(e);
    } catch {
        return 'Erro desconhecido';
    }
}

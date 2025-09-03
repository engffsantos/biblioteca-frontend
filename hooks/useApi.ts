// src/hooks/useApi.ts
// Hooks React que consomem o serviço REST, com correções de promessas ignoradas.
// - useLibrary(): lista + CRUD, com refresh que retorna Promise<void>
// - useLibraryItem(id): busca item único, descartando a Promise interna com `void run()`
// Também reexporta tipos de '../types' para compatibilidade.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

// ✅ Reexport para compatibilidade com imports antigos (se existirem)
export { ItemType, LabTextCategory, type LibraryItem } from '../types';

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

// Se você tem os tipos fortes no projeto, importe-os de '../types' e remova `any`.
type AnyItem = any;

export function useLibrary() {
    const [items, setItems] = useState<AnyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🔧 Devolve Promise<void> para o linter entender o fluxo assíncrono
    const refresh = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const rows = await api.library.list();
            setItems(rows);
        } catch (e: any) {
            setError(e?.message || 'Falha ao carregar');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // ✅ descarta explicitamente a Promise para não acusar "ignored promise"
        void refresh();
    }, [refresh]);

    const addItem = useCallback(async (payload: Partial<AnyItem>) => {
        const created = await api.library.create(payload as any);
        setItems(prev => [created, ...prev]);
        return created;
    }, []);

    const updateItem = useCallback(async (id: string, payload: Partial[AnyItem]) => {
        const updated = await api.library.update(id, payload as any);
        setItems(prev => prev.map(i => (i.id === id ? updated : i)));
        return updated;
    }, []);

    const deleteItem = useCallback(async (id: string) => {
        await api.library.remove(id);
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    return { items, loading, error, refresh, addItem, updateItem, deleteItem };
}

export function useLibraryItem(id: string | null) {
    const [state, setState] = useState<FetchState<AnyItem>>({
        data: null, loading: !!id, error: null
    });

    useEffect(() => {
        let cancelled = false;

        async function run(): Promise<void> {
            if (!id) return;
            setState({ data: null, loading: true, error: null });
            try {
                const item = await api.library.get(id);
                if (!cancelled) setState({ data: item, loading: false, error: null });
            } catch (e: any) {
                if (!cancelled) setState({ data: null, loading: false, error: e?.message || 'Falha ao buscar item' });
            }
        }

        // ✅ descarta explicitamente a Promise para agradar o linter
        void run();

        return () => { cancelled = true; };
    }, [id]);

    return useMemo(() => ({
        item: state.data,
        loading: state.loading,
        error: state.error,
    }), [state]);
}

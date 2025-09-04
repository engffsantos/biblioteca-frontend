// src/hooks/useApi.ts
// Hooks que consomem o serviço REST e expõem a API esperada pelos componentes.
// Também normaliza campos vindos do backend para o formato usado no frontend.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

// ✅ Reexporta os tipos/enums do módulo de tipos (opcional)
//    Assim, se você importar de '../hooks/useApi', não quebra.
export {
    ItemType,
    LabTextCategory,
    type LibraryItem,
    type Summae,
    type Tractatus,
    type LabText,
} from '../types';

// ================== Tipos locais auxiliares ==================
type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

// ================== Normalização de itens ==================
// O backend responde com snake_case (created_at) e campos opcionais.
// O front usa camelCase (createdAt). Vamos ajustar aqui.
function normalizeItem(row: any) {
    if (!row) return row;

    // Renomeia datas (se existirem) e mantém o resto
    const createdAt = row.created_at ?? row.createdAt ?? null;
    const updatedAt = row.updated_at ?? row.updatedAt ?? null;

    // Retorna o objeto com camelCase esperado pelo UI
    return {
        ...row,
        createdAt,
        updatedAt,
    };
}

// ================== Lista + CRUD ==================
export function useLibrary() {
    const [state, setState] = useState<FetchState<any[]>>({
        data: null,
        loading: true,
        error: null,
    });

    const refresh = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const items = await api.list();
            const normalized = (items || []).map(normalizeItem);
            setState({ data: normalized, loading: false, error: null });
        } catch (err: any) {
            setState({ data: null, loading: false, error: String(err?.message || err) });
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // ✅ Nomes compatíveis com os componentes existentes:
    const addItem = useCallback(
        async (payload: any) => {
            await api.create(payload);
            await refresh();
        },
        [refresh]
    );

    const updateItem = useCallback(
        async (id: string, payload: any) => {
            await api.update(id, payload);
            await refresh();
        },
        [refresh]
    );

    const deleteItem = useCallback(
        async (id: string) => {
            await api.remove(id);
            await refresh();
        },
        [refresh]
    );

    // (Mantém também nomes genéricos, se você quiser usar em outros pontos)
    const create = addItem;
    const update = updateItem;
    const remove = deleteItem;

    return useMemo(
        () => ({
            items: state.data ?? [],
            loading: state.loading,
            error: state.error,
            // métodos
            refresh,
            addItem,
            updateItem,
            deleteItem,
            // aliases
            create,
            update,
            remove,
        }),
        [state, refresh, addItem, updateItem, deleteItem, create, update, remove]
    );
}

// ================== Item único ==================
export function useLibraryItem(id: string | undefined) {
    const [state, setState] = useState<FetchState<any>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!id) {
                setState({ data: null, loading: false, error: 'ID ausente' });
                return;
            }
            setState((s) => ({ ...s, loading: true, error: null }));
            try {
                const item = await api.get(id);
                const normalized = normalizeItem(item);
                if (!cancelled) setState({ data: normalized, loading: false, error: null });
            } catch (err: any) {
                if (!cancelled) setState({ data: null, loading: false, error: String(err?.message || err) });
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, [id]);

    return useMemo(
        () => ({
            item: state.data,
            loading: state.loading,
            error: state.error,
        }),
        [state]
    );
}

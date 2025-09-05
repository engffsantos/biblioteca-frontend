// src/hooks/useApi.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

/* ========= Tipos ========= */
export enum ItemType {
    Summae = 'Summae',
    Tractatus = 'Tractatus',
    // No backend o label é "Lab Text"
    LabText = 'Lab Text',
}
export enum LabTextCategory {
    Magia = 'Magia',
    ItemEncantado = 'Item Encantado',
    ScriptIniciacao = 'Script de Iniciação',
}
export type BaseItem = {
    id?: string;
    type: ItemType;
    title: string;
    author?: string | null;
    language?: string | null;
    notes?: string | null;        // UI usa 'notes'
    createdAt?: string;
    updatedAt?: string;
};
export type Summae = BaseItem & { type: ItemType.Summae; subject?: string | null; level?: number | null; quality?: number | null; };
export type Tractatus = BaseItem & { type: ItemType.Tractatus; subject?: string | null; quality?: number | null; };
export type LabText = BaseItem & { type: ItemType.LabText; category?: LabTextCategory | string | null; effect?: string | null; level?: number | null; labTotal?: number | null; };
export type LibraryItem = Summae | Tractatus | LabText;

/* ========= BASE URL ========= */
const ENV_BASE =
    (import.meta as any)?.env?.VITE_API_BASE ||
    (import.meta as any)?.env?.REACT_APP_API_BASE ||
    '';

function resolveApiBase(): string {
    if (ENV_BASE) return `${String(ENV_BASE).replace(/\/+$/, '')}/api`;
    const isProdHost = typeof window !== 'undefined' &&
        /biblioteca-backend.*\.vercel\.app$/i.test(window.location.hostname);
    if (isProdHost) return '/api';
    return 'https://biblioteca-backend-nine-beta.vercel.app/api';
}
const API_BASE = resolveApiBase();

/* ========= Helper de request ========= */
type ParseMode = 'json' | 'text' | 'void';

async function request<T>(
    path: string,
    init?: (RequestInit & { parse?: ParseMode }) | undefined
): Promise<T> {
    const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    const { parse, headers: callHeaders, ...restInit } = init ?? {};

    const method = (restInit.method || 'GET').toUpperCase();
    const body = restInit.body as any;

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const shouldSetJson = !isFormData && method !== 'GET' && method !== 'HEAD' && body !== undefined;

    const baseHeaders: Record<string, string> = {};
    if (shouldSetJson) baseHeaders['Content-Type'] = 'application/json';

    const mergedHeaders =
        callHeaders instanceof Headers
            ? callHeaders
            : { ...baseHeaders, ...(callHeaders as Record<string, string> | undefined) };

    const resp = await fetch(url, { ...restInit, headers: mergedHeaders });

    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} – ${txt || resp.statusText}`);
    }

    const mode: ParseMode = parse ?? 'json';
    if (mode === 'void') return undefined as unknown as T;
    if (mode === 'text') return (await resp.text()) as unknown as T;
    return (await resp.json()) as T;
}

/* ========= Normalização BACKEND <-> UI =========
   Backend: ability, category, description (e level, quality...)
   UI:      subject, category, notes
   Referências:
   - Backend (routes/library.js): INSERT/UPDATE/SELECT usam ability/category/description. :contentReference[oaicite:4]{index=4}
   - Páginas UI usam subject/notes (ItemDetail/Library).
*/
function toBackendPayload(input: Partial<LibraryItem>) {
    const common = {
        type: input.type,
        title: input.title,
        author: input.author ?? null,
        description: input.notes ?? null, // description ← notes
    };

    switch (input.type) {
        case ItemType.Summae:
            return {
                ...common,
                ability: (input as Partial<Summae>).subject ?? null, // ability ← subject
                level:   (input as Partial<Summae>).level   ?? null,
                quality: (input as Partial<Summae>).quality ?? null,
                category: null,
            };
        case ItemType.Tractatus:
            return {
                ...common,
                ability: (input as Partial<Tractatus>).subject ?? null, // ability ← subject
                quality: (input as Partial<Tractatus>).quality ?? null,
                level: null,
                category: null,
            };
        case ItemType.LabText:
            return {
                ...common,
                ability: null, // Lab Text não usa ability
                category: (input as Partial<LabText>).category ?? null,
                level:    (input as Partial<LabText>).level    ?? null,
                quality:  (input as Partial<LabText>).quality  ?? null, // pode ir null
            };
        default:
            return common as Record<string, any>;
    }
}

function fromBackendItem(row: any): LibraryItem {
    if (!row) return row;

    const base: any = {
        id: row.id,
        type: row.type,
        title: row.title,
        author: row.author ?? null,
        language: row.language ?? null,     // backend não persiste; mantém caso venha
        notes: row.description ?? null,     // UI lê notes
        createdAt: row.created_at ?? row.createdAt,
        updatedAt: row.updated_at ?? row.updatedAt,
    };

    if (row.type === ItemType.LabText) {
        return {
            ...base,
            type: ItemType.LabText,
            category: row.category ?? null,
            effect: (row as any).effect ?? null, // não persiste; mantém se vier por outro lugar
            level: row.level ?? null,
            labTotal: (row as any).labTotal ?? null, // idem
        } as LabText;
    }

    // Summae / Tractatus → UI espera subject
    const subject = row.ability ?? null; // subject ← ability
    if (row.type === ItemType.Summae) {
        return {
            ...base,
            type: ItemType.Summae,
            subject,
            level: row.level ?? null,
            quality: row.quality ?? null,
        } as Summae;
    }

    // Tractatus
    return {
        ...base,
        type: ItemType.Tractatus,
        subject,
        quality: row.quality ?? null,
    } as Tractatus;
}

/* ========= Hooks ========= */
export function useLibrary() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await request<any[]>('/library', { method: 'GET' });
            const mapped = Array.isArray(data) ? data.map(fromBackendItem) : [];
            setItems(mapped);
        } catch (e: any) {
            setError(e?.message || 'Erro ao carregar itens');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const addItem = useCallback(async (input: Partial<LibraryItem>) => {
        const body = toBackendPayload(input);
        const created = await request<any>('/library', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const mapped = fromBackendItem(created);
        setItems((prev) => [mapped, ...prev]);
        return mapped;
    }, []);

    const updateItem = useCallback(async (id: string, input: Partial<LibraryItem>) => {
        const body = toBackendPayload(input);
        const updated = await request<any>(`/library/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        const mapped = fromBackendItem(updated);
        setItems((prev) => prev.map((it) => (it.id === id ? mapped : it)));
        return mapped;
    }, []);

    const deleteItem = useCallback(async (id: string) => {
        await request<void>(`/library/${id}`, { method: 'DELETE', parse: 'void' });
        setItems((prev) => prev.filter((it) => it.id !== id));
    }, []);

    const refresh = useCallback(() => load(), [load]);

    return useMemo(
        () => ({ items, loading, error, addItem, updateItem, deleteItem, refresh }),
        [items, loading, error, addItem, updateItem, deleteItem, refresh]
    );
}

export function useLibraryItem(id?: string) {
    const [item, setItem] = useState<LibraryItem | null>(null);
    const [loading, setLoading] = useState<boolean>(Boolean(id));
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!id) {
            setItem(null); setLoading(false); setError(null); return;
        }
        setLoading(true); setError(null);
        try {
            const data = await request<any>(`/library/${id}`, { method: 'GET' });
            setItem(fromBackendItem(data));
        } catch (e: any) {
            setError(e?.message || 'Erro ao carregar item');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    return { item, loading, error, refresh: load };
}

export async function getHealth(): Promise<string> {
    return request<string>('/health', { method: 'GET', parse: 'text' });
}

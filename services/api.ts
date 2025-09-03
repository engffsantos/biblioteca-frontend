// services/api.ts
// Camada de acesso à API (REST) com helpers tipados e tratamento consistente de erros.

import type { LibraryItem } from '../types';

// Base da API: usa VITE_API_URL quando definido; fallback para localhost.
// Ex.: defina em .env.production -> VITE_API_URL=https://seu-backend.vercel.app/api
const API_BASE_URL =
    (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

/** Erro padronizado para a aplicação (opcional, útil para diferenciar no front). */
export class ApiError extends Error {
    status?: number;
    body?: unknown;

    constructor(message: string, status?: number, body?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

/**
 * Função utilitária para requisições fetch tipadas.
 * - Monta a URL final combinando API_BASE_URL + endpoint.
 * - Define cabeçalho JSON por padrão.
 * - Lê e normaliza erros, retornando ApiError.
 */
async function request<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
        ...options,
    });

    // Tenta obter o corpo como JSON; se falhar, tenta como texto.
    let payload: unknown = null;
    const text = await res.text().catch(() => '');
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text || null;
    }

    if (!res.ok) {
        const message =
            // tenta mensagem do backend, senão monta uma genérica
            (payload && typeof payload === 'object' && 'error' in payload
                ? String((payload as any).error)
                : null) ||
            `Request failed: ${res.status} ${res.statusText}`;
        throw new ApiError(message, res.status, payload);
    }

    // Quando a API retorna 204 No Content, não há corpo
    if (res.status === 204) {
        // @ts-expect-error: para chamadas que esperam void
        return undefined;
    }

    return payload as T;
}

/**
 * Serviço de API para o domínio "Library".
 * Mapeia 1:1 os endpoints do backend Express (Turso).
 */
export const apiService = {
    /** Lista todos os itens da biblioteca. */
    getLibraryItems(): Promise<LibraryItem[]> {
        return request<LibraryItem[]>('/library');
    },

    /** Obtém um item específico pelo ID. */
    getLibraryItem(id: string): Promise<LibraryItem> {
        return request<LibraryItem>(`/library/${encodeURIComponent(id)}`);
    },

    /**
     * Cria um novo item.
     * @param payload Campos do item (parcial para permitir formulário flexível)
     */
    createLibraryItem(
        payload: Partial<LibraryItem>
    ): Promise<LibraryItem> {
        return request<LibraryItem>('/library', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    /**
     * Atualiza um item existente.
     * @param id ID do item
     * @param payload Campos a atualizar
     */
    updateLibraryItem(
        id: string,
        payload: Partial<LibraryItem>
    ): Promise<LibraryItem> {
        return request<LibraryItem>(`/library/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    /**
     * Remove um item por ID.
     * Retorna void (204 No Content no backend).
     */
    deleteLibraryItem(id: string): Promise<void> {
        return request<void>(`/library/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    },
};

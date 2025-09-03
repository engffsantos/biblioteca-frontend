// src/services/api.ts
// Camada REST com tratamento de erros + fetch "amarrado" ao window (evita Illegal invocation).

// Se você tiver types dedicados (LibraryItem etc.), importe-os aqui.
// Para não travar o build, uso `any` nos payloads e retorno.
type AnyObject = Record<string, any>;

// Base URL: usa VITE_API_URL quando existir; fallback para dev local.
const API_BASE_URL =
    (import.meta as any).env?.VITE_API_URL || 'https://biblioteca-backend-nine-beta.vercel.app/api';

console.log('[API] Base URL =', API_BASE_URL);

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

/** Garante fetch vinculado ao window no browser (evita "Illegal invocation"). */
function getBoundFetch(): typeof fetch {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        return window.fetch.bind(window);
    }
    return fetch; // SSR/testes
}

/** Função utilitária para requisições padronizadas. */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const boundFetch = getBoundFetch();

    // 🔧 IMPORTANTE: separe headers do resto para tipar corretamente:
    const { headers: optHeaders, ...rest } = options || {};
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(optHeaders as any),
    };

    const res = await boundFetch(url, { headers, ...rest });

    // Lê corpo como texto e tenta parsear JSON
    const text = await res.text().catch(() => '');
    let payload: unknown = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text || null;
    }

    if (!res.ok) {
        const msg =
            (payload && typeof payload === 'object' && 'error' in (payload as any)
                ? String((payload as any).error)
                : `Request failed: ${res.status} ${res.statusText}`);
        throw new ApiError(msg, res.status, payload);
    }

    if (res.status === 204) {
        // @ts-expect-error: para quem espera void
        return undefined;
    }
    return payload as T;
}

/** Serviço para itens da Biblioteca */
class LibraryApi {
    list(): Promise<any[]> {
        return request<any[]>('/library');
    }
    get(id: string): Promise<any> {
        return request<any>(`/library/${encodeURIComponent(id)}`);
    }
    create(payload: AnyObject): Promise<any> {
        return request<any>('/library', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    update(id: string, payload: AnyObject): Promise<any> {
        return request<any>(`/library/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    remove(id: string): Promise<void> {
        return request<void>(`/library/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }
}

/** Serviço para AKIN */
class AkinApi {
    get(): Promise<any> {
        return request<any>('/akin');
    }
    upsert(payload: AnyObject): Promise<any> {
        return request<any>('/akin', {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    createAbility(payload: { name: string; value: number; specialty?: string | null }): Promise<any> {
        return request<any>('/akin/abilities', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    updateAbility(id: string, payload: { name: string; value: number; specialty?: string | null }): Promise<any> {
        return request<any>(`/akin/abilities/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    deleteAbility(id: string): Promise<void> {
        return request<void>(`/akin/abilities/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }
    createVirtue(payload: { name: string; description: string; is_major?: boolean; page?: number | null }): Promise<any> {
        return request<any>('/akin/virtues', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    updateVirtue(id: string, payload: { name: string; description: string; is_major?: boolean; page?: number | null }): Promise<any> {
        return request<any>(`/akin/virtues/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    deleteVirtue(id: string): Promise<void> {
        return request<void>(`/akin/virtues/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }
    createFlaw(payload: { name: string; description: string; is_major?: boolean; page?: number | null }): Promise<any> {
        return request<any>('/akin/flaws', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    updateFlaw(id: string, payload: { name: string; description: string; is_major?: boolean; page?: number | null }): Promise<any> {
        return request<any>(`/akin/flaws/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    deleteFlaw(id: string): Promise<void> {
        return request<void>(`/akin/flaws/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }
}

export class ApiService {
    library = new LibraryApi();
    akin = new AkinApi();
}

// 👇 compatibilidade: export padrão (instância) e também `api` nomeado
export const apiService = new ApiService();
export const api = apiService;
export default apiService;

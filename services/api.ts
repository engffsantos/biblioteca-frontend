// src/services/api.ts
type AnyObject = Record<string, any>

const PROD_HOST = 'https://biblioteca-backend-nine-beta.vercel.app'
const DEFAULT_API = `${PROD_HOST}/api`

let _baseOverride: string | null =
    (typeof window !== 'undefined' && (window as any).__API_BASE_URL) || null

let _debug =
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_DEBUG === 'true') ||
    (typeof window !== 'undefined' && (window as any).__API_DEBUG === true)

export function setDebug(v: boolean) { _debug = v }
export function setBaseURL(url: string) { _baseOverride = strip(url) }
export function getBaseURL(): string {
    if (_baseOverride) return withApiPrefix(_baseOverride)
    const env =
        (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL) ||
        (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_BACKEND_URL) ||
        (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_BASE)
    if (env) return withApiPrefix(String(env))
    return DEFAULT_API
}

function strip(u: string) { return u.endsWith('/') ? u.slice(0, -1) : u }
function withApiPrefix(u: string) {
    const s = strip(u)
    return s.toLowerCase().endsWith('/api') ? s : `${s}/api`
}
function j(obj: any) { try { return JSON.parse(JSON.stringify(obj)) } catch { return obj } }

class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public url?: string,
        public original?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

async function parseJson(resp: Response) {
    const text = await resp.text()
    try { return JSON.parse(text) } catch { return text || null }
}

function extractMsg(payload: any) {
    if (!payload || typeof payload !== 'object') return null
    if (typeof payload.error === 'string') return payload.error
    if (typeof payload.message === 'string') return payload.message
    if (Array.isArray(payload.details)) return payload.details.join(' | ')
    return null
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function backoff(attempt: number) { return 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 200) }

async function request<T>(
    method: 'GET'|'POST'|'PUT'|'DELETE',
    path: string,
    body?: AnyObject,
    opts?: { timeoutMs?: number; retries?: number; headers?: AnyObject }
): Promise<T> {
    const base = getBaseURL()
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
    const timeoutMs = opts?.timeoutMs ?? 15000
    const retries = Math.max(0, opts?.retries ?? 1)
    const headers: AnyObject = { 'Content-Type': 'application/json', ...(opts?.headers || {}) }

    let lastErr: any

    for (let attempt = 0; attempt <= retries; attempt++) {
        const ctrl = new AbortController()
        const tm = setTimeout(() => ctrl.abort(), timeoutMs)

        if (_debug) {
            const args = body && method !== 'GET' && method !== 'DELETE' ? [method, url, j(body)] : [method, url]
            console.log('[API]', ...args)
        }

        try {
            const resp = await fetch(url, {
                method,
                headers,
                body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body ?? {}),
                signal: ctrl.signal,
            })
            clearTimeout(tm)

            if (!resp.ok) {
                const payload = await parseJson(resp)
                const msg = extractMsg(payload) || `HTTP ${resp.status}`
                throw new ApiError(msg, resp.status, url, payload)
            }

            const data = (await parseJson(resp)) as T
            if (_debug) console.log('[API] OK', method, url)
            return data
        } catch (err: any) {
            clearTimeout(tm)
            lastErr = err
            const isAbort = err?.name === 'AbortError'
            const isNetwork = err instanceof TypeError && String(err.message || '').includes('Failed to fetch')

            if (attempt < retries && (isAbort || isNetwork)) {
                await sleep(backoff(attempt))
                continue
            }

            if (_debug) {
                console.error('[API] FAIL', method, url, err)
                if (isNetwork) {
                    console.error('[API] Diagnóstico rápido (Failed to fetch):')
                    console.error(' • CORS/ALLOWED_ORIGINS')
                    console.error(' • URL incorreta / http vs https')
                    console.error(' • DNS/SSL/Certificado')
                    console.error(' • Serverless cold start')
                    console.error(' • Adblock/extensões')
                    console.error(' • Timeout curto')
                }
            }

            throw new ApiError(
                isAbort ? `Tempo esgotado após ${timeoutMs}ms: ${url}` : String(err?.message || err),
                undefined,
                url,
                err
            )
        }
    }

    throw new ApiError(String(lastErr?.message || lastErr || 'Erro desconhecido'))
}

/* ========= Normalização para o BACKEND (conforme /api/library) =========
   - Backend espera: ability, category, description (e level/quality, etc.)
   - Nosso front usa: subject, notes (e outros que o backend não persiste).
   Referência backend: routes/library.js (INSERT/UPDATE) :contentReference[oaicite:2]{index=2}
*/
function toBackendPayload(input: AnyObject): AnyObject {
    if (!input) return {}
    const type = input.type

    // mapeamento comum
    const base = {
        type,
        title: input.title,
        author: input.author ?? null,
        description: input.notes ?? input.description ?? null, // description ← notes
    }

    if (type === 'Lab Text') {
        return {
            ...base,
            ability: null,                           // Lab Text não usa ability
            category: input.category ?? null,        // category mantida
            level: input.level ?? null,
            quality: input.quality ?? null,          // pode ir null
            // effect/language/labTotal não existem no schema atual
        }
    }

    // Summae/Tractatus
    return {
        ...base,
        ability: input.subject ?? input.ability ?? null, // ability ← subject
        category: null,
        level: input.level ?? null,
        quality: input.quality ?? null,
    }
}

/* ========= Normalização de resposta do BACKEND → UI =========
   - Para a UI continuar exibindo `notes` e `subject` nas páginas
     que já usam esses nomes (ItemDetailPage/LibraryPage).
*/
function fromBackendItem(row: AnyObject): AnyObject {
    if (!row) return row
    const type = row.type
    const base = {
        ...row,
        notes: row.description ?? null, // UI lê notes
    }
    if (type === 'Lab Text') {
        return base // Lab Text não usa subject; mantemos category já vinda do backend
    }
    return {
        ...base,
        subject: row.ability ?? null,   // UI lê subject
    }
}

export const api = {
    // Biblioteca
    list: async () => {
        const rows = await request<any[]>('GET', '/library')
        return Array.isArray(rows) ? rows.map(fromBackendItem) : []
    },
    get: async (id: string) => {
        const row = await request<any>('GET', `/library/${id}`)
        return fromBackendItem(row)
    },
    create: async (payload: AnyObject) => {
        const body = toBackendPayload(payload)
        const created = await request<any>('POST', '/library', body)
        return fromBackendItem(created)
    },
    update: async (id: string, payload: AnyObject) => {
        const body = toBackendPayload(payload)
        const updated = await request<any>('PUT', `/library/${id}`, body)
        return fromBackendItem(updated)
    },
    remove: (id: string) => request<void>('DELETE', `/library/${id}`),

    // Akin (namespace)
    akin: {
        get: () => request<any>('GET', '/akin'),
        upsert: (profile: AnyObject) => request<any>('PUT', '/akin', profile),

        createAbility: (p: AnyObject) => request<any>('POST', '/akin/abilities', p),
        updateAbility: (id: string, p: AnyObject) => request<any>('PUT', `/akin/abilities/${id}`, p),
        deleteAbility: (id: string) => request<void>('DELETE', `/akin/abilities/${id}`),

        createVirtue: (p: AnyObject) => request<any>('POST', '/akin/virtues', p),
        updateVirtue: (id: string, p: AnyObject) => request<any>('PUT', `/akin/virtues/${id}`, p),
        deleteVirtue: (id: string) => request<void>('DELETE', `/akin/virtues/${id}`),

        createFlaw: (p: AnyObject) => request<any>('POST', '/akin/flaws', p),
        updateFlaw: (id: string, p: AnyObject) => request<any>('PUT', `/akin/flaws/${id}`, p),
        deleteFlaw: (id: string) => request<void>('DELETE', `/akin/flaws/${id}`),
    },

    // Akin (métodos "flat" para compat)
    getAkin: () => request<any>('GET', '/akin'),
    saveAkinProfile: (profile: AnyObject) => request<any>('PUT', '/akin', profile),
    addAbility: (p: AnyObject) => request<any>('POST', '/akin/abilities', p),
    updateAbility: (id: string, p: AnyObject) => request<any>('PUT', `/akin/abilities/${id}`, p),
    deleteAbility: (id: string) => request<void>('DELETE', `/akin/abilities/${id}`),
    addVirtue: (p: AnyObject) => request<any>('POST', '/akin/virtues', p),
    updateVirtue: (id: string, p: AnyObject) => request<any>('PUT', `/akin/virtues/${id}`, p),
    deleteVirtue: (id: string) => request<void>('DELETE', `/akin/virtues/${id}`),
    addFlaw: (p: AnyObject) => request<any>('POST', '/akin/flaws', p),
    updateFlaw: (id: string, p: AnyObject) => request<any>('PUT', `/akin/flaws/${id}`, p),
    deleteFlaw: (id: string) => request<void>('DELETE', `/akin/flaws/${id}`),

    // Debug
    pingDb: () => request<{ ok: boolean }>('GET', '/_debug/ping-db', undefined, { timeoutMs: 8000 }),
}

export default api

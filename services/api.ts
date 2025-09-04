// src/services/api.ts
// Camada REST com:
// - Seleção de base URL por ambiente (Vercel, local, override via ENV/Window)
// - Timeout (AbortController), retries com backoff + jitter
// - Tratamento de erros padronizado (ApiError)
// - Modo DEBUG com checklist de "Failed to fetch" (CORS/HTTPS/DNS/Serverless/etc.)

type AnyObject = Record<string, any>;

// ===== Ajuste o fallback de produção para o SEU backend =====
const PROD_API_FALLBACK = 'https://biblioteca-backend-nine-beta.vercel.app/api/';

// Em prod (Vercel) o cold start pode demorar um pouco → timeout um pouco maior
const DEFAULT_TIMEOUT_MS =
    typeof window !== 'undefined' && location.hostname.endsWith('vercel.app') ? 20000 : 15000;

const DEFAULT_RETRIES = 2;

// ================== Debug flags via build ou runtime ==================
const debugFlag =
    (typeof window !== 'undefined' && (window as any).__API_DEBUG === true) ||
    import.meta?.env?.VITE_API_DEBUG === 'true';

let __DEBUG = !!debugFlag;
let __BASE_OVERRIDE: string | null =
    (typeof window !== 'undefined' && (window as any).__API_BASE_URL) || null;

export function setDebug(v: boolean) {
    __DEBUG = v;
}
export function setBaseURL(url: string) {
    __BASE_OVERRIDE = url;
}

function log(...args: any[]) {
    if (__DEBUG) console.log('[API]', ...args);
}
function logErr(...args: any[]) {
    console.error('[API]', ...args);
}

// ================== Base URL ==================
function getBaseURL(): string {
    // 1) Override em runtime (útil para depuração sem rebuild)
    if (__BASE_OVERRIDE) return stripSlash(__BASE_OVERRIDE);

    // 2) ENV do Vite (defina VITE_API_BASE no frontend para alternar ambientes)
    const fromEnv = import.meta?.env?.VITE_API_BASE?.toString().trim();
    if (fromEnv) return stripSlash(fromEnv);

    // 3) Produção Vercel → aponta para o backend deployado
    if (typeof window !== 'undefined' && location.hostname.endsWith('vercel.app')) {
        return PROD_API_FALLBACK;
    }

    // 4) Local
    return 'http://localhost:3000/api';
}

function stripSlash(u: string) {
    return u.endsWith('/') ? u.slice(0, -1) : u;
}

// ================== Núcleo de requests ==================
class ApiError extends Error {
    status?: number;
    url?: string;
    original?: unknown;

    constructor(message: string, status?: number, url?: string, original?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.url = url;
        this.original = original;
    }
}

function redacted(value: any) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function backoff(attempt: number) {
    // expo + jitter
    return 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
}

async function safeJson(resp: Response) {
    const txt = await resp.text();
    try {
        return JSON.parse(txt);
    } catch {
        return txt || null;
    }
}

function extractServerMessage(payload: unknown): string | null {
    try {
        if (payload && typeof payload === 'object') {
            const p = payload as any;
            if (typeof p.error === 'string') return p.error;
            if (typeof p.message === 'string') return p.message;
            if (Array.isArray(p.details)) return p.details.join(' | ');
        }
    } catch {}
    return null;
}

async function coreRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: AnyObject,
    opts?: { timeoutMs?: number; headers?: AnyObject; retries?: number }
): Promise<T> {
    const base = getBaseURL();
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: AnyObject = { 'Content-Type': 'application/json', ...(opts?.headers || {}) };
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = Math.max(0, opts?.retries ?? DEFAULT_RETRIES);

    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const group = __DEBUG ? console.groupCollapsed : null;
        if (group) console.groupCollapsed(`%c${method} ${url} [${attempt + 1}/${retries + 1}]`, 'color:#888');

        try {
            log('→ Request', {
                url,
                method,
                headers,
                body: method !== 'GET' && method !== 'DELETE' ? redacted(body) : undefined,
            });

            const resp = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(body ?? {}) : undefined,
                signal: controller.signal,
                // credentials: 'include', // habilite se usar cookies/sessão
            });

            clearTimeout(timer);

            if (!resp.ok) {
                const payload = await safeJson(resp);
                const msg = extractServerMessage(payload) || `HTTP ${resp.status}`;
                throw new ApiError(msg, resp.status, url, payload);
            }

            const data = (await safeJson(resp)) as T;
            log('← OK', data);
            if (group) console.groupEnd?.();
            return data;
        } catch (err: any) {
            clearTimeout(timer);
            lastErr = err;

            const isAbort = err?.name === 'AbortError';
            const isNetwork = err instanceof TypeError && String(err.message || '').includes('Failed to fetch');

            if (group) {
                console.warn('! Falhou', err);
                console.groupEnd?.();
            }

            // No último attempt, imprime um checklist para ajudar
            if (attempt === retries) {
                if (isAbort) {
                    logErr('[API][Timeout]', { url, timeoutMs });
                } else if (isNetwork) {
                    logErr('[API][Diagnóstico rápido] Possíveis causas para "Failed to fetch":');
                    logErr('  • CORS no backend (ALLOWED_ORIGINS não inclui o domínio do front)');
                    logErr('  • URL incorreta (verifique getBaseURL / VITE_API_BASE)');
                    logErr('  • HTTP vs HTTPS (mixed content)');
                    logErr('  • DNS/SSL/Certificado inválido no host');
                    logErr('  • Serverless sem export default app (Vercel) ou cold start lento');
                    logErr('  • Bloqueio por adblock/extensão (tente aba anônima)');
                    logErr('  • Resposta muito lenta (aumente timeoutMs)');
                } else {
                    logErr('[API][Erro final]', err);
                }
            }

            // Tenta novamente se for abort/network e ainda houver retries
            if ((isAbort || isNetwork) && attempt < retries) {
                await sleep(backoff(attempt));
                continue;
            }

            throw new ApiError(
                isAbort ? `Tempo esgotado após ${timeoutMs}ms: ${url}` : `Falha de rede: ${String(err?.message || err)}`,
                undefined,
                url,
                err
            );
        }
    }

    // Teoricamente não chega aqui, mas por segurança:
    throw new ApiError(String(lastErr?.message || lastErr || 'Erro desconhecido'));
}

// ================== API pública ==================
export const api = {
    // Library
    list: () => coreRequest<any[]>('GET', '/library'),
    get: (id: string) => coreRequest<any>('GET', `/library/${id}`),
    create: (payload: AnyObject) => coreRequest<any>('POST', '/library', payload),
    update: (id: string, payload: AnyObject) => coreRequest<any>('PUT', `/library/${id}`, payload),
    remove: (id: string) => coreRequest<void>('DELETE', `/library/${id}`),

    // Akin
    getAkin: () => coreRequest<any>('GET', '/akin'),
    saveAkinProfile: (profile: AnyObject) => coreRequest<any>('PUT', '/akin', profile),
    addAbility: (payload: AnyObject) => coreRequest<any>('POST', '/akin/abilities', payload),
    updateAbility: (id: string, payload: AnyObject) => coreRequest<any>('PUT', `/akin/abilities/${id}`, payload),
    deleteAbility: (id: string) => coreRequest<void>('DELETE', `/akin/abilities/${id}`),
    addVirtue: (payload: AnyObject) => coreRequest<any>('POST', '/akin/virtues', payload),
    updateVirtue: (id: string, payload: AnyObject) => coreRequest<any>('PUT', `/akin/virtues/${id}`, payload),
    deleteVirtue: (id: string) => coreRequest<void>('DELETE', `/akin/virtues/${id}`),
    addFlaw: (payload: AnyObject) => coreRequest<any>('POST', '/akin/flaws', payload),
    updateFlaw: (id: string, payload: AnyObject) => coreRequest<any>('PUT', `/akin/flaws/${id}`, payload),
    deleteFlaw: (id: string) => coreRequest<void>('DELETE', `/akin/flaws/${id}`),

    // Debug
    pingDb: () => coreRequest<{ ok: boolean }>('GET', '/_debug/ping-db', undefined, { timeoutMs: 8000 }),
};

export default api;

// ================== Dicas rápidas ==================
//
// 1) Ativar logs de depuração:
//      window.__API_DEBUG = true         // runtime
//   ou setDebug(true)                    // via código
//   ou VITE_API_DEBUG=true               // build
//
// 2) Forçar a base em produção (sem rebuild):
//      window.__API_BASE_URL = 'https://SEU-BACKEND.vercel.app/api'
//   ou setBaseURL('https://.../api')
//
// 3) Em produção, garanta no backend (Vercel) a ENV:
//    ALLOWED_ORIGINS = https://SEU-FRONT.vercel.app, http://localhost:5173

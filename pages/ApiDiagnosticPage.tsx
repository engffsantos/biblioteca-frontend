// src/pages/ApiDiagnosticPage.tsx
// Página de diagnóstico: testa base da API, DB e CRUD completo.
// Também permite trocar a base em runtime e liga o modo debug.

import React, { useEffect, useMemo, useState } from 'react';
import api, { setDebug, setBaseURL, getBaseURL } from '../services/api';

type TestStatus = 'idle' | 'running' | 'success' | 'failure';

const StatusBadge: React.FC<{ status: TestStatus }> = ({ status }) => {
    const color = {
        idle: 'bg-gray-500',
        running: 'bg-yellow-500',
        success: 'bg-green-500',
        failure: 'bg-red-500',
    }[status];
    const text = {
        idle: 'Pronto',
        running: 'Rodando...',
        success: 'Sucesso',
        failure: 'Falha',
    }[status];

    return <span className={`inline-block px-3 py-1 text-sm rounded-full text-white ${color}`}>{text}</span>;
};

const ApiDiagnosticPage: React.FC = () => {
    const initialBase = useMemo(
        () => (typeof window !== 'undefined'
                ? (window as any).__API_BASE_URL ||
                (import.meta as any).env?.VITE_API_URL ||
                (import.meta as any).env?.VITE_BACKEND_URL ||
                (import.meta as any).env?.VITE_API_BASE ||
                getBaseURL()
                : getBaseURL()
        ),
        []
    );

    const [url, setUrl] = useState<string>(initialBase);
    const [tests, setTests] = useState<{ name: string; status: TestStatus; result: string }[]>([]);
    const [debugOn, setDebugOn] = useState<boolean>(true);

    useEffect(() => {
        // Liga debug e força base ao abrir a página
        setDebug(debugOn);
        setBaseURL(url);
        // Reflete também em window para facilitar inspeção:
        (window as any).__API_DEBUG = debugOn;
        (window as any).__API_BASE_URL = url;
    }, [url, debugOn]);

    const runTests = async () => {
        setTests([
            { name: 'GET /library', status: 'running', result: '' },
            { name: 'GET /akin', status: 'running', result: '' },
            { name: 'CRUD /library (POST → GET → PUT → DELETE)', status: 'running', result: '' },
            { name: 'GET /_debug/ping-db', status: 'running', result: '' },
        ]);

        try {
            // 1) GET /library
            const list = await api.list();
            setTests(prev => prev.map(t =>
                t.name === 'GET /library'
                    ? { ...t, status: 'success', result: `OK (${Array.isArray(list) ? list.length : 0} itens)` }
                    : t
            ));

            // 2) GET /akin
            const akin = await api.getAkin();
            setTests(prev => prev.map(t =>
                t.name === 'GET /akin'
                    ? { ...t, status: 'success', result: `OK (profile ${akin?.profile ? 'presente' : 'vazio'})` }
                    : t
            ));

            // 3) CRUD completo
            const created = await api.create({
                type: 'Tractatus',
                title: 'Item de Teste (Diagnóstico)',
                author: 'Diagnóstico',
                subject: 'Teste',
                quality: 10,
                notes: 'criado pelo diagnóstico',
            });
            const fetched = await api.get(created.id);
            const updated = await api.update(created.id, { ...fetched, notes: 'atualizado pelo diagnóstico' });
            await api.remove(updated.id);

            setTests(prev => prev.map(t =>
                t.name === 'CRUD /library (POST → GET → PUT → DELETE)'
                    ? { ...t, status: 'success', result: `OK (id ${created.id.slice(0, 8)}...)` }
                    : t
            ));

            // 4) DB ping
            const dbStatus = await api.pingDb();
            setTests(prev => prev.map(t =>
                t.name === 'GET /_debug/ping-db'
                    ? { ...t, status: dbStatus?.ok ? 'success' : 'failure', result: dbStatus?.ok ? 'Banco OK' : 'Banco indisponível' }
                    : t
            ));
        } catch (e: any) {
            // Marca todos os que estiverem "running" como falha
            setTests(prev => prev.map(t =>
                t.status === 'running'
                    ? { ...t, status: 'failure', result: e?.message || 'Erro de rede ou servidor' }
                    : t
            ));
            // Deixe o erro escorrer para o banner global via hooks (se vier dos hooks)
            // Aqui estamos usando chamadas diretas => mostramos inline
            console.error('[Diagnóstico] Falha:', e);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-3xl font-bold text-white">Diagnóstico de API</h1>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Informações de Conexão</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">URL da API</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-accent"
                            placeholder="https://.../api"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Base efetiva (getBaseURL): <code className="text-gray-300">{getBaseURL()}</code>
                        </p>
                    </div>

                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={debugOn}
                                onChange={(e) => setDebugOn(e.target.checked)}
                            />
                            <span className="text-gray-300">Debug ativo</span>
                        </label>
                    </div>

                    <div className="md:col-span-3">
                        <button
                            onClick={runTests}
                            className="bg-green-accent text-gray-950 font-bold py-2 px-4 rounded-lg hover:bg-green-accent/80 transition-colors"
                        >
                            Executar Testes
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Resultados</h2>
                <div className="space-y-3">
                    {tests.map(test => (
                        <div key={test.name} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-800 p-4 rounded-lg">
                            <div className="flex-1 text-white font-medium">{test.name}</div>
                            <StatusBadge status={test.status} />
                            {test.result && <div className="text-sm text-gray-400 md:ml-3">{test.result}</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Dicas de Solução de Problemas</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                    <li>Confirme a URL da API (acima) — em produção, use HTTPS e o domínio Vercel do backend.</li>
                    <li>Verifique as permissões de <strong>CORS</strong> no backend, incluindo o domínio do frontend (e previews).</li>
                    <li>Cheque a aba <em>Network</em> e o console do navegador para detalhes (status, headers, CORS, preflight).</li>
                    <li>O backend expõe <code>/api/health</code> e <code>/api/_debug/ping-db</code> para testes rápidos.</li>
                </ul>
            </div>
        </div>
    );
};

export default ApiDiagnosticPage;

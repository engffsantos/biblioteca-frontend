// vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        // Para dev local: proxy opcional para o backend
        server: {
            proxy: {
                '/api': {
                    target: env.VITE_PROXY_API || 'http://localhost:3000',
                    changeOrigin: true,
                },
            },
        },
        // Para 'vite preview' (opcional)
        preview: {
            port: 4173,
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        define: {
            // Caso precise expor chaves não sensíveis (ex.: modo demo)
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        },
    };
});

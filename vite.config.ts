import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'node:path';
import manifest from './src/manifest';

export default defineConfig({
    plugins: [crx({ manifest })],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                viewer: resolve(__dirname, 'src/viewer/viewer.html'),
            },
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});

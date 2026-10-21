import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
    manifest_version: 3,
    name: 'Claude Exporter',
    version: pkg.version,
    description:
        'Export Claude conversations to Markdown, HTML, PDF, JSON or plain text, images included. Runs entirely in your browser.',
    icons: {
        '16': 'src/icons/icon-16.png',
        '32': 'src/icons/icon-32.png',
        '48': 'src/icons/icon-48.png',
        '128': 'src/icons/icon-128.png',
    },
    action: {
        default_title: 'Claude Exporter',
        default_popup: 'src/popup/popup.html',
        default_icon: {
            '16': 'src/icons/icon-16.png',
            '32': 'src/icons/icon-32.png',
            '48': 'src/icons/icon-48.png',
            '128': 'src/icons/icon-128.png',
        },
    },
    permissions: ['storage'],
    host_permissions: ['https://claude.ai/*'],
    content_scripts: [
        {
            matches: ['https://claude.ai/*'],
            js: ['src/content/content.ts'],
            run_at: 'document_idle',
        },
    ],
});

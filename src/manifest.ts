import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
    manifest_version: 3,
    name: 'Claude Exporter',
    version: '0.1.0',
    description:
        'Export claude.ai conversations to Markdown, HTML, or PDF. Privacy-first, fully local.',
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
    web_accessible_resources: [
        {
            resources: ['src/viewer/viewer.html'],
            matches: ['<all_urls>'],
        },
    ],
});

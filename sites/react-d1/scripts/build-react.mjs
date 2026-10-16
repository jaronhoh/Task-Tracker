import { build } from 'vite';
await build({ configFile: new URL('../frontend/vite.config.ts', import.meta.url).pathname });

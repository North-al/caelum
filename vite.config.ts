// @ts-ignore

import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from "vite";
import { createPlugins } from './vite'

// process is a node js global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./src', import.meta.url)),
            // html2pdf → html2canvas cannot parse oklch (Tailwind/shadcn); use the pro fork.
            html2canvas: fileURLToPath(new URL('./node_modules/html2canvas-pro', import.meta.url)),
        },
    },
    plugins: createPlugins(),

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));

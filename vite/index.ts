import react from "@vitejs/plugin-react"
import tailwindcss from '@tailwindcss/vite'
import { createAutoImport } from './modules/autoImport'


export const createPlugins = () => {
    return [
        react(),
        tailwindcss(),
        createAutoImport()
    ]
}
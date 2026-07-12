import AutoImport from 'unplugin-auto-import/vite'

export function createAutoImport() {
    return AutoImport({
        imports: [
            'react',
            'react-dom',
            {
                // add any other imports you were relying on
                // 'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
            },
        ],
        dts: 'src/types/auto-imports.d.ts',
        dirs: [],
        // vueTemplate: true,
        eslintrc: {
            enabled: true, // Default `false`
            filepath: './.eslintrc-auto-import.json', // Default `./.eslintrc-auto-import.json`
            globalsPropValue: true, // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
        },
        resolvers: [],
    })
}

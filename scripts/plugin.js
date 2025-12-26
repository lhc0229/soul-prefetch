import terser from '@rollup/plugin-terser'

export default {
    input: 'src/index.js',
    output: {
        format: 'es',
        file: 'index.js',
        name: 'prefetch',
        sourcemap: false
    },
    external: ['path', 'fs', 'url'],
    plugins: [
        terser({
            compress: {
                drop_console: false,
                drop_debugger: true,
                passes: 2,
            },
            mangle: {
                toplevel: true,
            },
            sourceMap: false,
        })
    ]
}

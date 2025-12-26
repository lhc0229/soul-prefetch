import terser from '@rollup/plugin-terser'

export default {
    input: 'src/core/prefetch.js',
    output: {
        format: 'iife',
        file: 'dist/prefetch.js',
        name: 'prefetch',
        sourcemap: false
    },
    plugins: [
        terser({
            compress: {
                drop_console: false,
                drop_debugger: true,
                passes: 2
            },
            mangle: {
                toplevel: true,
            },
            sourceMap: false,
        })
    ]
}

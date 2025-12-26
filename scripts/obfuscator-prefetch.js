import Obfuscator from 'javascript-obfuscator'

const options = {
    compact: true,
    controlFlowFlattening: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
    reserved: ['t', 'prefetch', 'Spa', 'getPagePath', 'createPrefetch'],
};

const obfuscatorPlugin = () => {
    return {
        name: 'custom-javascript-obfuscator',
        renderChunk(code, chunk) {
            if (chunk.fileName === 'prefetch.js') {
                const obfuscationResult = Obfuscator.obfuscate(code, options)
                return {
                    code: obfuscationResult.getObfuscatedCode(),
                    map: null
                }
            }
            return null
        }
    }
}


export default {
    input: 'src/core/prefetch.js',
    output: {
        format: 'iife',
        file: 'dist/prefetch.js',
        name: 't',
        sourcemap: false
    },
    plugins: [
        obfuscatorPlugin()
    ]
}

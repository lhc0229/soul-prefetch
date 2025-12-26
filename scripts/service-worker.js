import Obfuscator from 'javascript-obfuscator'

const options = {
    compact: true,
    controlFlowFlattening: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
    reserved: ['t', 'startServiceWorker'],
};

const obfuscatorPlugin = () => {
    return {
        name: 'custom-javascript-obfuscator',
        renderChunk(code, chunk) {
            if (chunk.fileName === 'service-worker.js') {
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
    input: 'src/core/service-worker.js',
    output: {
        format: 'iife',
        file: 'dist/service-worker.js',
        name: 't',
        sourcemap: false
    },
    plugins: [
        obfuscatorPlugin()
    ]
}

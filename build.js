import { promisify } from 'util';
import { exec as execCallback } from 'child_process'
const exec = promisify(execCallback)

const build = async () => {
    await exec('rollup -c scripts/service-worker.js')
    await exec('rollup -c scripts/service-worker-register.js')
    await exec('rollup -c scripts/obfuscator-prefetch.js')
    await exec('node scripts/write-template.js')
    await exec('rollup -c scripts/plugin.js')
    await exec('node scripts/complete.js')
}

build().then()

import fs from "fs"
import path from "path"

const escape = (content) => {
    return content
        .replaceAll(/\\/g, '\\\\')
        .replaceAll(/'/g, "\\'")
        .replaceAll(/"/g, '\\"')
        .replaceAll(/\n/g, '\\n')
        .replaceAll(/\r/g, '\\r')
        .replaceAll(/\t/g, '\\t')
}

// 把创建src/index.js副本(src/template.js)，并把prefetch打包之后的内容写入到src/index.js里面
const writeTemplate = async () => {
    const prefetch_path = path.resolve(process.cwd(), 'dist/prefetch.js')
    let prefetch_content = await fs.promises.readFile(prefetch_path, 'utf-8')
    prefetch_content = escape(prefetch_content)

    const plugin_path = path.resolve(process.cwd(), 'src/index.js')
    let plugin_content = await fs.promises.readFile(plugin_path, 'utf-8')
    const template_path = path.resolve(process.cwd(), 'src/template.js')
    await fs.promises.writeFile(template_path, plugin_content)

    plugin_content = plugin_content.replace('{{prefetch_build_content}}',prefetch_content)

    const service_worker_path = path.resolve(process.cwd(), 'dist/service-worker.js')
    const service_worker_content = escape(await fs.promises.readFile(service_worker_path, 'utf-8'))
    plugin_content = plugin_content.replace('{{service_worker_content}}',service_worker_content)

    const service_worker_register_path = path.resolve(process.cwd(), 'dist/service-worker-register.js')
    const service_worker_register_content = escape(await fs.promises.readFile(service_worker_register_path, 'utf-8'))
    plugin_content = plugin_content.replace('{{service_worker_register_content}}',service_worker_register_content)

    await fs.promises.writeFile(plugin_path, plugin_content)
}

writeTemplate().then()

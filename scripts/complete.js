import fs from "fs"
import path from "path"

const complete = async () => {
    const template_path = path.resolve(process.cwd(), 'src/template.js')
    const prefetch_path = path.resolve(process.cwd(), 'dist/prefetch.js')
    const template_content = await fs.promises.readFile(template_path, 'utf-8')
    const plugin_path = path.resolve(process.cwd(), 'src/index.js')
    await fs.promises.writeFile(plugin_path, template_content)
    await fs.promises.unlink(template_path)
    await fs.promises.unlink(prefetch_path)
    await fs.promises.rm(path.resolve(process.cwd(), 'dist'), { recursive: true, force: true })
}

complete().then()

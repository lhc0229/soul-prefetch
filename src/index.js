import path from "path"
import fs from "fs"

const prefetch_list = []

// 打包之后输出的静态文件夹路径，默认是 项目根路径/dist
let out_dir

// 打包之后输出的静态文件夹名称,默认是 dist
let build_dir_name

const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

const addPathPrefix = (path) => path.startsWith("/") ? path : `/${path}`

const isString = (data) => Object.prototype.toString.call(data) === '[object String]'

const isArray = (data) => Object.prototype.toString.call(data) === '[object Array]'

// 兼容component路径非/开头的情况，例如 src/components/child/child.jsx，以及比对source,target在打包之前是否是同一个组件
const isSameComponent = (source,target) => source.startsWith('/') ? source === target : `/${source}` === target

const createPrefetchComponent = ({ component, chunk_name, list }) => {

    const addPrefetchComponent = (route, chunk_name) => {
        const target = prefetch_list.find(item => item.route === route)
        if(target) return !target.component.includes(chunk_name) && target.component.push(chunk_name)
        prefetch_list.push({ route, component: [ chunk_name ] })
    }

    list.forEach(item => {
        const { route } = item
        if(!isArray(item.component) && !isString(item.component)) return
        if(isString(item.component)) return isSameComponent(item.component,component) && addPrefetchComponent(route,chunk_name)

        const children = item.component
        children.forEach(child => {
            isSameComponent(child,component) && addPrefetchComponent(route,chunk_name)
        })
    })
}

const createRootPrefetchList = (path) => {
    const target = prefetch_list.find(item=>!item.route)
    if(target && !target.component.includes(path)){
        target.component.push(path)
        return
    }
    if(!target){
        // route: '' 代表首屏需要prefetch加载的资源
        prefetch_list.push({ route: '', component: [path] })
    }
}

const initOptions = (options) => {
    const micro_prefetch = options['micro_prefetch'] || []

    const option_component_prefetch = options['component_prefetch'] || {}
    const component_prefetch = {
        base: option_component_prefetch.base || '/',
        prefetch_base: option_component_prefetch.prefetch_base || '/',
        list: option_component_prefetch.list || []
    }

    const option_root_prefetch = options['root_prefetch'] || {}
    const root_prefetch = {
        base: option_root_prefetch.base || '/',
        list: option_root_prefetch.list || []
    }

    const option_service_worker = options['service_worker'] || {}
    const service_worker = {
        enable: option_service_worker.enable || false,
        base: option_service_worker.base || '/'
    }

    return { micro_prefetch, component_prefetch, service_worker_config: service_worker, root_prefetch }
}

const soulPrefetchPlugin = (options) => {

    const {
        micro_prefetch,
        component_prefetch,
        service_worker_config,
        root_prefetch
    } = initOptions(options)

    return {
        name: 'prefetch',
        configResolved(config) {
            out_dir = path.resolve(config.root, config.build.outDir)
            build_dir_name = config.build.outDir
        },
        generateBundle(options, bundle) {
            Object.keys(bundle).forEach(key => {
                const module = bundle[key]

                if(root_prefetch.list && root_prefetch.list.length){
                    const original_file_name = (module.originalFileNames || [])[0] || ''
                    const name = module.name || ''
                    const bool = root_prefetch.list.some(item => original_file_name.includes(item) || name.includes(item))
                    bool && createRootPrefetchList(`${root_prefetch.base}${module.fileName}`)
                }

                if(module.type === 'chunk' && module.facadeModuleId){
                    const component = `/${path.relative(process.cwd(), module.facadeModuleId).replace(/\\/g, '/')}`
                    const chunk_name = `${component_prefetch.base}${module.fileName}`
                    createPrefetchComponent({ component, chunk_name, list: component_prefetch.list })
                }
                if (module.type === 'asset') {
                    const original_list = module.originalFileNames
                    const asset_name = `${component_prefetch.base}${module.fileName}`
                    original_list.forEach(original_name => {
                        createPrefetchComponent({ component: addPathPrefix(original_name), chunk_name: asset_name, list: component_prefetch.list })
                    })
                }
            })
        },
        async closeBundle(){
            const entry = path.join(out_dir, 'index.html')
            if (!fs.existsSync(entry)) return

            await fs.mkdir(path.join(out_dir, 'performance'), { recursive: true }, ()=>{})
            const prefetch_file_name = `performance/prefetch-${uuid().slice(0,8)}.js`

            // content为src/core/prefetch.js打包混淆之后的代码
            const prefetch_content = "{{prefetch_build_content}}"
            let content = `${prefetch_content}\nt.prefetch([])`
            content = content.replace('t.prefetch([])',`t.prefetch(${JSON.stringify({list: prefetch_list, micro_list: micro_prefetch})})`)
            await fs.promises.writeFile(path.join(out_dir, prefetch_file_name), content)

            let head = `  </head>`
            if(service_worker_config.enable){
                const file_name = `performance/service-worker-${uuid().slice(0,8)}.js`
                const register_name = `performance/service-worker-register-${uuid().slice(0,8)}.js`

                const service_worker_register = path.join(out_dir, `${register_name}`)
                const service_worker_register_options = {
                    path: `${service_worker_config.base || '/'}${file_name}`
                }
                let service_worker_register_content = "{{service_worker_register_content}}"
                service_worker_register_content = `${service_worker_register_content}\nt.registerServiceWorker(${JSON.stringify(service_worker_register_options)})`
                await fs.promises.writeFile(service_worker_register, service_worker_register_content)
                head =  `    <script defer src="${service_worker_config.base || '/'}${register_name}"></script>\n` + head

                const service_worker = path.join(out_dir, `${file_name}`)
                const service_worker_options = {
                    version: uuid().slice(0,8),
                    prefetch_list: prefetch_list.map(item=>item.component).flat(),
                }
                let service_worker_content = "{{service_worker_content}}"
                service_worker_content = `${service_worker_content}\nt.startServiceWorker(${JSON.stringify(service_worker_options)})`
                await fs.promises.writeFile(service_worker, service_worker_content)
                head =  `    <script defer src="${service_worker_config.base || '/'}${file_name}"></script>\n` + head
            }

            let html = await fs.promises.readFile(entry, 'utf-8')

            head = `  <script async src="${component_prefetch.prefetch_base}${prefetch_file_name}"></script>\n${head}\n`

            html = html.replace('</head>',head)
            await fs.promises.writeFile(entry, html)
        }
    }
}

export default soulPrefetchPlugin

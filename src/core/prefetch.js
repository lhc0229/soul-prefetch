/*
* prefetch需要结合延迟加载 + 强缓存，才能达到前端性能优化的最大效果
* 对于首屏非必要的资源可以采用动态加载/懒加载，例如弹窗组件、地图组件等等，可以使用prefetch 在浏览器空闲,网络环境较好,以及控制并发的情况下去预先获取，从而提高用户的体验，优化前端性能
* */

import { entry, hasProtocol } from "./micro"

class Spa {
    constructor() {
        if (Spa.instance) return Spa.instance
        Spa.instance = this
        this.initialization = false
    }
    init() {
        if (this.initialization) return
        this.wrapHistoryMethod('pushState')
        this.wrapHistoryMethod('replaceState')
        this.initialization = true
    }

    wrapHistoryMethod(eventName) {
        const originalEvent = history[eventName]
        if (!originalEvent || originalEvent[Symbol.for('isWrappedBySpaMonitor')]) {
            return
        }
        history[eventName] = function(...args) {
            const result = originalEvent.apply(this, args)
            const event = new Event(eventName)
            event.arguments = args
            window.dispatchEvent(event)
            return result
        }
        history[eventName][Symbol.for('isWrappedBySpaMonitor')] = true
    }
}

// 获取当前页面path
const getPagePath = () => {
    const hash = window.location.hash
    const bool = hash.startsWith('#')
    return bool ? hash.slice(1).split('?')[0] :  window.location.pathname
}

const isArray = (data) => Object.prototype.toString.call(data) === '[object Array]'

// 创建prefetch并发限制，默认一次最多同时触发3个prefetch
const createConcurrency = (limit = 3) => {
    let running_count = 0
    let queue = []

    const next = () => {
        if (running_count >= limit || queue.length === 0) return
        const fn = queue.shift()
        running_count++
        fn().finally(() => {
            running_count--
            next()
        })
    }

    const addTask = (task) => {
        return new Promise((resolve, reject) => {
            queue.push(() => task().then(resolve, reject))
            next()
        })
    }

    const cleanQueue = () => {
        running_count = 0
        queue = []
    }

    return { addTask, cleanQueue }
}

const { addTask, cleanQueue } = createConcurrency()

const setVideoType = (link,type) => {
    const video_type_list = ['mp4','webm']
    if(video_type_list.includes(type)) link.as = 'video'
}

const setAudioType = (link,type) => {
    const audio_type_list = ['mp3','m4a','ogg','opus','ogg','flac']
    if(audio_type_list.includes(type)) link.as = 'audio'
}

const setFontType = (link,type) => {
    const font_type_list = ['woff2','woff','ttf','otf']
    if(!font_type_list.includes(type)) return
    link.as = 'font'
    link.type = `font/${type}`
}

const setImageType = (link,type) => {
    const image_type_list = ['webp','avif','jpg','jpeg','png','gif','svg']
    if(!image_type_list.includes(type)) return
    link.as = 'image'
    if(type === 'svg') link.type = 'image/svg+xml'
    if(['avif','webp','png','gif'].includes(type)) link.type = `image/${type}`
    if(['jpg','jpeg'].includes(type)) link.type = `image/jpeg`
}

const prefetched = new Set()

// 异步创建prefetch，在浏览器空闲时，网络良好的时候去预获取未来可能需要加载额静态资源
// Safari浏览器在市场上占用率极小，不考虑Safari的兼容问题
// 设计如此，只支持我目前编写的静态资源类型
const createPrefetch = (component) => {
    if (prefetched.has(component)) return Promise.resolve() // 防止重复创建
    return new Promise((resolve) => {
        const link = document.createElement('link')
        const list = component.split('.')
        const type = list[list.length - 1]
        const as_map = {
            js: 'script',
            css: 'style'
        }
        if(as_map[type]) link.as = as_map[type]
        setVideoType(link,type)
        setAudioType(link,type)
        setFontType(link,type)
        setImageType(link,type)
        link.rel = 'prefetch'
        link.href = component
        if (['font', 'image', 'video', 'audio'].includes(link.as)) link.crossOrigin = 'anonymous'

        const timeout = setTimeout(() => resolve(), 8000)
        const clean = () => {
            link.onload = link.onerror = null
            clearTimeout(timeout)
            resolve()
        }
        link.onload = () => {
            prefetched.add(component)
            clean()
        }
        link.onerror = clean
        document.head.appendChild(link)
    })
}

// 兼容safari浏览器
const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 150))

const listenRouteChange = async (list, micro_list) => {
    cleanQueue()

    // 弱网环境不进行prefetch
    const connection = navigator.connection || navigator['webkitConnection'] || navigator['mozConnection'] || {}
    if (connection['saveData'] || /2g/.test(connection['effectiveType'] || '')) return

    const page_path = getPagePath()

    if(micro_list && isArray(micro_list)){
        const micro = micro_list.find(item => page_path === item.route) // 设计如此，item.route的值一定会是纯路径
        if(micro && hasProtocol(micro['child_route'])){
            const micro_prefetch_list = await entry(micro['child_route'])
            micro_prefetch_list.forEach(url => {
                addTask(()=> createPrefetch(url))
            })
        }
    }

    const target = list.find(item => page_path === item.route) // 设计如此，item.route的值一定会是纯路径
    if(target) {
        const component_list = target.component || []
        component_list.forEach(component => {
            addTask(()=> createPrefetch(component))
        })
    }
}

const initRootPrefetchList = (list) => {
    const target = list.find(item => item.route === '')
    if(!target || !target.component || !target.component.length) return
    const connection = navigator.connection || navigator['webkitConnection'] || navigator['mozConnection'] || {}
    if (connection['saveData'] || /2g/.test(connection['effectiveType'] || '')) return
    target.component.forEach(component => {
        addTask(()=> createPrefetch(component))
    })
}

export const prefetch = ({ list, micro_list }) => {
    const spa = new Spa()
    spa.init()

    const initPerformance = () => {
        schedule(()=>{
            listenRouteChange(list, micro_list).then()
        })
    }

    initPerformance()

    schedule(()=>{
        initRootPrefetchList(list)
    })

    if (!window.__soul_spa_prefetch_init__) {
        window.addEventListener('replaceState', initPerformance)
        window.addEventListener('pushState', initPerformance)
        window.addEventListener('popstate', initPerformance)
        window.addEventListener('hashchange', initPerformance)
        window.__soul_spa_prefetch_init__ = true
    }
}

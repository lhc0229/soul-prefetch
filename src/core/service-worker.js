/*
* 要实现的功能
* 只缓存静态文件，其中index.html入口文件优先网络请求，其次才是缓存
* 除了静态文件之外的请求，默认不缓存，只使用网络
*
* */

export const startServiceWorker = ({ version, prefetch_list = [] }) => {
    const runtime = `runtime-${version}`
    const prefetch = `prefetch-${version}`
    const static_list = [
        'js','css','html',
        'webp','avif','jpg','jpeg','png','gif','svg',
        'woff2','woff','ttf','otf',
        'mp3','m4a','ogg','opus','ogg','flac',
        'mp4','webm'
    ]

    self.addEventListener('install', e => {
        self.skipWaiting()
        e.waitUntil(
            caches.open(prefetch).then(async c => {
                await Promise.all(
                    prefetch_list.map(url => fetch(url).then(res => {
                            if (res.ok) return c.put(url, res.clone())
                        }).catch(error => {
                            console.warn(`SW Install Error: Could not cache ${url}`, error);
                        })
                    )
                )
            })
        )
    })

    self.addEventListener('activate', e => {
        e.waitUntil(
            caches.keys().then(keys =>
                Promise.all(keys.filter(k => ![runtime, prefetch].includes(k)).map(k => caches.delete(k)))
            ).then(() => self.clients.claim())
        )
    })

    self.addEventListener('message', e => {
        if (e.data === 'skipWaiting') self.skipWaiting()
        if (e.data?.type === 'prefetch') {
            e.waitUntil(
                caches.open(prefetch).then(async c => {
                    for (const url of e.data.urls) {
                        try {
                            const res = await fetch(url)
                            if (res.ok) await c.put(url, res.clone())
                        } catch {}
                    }
                })
            )
        }
    })

    self.addEventListener('fetch', e => {
        if (e.request.method !== 'GET') return

        const url = new URL(e.request.url)
        const is_static = static_list.some(type => url.pathname.endsWith(`.${type}`))
        if(!is_static) return e.respondWith(fetch(e.request))

        const fetchAndCache = () => {
            return fetch(e.request).then(async res => {
                if (res.ok) {
                    const clone = res.clone()
                    const cache = await caches.open(runtime)
                    await cache.put(e.request, clone)
                }
                return res
            })
        }

        if(url.pathname.endsWith('index.html')) return e.respondWith(
            fetchAndCache().catch(()=> caches.match(e.request,{ ignoreSearch: true }))
        )

        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached
                return fetchAndCache()
            })
        )
    })
}

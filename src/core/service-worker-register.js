export const registerServiceWorker = async ({ path = '/service-worker.js', onUpdate } = {}) => {
    if (!('serviceWorker' in navigator)) return
    const service = await navigator.serviceWorker.register(path)

    service.addEventListener('updatefound', () => {
        const newSW = service.installing
        newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                onUpdate?.(() => newSW.postMessage('skipWaiting'))
            }
        })
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        location.reload()
    })

    new MutationObserver(() => {
        const urls = [...document.querySelectorAll('link[rel=prefetch][href]')].map(l => l.href)
        if (urls.length) service.active?.postMessage({ type: 'prefetch', urls })
    }).observe(document.head, { childList: true, subtree: true, attributes: true })
}

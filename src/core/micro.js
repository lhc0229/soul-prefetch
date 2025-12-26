/*
* 使用正则解析子应用的入口文件，提取js的加载url, css的加载url，然后调用createPrefetch
* 目前这个方案使用所有的微前端架构优化加载
* */

const ALL_SCRIPT_REGEX = /(<script[\s\S]*?>)[\s\S]*?<\/script>/gi
const SCRIPT_TAG_REGEX = /<(script)\s+((?!type=('|")text\/ng-template\3).)*?>.*?<\/\1>/is
const SCRIPT_SRC_REGEX = /.*\ssrc=('|")?([^>'"\s]+)/
const LINK_TAG_REGEX = /<(link)\s+.*?>/isg
const STYLE_TYPE_REGEX = /\s+rel=('|")?stylesheet\1.*/
const LINK_HREF_REGEX = /.*\shref=('|")?([^>'"\s]+)/
const LINK_PRELOAD_OR_PREFETCH_REGEX = /\srel=('|")?(preload|prefetch)\1/
const LINK_AS_FONT = /.*\sas=('|")?font\1.*/

export const hasProtocol = (url) => url.startsWith('http://') || url.startsWith('https://')

const getEntirePath = (path, baseURI) => new URL(path, baseURI).toString()

const parseUrl = (url) => {
    const parser = new DOMParser()
    const html = `<script src="${url}"></script>`
    const doc = parser.parseFromString(html, "text/html")
    return doc.scripts[0].src
}

const getPublicPath = (entry) => {
    const { origin, pathname } = new URL(entry, location.href)
    const paths = pathname.split('/')
    paths.pop()
    return `${origin}${paths.join('/')}/`
}

const addPrefetch = (list,url,baseURI) => {
    if(!url) return
    let target = url
    if(!hasProtocol(url)) target = getEntirePath(url, baseURI)
    target = parseUrl(target)
    if(!list.includes(target)) list.push(target)
}

const processTpl = (tpl, baseURI) => {
    const prefetch_list = []
    tpl.replace(ALL_SCRIPT_REGEX,(match, scriptTag)=>{
        if (SCRIPT_TAG_REGEX.test(match) && scriptTag.match(SCRIPT_SRC_REGEX)){
            const matchedScriptSrcMatch = scriptTag.match(SCRIPT_SRC_REGEX)
            let matchedScriptSrc = matchedScriptSrcMatch && matchedScriptSrcMatch[2]
            if(matchedScriptSrc){
                addPrefetch(prefetch_list, matchedScriptSrc, baseURI)
            }
        }
    }).replace(LINK_TAG_REGEX, match => {
        const styleType = !!match.match(STYLE_TYPE_REGEX)
        if (styleType) {
            const styleHref = match.match(LINK_HREF_REGEX)
            if (styleHref) {
                const href = styleHref && styleHref[2]
                addPrefetch(prefetch_list, href, baseURI)
                return
            }
        }
        const preloadOrPrefetchType = match.match(LINK_PRELOAD_OR_PREFETCH_REGEX) && match.match(LINK_HREF_REGEX) && !match.match(LINK_AS_FONT);
        if (preloadOrPrefetchType) {
            const [, , linkHref] = match.match(LINK_HREF_REGEX)
            addPrefetch(prefetch_list, linkHref, baseURI)
        }
    })

    return prefetch_list
}

export const entry = (url) => {
    return fetch(url).then(response => {
        if (!response.ok) return []
        return response.text().then(html => processTpl(html, getPublicPath(url))).catch(() => [])
    }).catch(() => [])
}


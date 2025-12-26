### 主要功能

在用户导航到指定的路由后，在浏览器空闲时，利用并发控制(默认最多同时进行3个prefetch)预请求可能需要的资源，从而加速后续页面的加载



### 实现原理

- 路由劫持
- 路由监听
- 并发控制
- 弱网环境优化
- 空闲时间调度
- 缓存去重



### 注意事项

- soul-prefetch需要结合动态加载或者是懒加载一起使用
- 建议在打包生成静态资源时建议加上hash
- 建议nginx对生成静态资源开启强缓存



### 在vite中的使用示例

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import soulPrefetchPlugin from "soul-prefetch"

export default defineConfig({
    plugins: [
      react(),
      soulPrefetchPlugin({
          service_worker: {
              enable: true,
              base: '/'
          },
          root_prefetch: {
              base: '/',
              list: ['vendor-tui-editor']
          },
          component_prefetch: {
              list: [
                  {
                      route: '/my',
                      component: ['src/components/child/child.jsx']
                  },
                  {
                      route: '/about',
                      component: ['src/assets/404.png', 'src/assets/401.gif']
                  }
              ],
              base: '/',
              prefetch_base: '/'
          },
          micro_prefetch: [
              {
                  route: '/dashboard', // 主应用激活路由
                  child_route: 'http://43.139.243.12:9039/#/login' // 预获取(prefetch)子应用静态资源
              }
          ]
      })
  ],
  build: {
        rollupOptions: {
            output: {
                entryFileNames: 'js/app-[hash].js',
                hashCharacters: 'hex',
                chunkFileNames: 'js/chunk-[hash].js',
                assetFileNames: (assetInfo) => {
                    const ext = assetInfo.name?.split('.').pop()
                    if (!ext) return 'other/chunk.[hash].[ext]'
                    if (ext === 'css') return 'css/chunk.[hash].[ext]'
                    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico', 'tif', 'tiff'].includes(ext)) return 'img/chunk.[hash].[ext]'
                    if (['mp3', 'm4a', 'ogg', 'opus', 'flac', 'mp4', 'webm', 'wav', 'aac', 'mov', 'avi'].includes(ext)) return 'media/chunk.[hash].[ext]'
                    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) return 'fonts/chunk.[hash].[ext]'
                    return 'other/chunk.[hash].[ext]'
                },
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('tui-editor')) {
                            return 'vendor-tui-editor';
                        }
                        return 'vendor';
                    }
                }
            }
        }
    }
})
```



### 参数说明

- options.component_prefetch

  ```
  options.component_prefetch中有三个参数
  
  options.component_prefetch.base
  可以自定义list中的component打包之后，在prefetch请求时的路径，默认是/，可以理解成在html中的<link rel="prefetch" as="script" href="/assets/child-CwXo10Bo.js">的assets/child-CwXo10Bo.js的前缀
  
  options.component_prefetch.prefetch_base
  soulPrefetchPlugin插件打包之后产生的prefetch文件默认是存放在打包之后的根目录(默认是dist)下，可以通过这个prefetch_base去修改路径，prefetch_base的默认值是/，可以理解成<script src="/prefetch-c07b4243.js"></script>中的prefetch-c07b4243.js的前缀
  
  options.component_prefetch.list
  是一个数组，每一个元素都有两个属性一个是route，一个是component
  
  如果当前激活路由和route是一致时，会对component进行prefetch
  
  component的值可以是字符串，也可以是字符串数组，但是命名规范必须是项目根目录下的第一级子目录开始，一直精确到要prefetch的组件，例如component的值为src/components/child/child.jsx，['src/components/child/child.jsx']皆可
  ```



- options.service_worker

  ```
  options.service_worker是配置是否开启ServiceWorker的参数，默认是关闭的
  
  options.service_worker.enable
  	是否开启ServiceWorker
  	
  options.service_worker.base    
  		service_worker文件默认是在打包产物的根目录下，通过index.html引入，options.service_worker.base这个参数调整src的加载路径，默认值为 /
  ```



- options.root_prefetch

  ```
  首屏加载页面时，对那些静态资源进行prefetch
  
  参数中的root_prefetch.list: ['vendor-tui-editor']
  	'vendor-tui-editor'的含义是对静态资源名称包含vendor-tui-editor的文件进行prefetch
  
  
  参数中的root_prefetch.base: '/'
  	静态资源root_prefetch.list请求前缀
  
  参考示例:
  vite.config.js文件中
  
  export default defineConfig({
      plugins: [
        react(),
        soulPrefetchPlugin({
            root_prefetch: {
                base: '/',
                list: ['vendor-tui-editor']
            },
        })
    ],
    build: {
          rollupOptions: {
              output: {
                  manualChunks(id) {
                      if (id.includes('node_modules')) {
                          if (id.includes('tui-editor')) {
                              return 'vendor-tui-editor';
                          }
                          return 'vendor';
                      }
                  }
              }
          }
      }
  })
  ```




- options.micro_prefetch

  ```
  该参数主要是用来处理微前端加载性能问题的
  micro_prefetch的元素是一个对象，对象中有两个值，分别是route,child_route
  当主应用访问路由route时，会对子应用路由child_route进行prefetch
  
  示例:
  micro_prefetch: [
    {
      route: '/dashboard', // 主应用激活路由
      child_route: 'http://43.139.243.12:9039/#/login' // 预获取(prefetch)子应用静态资源
    }
  ]
  当主应用访问路由/dashboard时，会对http://43.139.243.12:9039/#/login路由(子应用页面路由)进行解析html，并进行prefetch预获取
  ```

  

```js
const options = {
	service_worker: {
    enable: true,
    base: '/'
  },
  root_prefetch: {
    base: '/',
    list: ['vendor-tui-editor', 'vendor-codemirror']
  },
  component_prefetch: {
    base: '/',
    prefetch_base: '/',
    list: [
      {
        route: '/login',
        component: [
          '/src/component-bus/login/LoginModal.vue'
        ]
      },
      {
        route: '/zip',
        component: [
          '/src/component-bus/demo/Demo.vue'
        ]
      }
    ]
  },
  micro_prefetch: [
    {
      route: '/dashboard', // 主应用激活路由
      child_route: 'http://43.139.243.12:9039/#/login' // 预获取(prefetch)子应用静态资源
    }
  ]
}
soulPrefetchPlugin(options)
```



### 支持prefetch的类型

```
video: mp4,webm
audio: mp3,m4a,ogg,opus,ogg,flac
font: woff2,woff,ttf,otf
image: webp,avif,jpg,jpeg,png,gif,svg
javsscript: js
style: css
```



### 异常排查

如果出现不能prefetch的情况，建议查看控制台中的html源文件

- 查看prefetch文件是否正常加载，src是否存在正确
- 查看chunk文件是否正常加载，href路径是否正确

排查是否是因为options.prefetch_base和options.base参数问题引起的



#### 控制台的html源文件参照

```html
<!doctype html>
<html lang="en">
  <head>
    <!-- prefetch文件，options.prefetch_base可以设置前缀，默认是/ -->
    <script src="/prefetch-c07b4243.js"></script>
    
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    
    <!-- options.base可以设置前缀，默认是/ -->
    <link rel="prefetch" as="script" href="/assets/child-CqgVllEj.js">
    
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>vite-performance</title>
    <script type="module" crossorigin src="/assets/index-CBMg3xbQ.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```



### 解决的问题

一般情况下，我们导入组件时都是使用静态导入，但是有些组件是首屏加载非必要的组件(如弹窗组件)，就会使得首屏加载的体积变大，从而影响前端性能



使用延迟加载(动态导入)去加载组件，虽然可以实现首屏加载的体积变小，但是延迟加载存在一个核心的问题：就是需要的时候才会去请求加载，但是此时会存在网络问题，会有一定的延迟



soul-prefetch可以完美解决这个问题，soul-prefetch会在用户导航到指定的路由后，在浏览器空闲时，结合requestIdleCallback+网络环境+并发控制(默认最多同时进行3个prefetch)，去进行预请求可能需要的静态资源，从而优化用户的体验



同时支持在微前端应用中，在主应用中配置micro_list参数，soul-prefetch会解析子应用路由的入口文件html，预获取子应用的入口所需的静态资源

const methods = require('methods')
const compose = require('koa-compose')
const HttpError = require('http-error')
const Layer = require('./layer')

module.exports = Router

function Router(opts) {
    this.opts = opts || {}
    this.params = {}
    this.stack = [] // 存放中间件
    this.methods = this.opts.methods || [
        'HEAD',
        'OPTIONS',
        'GET',
        'PUT',
        'PATCH',
        'POST',
        'DELETE'
    ]
}

methods.forEach((method) => {
    Router.prototype[method] = function(name, path, middleware) {
        if (typeof path === 'string' || path instanceof RegExp) {
            middleware = Array.prototype.slice.call(arguments, 2)
        } else {
            middleware = Array.prototype.slice.call(arguments, 1)
            path = name
            name = null
        }
        this.register(path, [method], middleware, {
            name: name
        })
        return this
    }
})


Router.prototype.register = function(path, methods, middleware, opts) {
    opts = opts || {}
    var router = this
    var stack = this.stack

    // 如果路径是一个数组，则遍历每个路径，进行注册route
    if (Array.isArray(path)) {
        path.forEach(function(p) {
            router.register.call(router, p, methods, middleware, opts)
        })
        return this
    }

    // 创建单个路由组件
    var route = new Layer(path, methods, middleware, {
        end: opts.end === false ? opts.end : true,
        name: opts.name,
        sensitive: opts.sensitive || this.opts.sensitive || false,
        strict: opts.strict || this.opts.strict || false,
        prefix: opts.prefix || this.prefix || '',
        ignoreCaptures: opts.ignoreCaptures
    })

    if (this.opts.prefix) {
        route.setPrefix(this.opts.prefix)
    }

    // paramter 中间件
    Object.keys(this.params).forEach(function (param) {
        route.param(param, this.params[param])
    }, this)

    stack.push(route)

    return route

}

Router.prototype.match = function(path, method) {
    var layers = this.stack
    var layer
    var matched = {
        path: [],
        pathAndMethod: [],
        route: false
    }
    for (var len = layers.length, i = 0; i < len; i++) {
        layer = layers[i]
        if (layer.match(path)) {
            matched.path.push(layer)
            if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
                matched.pathAndMethod.push(layer)
                if (layer.methods.length) {
                    matched.route = true
                }
            }

        }
    }
    return matched
}

Router.prototype.routes = Router.prototype.middleware = function() {
    var router = this
    var dispatch = function dispatch(ctx, next) {
        var path = router.opts.routerPath || ctx.routerPath || ctx.path
        var matched = router.match(path, ctx.method)
        var layerChain, layer, i;
        if (ctx.matched) {
            ctx.matched.push.apply(ctx.matched, matched.path)
        } else {
            ctx.matched = matched.path
        }

        ctx.router = router
        
        if (!matched.route) {
            return next()
        }

        var matchedLayers = matched.pathAndMethod
        var mostSpecificLayer = matchedLayers[mamatchedLayers.length - 1]
        ctx._matchRoute = mostSpecificLayer.path
        if (mostSpecificLayer.name) {
            ctx._matchRouteName = mostSpecificLayer.name
        }
        layerChain = matchedLayers.reduce(function(memo, layer) {
            memo.push(function(ctx, next) {
                ctx.captures = layer.captures(path, ctx.captures)
                ctx.params = layer.params(path, ctx.captures,ctx.params)
                ctx.routerName = layer.name
                return next()
            })
            return memo.concat(layer.stack)
        }, [])
        return compose(layerChain)(ctx, next)
    }
    dispatch.router = this
    return dispatch
}

Router.prototype.allowedMethods = function(options) {
    options = options || {}
    var implemented = this.methods
    return function allowedMethods(ctx, next) {
        return next().then(function() {
            var allowed = {}
            if (!ctx.status || ctx.status === 404) {
                ctx.matched.forEach(function (route) {
                    route.methods.forEach(function(method) {
                        allowed[method] = method
                    })
                })
                var allowedArr = Object.keys(allowed)
                if (!~implemented.indexOf(ctx.method)) {
                    if (options.throw) {
                        var notImplementedThrowable
                        if (typeof options.notImplemented === 'function') {
                            notImplementedThrowable = options.notImplemented()
                        } else {
                            notImplementedThrowable = new HttpError.notImplemented()
                        }
                        throw notImplementedThrowable
                    } else {
                        ctx.status = 501
                        ctx.set('Allow', allowedArr.join(', '))
                    }
                } else if (allowedArr.length) {
                    if (ctx.method === 'OPTIONS') {
                        ctx.status = 200
                        ctx.body = ''
                        ctx.set('Allow', allowedArr.join(', '))
                    } else if (!allowed[ctx.method]) {
                        if (options.throw) {
                            var notAllowedThrowable
                            if (typeof options.methodNotAllowed === 'function') {
                                notAllowedThrowable = options.methodNotAllowed()
                            } else {
                                notAllowedThrowable = new HttpError.methodNotAllowed()
                            }
                            throw notAllowedThrowable
                        } else {
                            ctx.status = 405
                            ctx.set('Allow', allowedArr.join(', '))
                        }
                    }
                }
            }
        })
    }
}
const debug = require('debug')('koa:application')
const http = require('http')
const Stream = require('stream')
const Emitter = require('events')
const compose = require('koa-compose')
const context = require('./context')
const request = require('./request')
const response = require('./response')

debug.enabled = true

class Koa extends Emitter {
    constructor() {
        super()
        this.middleware = []
        this.context = Object.create(context)
        this.request = Object.create(request)
        this.response = Object.create(response)
        debug('init koa')
    }
    use(fn) {
        this.middleware.push(fn)
        return this
    }
    callback() {
        let fn = compose(this.middleware)
        let hq = (request, response) => {
            let ctx = this.createContext(request, response)
            return this.handleRequest(ctx, fn)
        }
        return hq
    }
    createContext(req, res) {
        const context = Object.create(this.context)
        const request = Object.create(this.request)
        const response = Object.create(this.response)
        context.app = request.app = response.app = this
        context.req = request.req = response.req = req
        context.res = request.res = response.res = res
        request.ctx = response.ctx = context
        request.response = response
        request.request = request
        context.originUrl = request.originUrl = req.url
        context.status = {}
        return context
    }
    handleRequest(ctx, fnMiddleware) {
        let handleErrer = (err) => onerror(err)
        let handleResponse = () => respond(ctx)
        return fnMiddleware(ctx).then(handleResponse).catch(handleErrer)
    }
    listen(...arg) {
        debug(arg)
        let server = http.createServer(this.callback())
        return server.listen(...arg)
    }
}

function onerror(...arg) {
    console.error(arg)
}

function respond(ctx) {
    const res = ctx.res
    let body = ctx.body
    const code = ctx.status
    // 预请求
    if (ctx.method == 'HEAD') {
        // 如果还没有响应即发送响应到客户端
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(JSON.stringify(body))
        }
        return res.end()
    }
    if (Buffer.isBuffer(body)) {
        return res.end(body)
    }
    if (typeof body == 'string') {
        return res.end(body)
    }
    if (body instanceof Stream) {
        return body.pipe(res)
    }
    // json
    body = JSON.stringify(body)
    // ctx.length = Buffer.byteLength(body)
    res.end(body)
}

module.exports = Koa
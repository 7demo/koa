const debug = require('debug')('koa:index')
const Koa = require('./lib/application')
const Router = require('./router/index')
const router = new Router()
const app = new Koa()
const fs = require('fs')
debug.enabled = true

router.get('/test', (ctx, next) => {
  ctx.body = 'hello'
})

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    console.log('全局error', e)
  }
})

app.use(async (ctx, next) => {
  ctx.body = '12112'
  await next()
})

app.listen(5000)
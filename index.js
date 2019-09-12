const debug = require('debug')('koa:index')
const Koa = require('./lib/application')
const app = new Koa()
const fs = require('fs')
debug.enabled = true

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
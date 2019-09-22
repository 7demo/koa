var pathToRegexp = require('path-to-regexp')

module.exports = Layer

function Layer(path, methods, middleware, opts) {
    this.opts = opts || {}
    this.name = this.opts.name || null
    this.methods = []
    this.paramNames = []
    // 存放中间件
    this.stack = Array.isArray(middleware) ? middleware : [middleware]

    // 方法全部转大写
    methods.forEach(function (method) {
        // 返回是的该值的索引
        var l = this.methods.push(method.toUpperCase())
        // 把HEAD方法等同于GET方法
        if (this.methods[l - 1] === 'GET') {
            this.methods.unshift('HEAD')
        }
    }, this)

    this.path = path
    //返回正则表达式
    this.regexp = pathToRegexp(path, this.paramNames, this.opts)
    
}

Layer.prototype.match = function(path) {
    return this.regexp.test(path)
}

// 返回query参数
Layer.prototype.params = function(path, captures, existingParams) {
    var params = existingParams || {}
    for (var len = captures.length, i =0; i < len; i++) {
        if (this.paramNames[i]) {
            var c = captures[i]
            params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c
        }
    }
    return params
}

// 返回匹配的路径数组
Layer.prototype.captures = function(path) {
    if (this.opts.ignoreCaptures) {
        return []
    }
    return path.match(this.regexp).slice(1)
}

function safeDecodeURIComponent(text) {
    try {
        return decodeURIComponent(text)
    } catch(e) {
        return text
    }
}
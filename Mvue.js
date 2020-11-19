// const { compile } = require("./vue");
const compileUtil = {
    getVal(expr, vm) {
        return expr.split('.').reduce((data, currentVal) => {
            console.log(currentVal);
            return data[currentVal];
        }, vm.$data)
    },
    getContentVal(expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            console.log(args);
            return this.getVal(args[1], vm);
        })
    },
    SetVal(expr, vm, inputval) {
        return expr.split('.').reduce((data, currentVal) => {
            console.log(currentVal);
            data[currentVal] = inputval;
        }, vm.$data)
    },
    text(node, expr, vm) { //expr:msg
        let value;
        if (expr.indexOf('{{') !== -1) {
            // {{person.name}}--{{person.age}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                console.log(args);
                new watcher(vm, args[1], (newVal) => {
                    this.updater.textUPdater(node, this.getContentVal(expr, vm));

                })
                return this.getVal(args[1], vm);
            })
        } else {
            value = this.getVal(expr, vm);

        }

        this.updater.textUPdater(node, value);
    },
    html(node, expr, vm) {

        const value = this.getVal(expr, vm);
        new watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node, newVal);

        })
        this.updater.htmlUpdater(node, value);
    },
    model(node, expr, vm) {
        const value = this.getVal(expr, vm);
        //绑定更新函数 数据=》视图
        //绑定观察者，将来数据发生变化，触发这里的回调函数，进行更新
        new watcher(vm, expr, (newVal) => {
                this.updater.modelUpdater(node, newVal);

            })
            //视图=》数据
        node.addEventListener('input', (e) => {
            this.SetVal(expr, vm, e.target.value);
        })
        this.updater.modelUpdater(node, value);
    },
    on(node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false);
    },
    bind(node, expr, vm, sttrName) {

    },
    updater: {
        textUPdater(node, value) {
            node.textContent = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value;
        },
        modelUpdater(node, value) {
            node.value = value;
        }
    }
}
class compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector('#app')
        this.vm = vm;
        //1.获取文档碎片对象，放入内存中会减少页面的回流与重绘
        const fragment = this.node2Fragment(this.el);
        console.log(fragment);
        //2.编译模板
        this.newcompile(fragment);
        //3.追加子元素到根元素
        this.el.appendChild(fragment);
    }
    newcompile(fragment) {
        const chirdNodes = fragment.childNodes;
        [...chirdNodes].forEach(child => {
            // console.log(child);
            if (this, this.isElementNode(child)) {
                // console.log('元素节点', child);
                this.compileElement(child);
            } else {
                // console.log('文本节点', child);
                this.compileText(child);

            }
            if (child.childNodes && child.childNodes.length) {
                this.newcompile(child);
            }
        })
    }
    compileElement(node) {
        const attribute = node.attributes;
        [...attribute].forEach(attr => {
            // console.log(attr);
            const { name, value } = attr;
            // console.log(name);
            if (this.isDireactive(name)) { //是一个指令 v-text v-html v-model v-on:click  
                const [, dirctive] = name.split('-'); //text  html model on:click
                const [dirName, eventName] = dirctive.split(':');
                //更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName);
                //删除有指令的标签上的属性
                node.removeAttribute('v-' + dirctive);

            } else if (this.isEventName(name)) { //@click
                let [, eventName] = name.split('@');
                compileUtil['on'](node, value, this.vm, eventName);
            }
        })

    }
    compileText(node) {
        //编译文本 {{}} v-text
        const content = node.textContent;
        if (/\{\{(.+?)\}\}/.test(content)) {
            console.log(content);
            compileUtil['text'](node, content, this.vm);

        }

    }
    isEventName(attrname) {
        return attrname.startsWith('@');
    }
    isDireactive(attrname) {
        return attrname.startsWith('v-');
    }
    node2Fragment(el) {
        //创建文档碎片
        const f = document.createDocumentFragment();
        let firstChild;
        while (firstChild = el.firstChild) {
            f.appendChild(firstChild);
        }
        return f;
    }
    isElementNode(node) {
        return node.nodeType === 1;
    }
}
class Mvue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            //1.实现一个数据的观察者
            //2.实现一个指令的解析器
            new Observe(this.$data);
            new compile(this.$el, this);
            this.proxyData(this.$data);
        }
    }
    proxyData(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal;
                }
            })
        }
    }
}
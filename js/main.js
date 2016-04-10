/**
 * @license almond 0.3.2 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../bower_components/almond/almond", function(){});



require.config({
    shim: {
        underscore: {
            exports: '_',
        },
        easel: {
            exports: 'createjs',
        },
    },
    paths: {
        ramda: '../bower_components/ramda/dist/ramda.min',
        redux: '../bower_components/redux/index',
        easel: '../bower_components/EaselJS/lib/easeljs-0.8.2.min',
    },
});

define("config.js", function(){});

/*!
* @license EaselJS
* Visit http://createjs.com/ for documentation, updates and examples.
*
* Copyright (c) 2011-2015 gskinner.com, inc.
*
* Distributed under the terms of the MIT license.
* http://www.opensource.org/licenses/mit-license.html
*
* This notice shall be included in all copies or substantial portions of the Software.
*/
this.createjs=this.createjs||{},createjs.extend=function(a,b){"use strict";function c(){this.constructor=a}return c.prototype=b.prototype,a.prototype=new c},this.createjs=this.createjs||{},createjs.promote=function(a,b){"use strict";var c=a.prototype,d=Object.getPrototypeOf&&Object.getPrototypeOf(c)||c.__proto__;if(d){c[(b+="_")+"constructor"]=d.constructor;for(var e in d)c.hasOwnProperty(e)&&"function"==typeof d[e]&&(c[b+e]=d[e])}return a},this.createjs=this.createjs||{},createjs.indexOf=function(a,b){"use strict";for(var c=0,d=a.length;d>c;c++)if(b===a[c])return c;return-1},this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c){this.type=a,this.target=null,this.currentTarget=null,this.eventPhase=0,this.bubbles=!!b,this.cancelable=!!c,this.timeStamp=(new Date).getTime(),this.defaultPrevented=!1,this.propagationStopped=!1,this.immediatePropagationStopped=!1,this.removed=!1}var b=a.prototype;b.preventDefault=function(){this.defaultPrevented=this.cancelable&&!0},b.stopPropagation=function(){this.propagationStopped=!0},b.stopImmediatePropagation=function(){this.immediatePropagationStopped=this.propagationStopped=!0},b.remove=function(){this.removed=!0},b.clone=function(){return new a(this.type,this.bubbles,this.cancelable)},b.set=function(a){for(var b in a)this[b]=a[b];return this},b.toString=function(){return"[Event (type="+this.type+")]"},createjs.Event=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(){this._listeners=null,this._captureListeners=null}var b=a.prototype;a.initialize=function(a){a.addEventListener=b.addEventListener,a.on=b.on,a.removeEventListener=a.off=b.removeEventListener,a.removeAllEventListeners=b.removeAllEventListeners,a.hasEventListener=b.hasEventListener,a.dispatchEvent=b.dispatchEvent,a._dispatchEvent=b._dispatchEvent,a.willTrigger=b.willTrigger},b.addEventListener=function(a,b,c){var d;d=c?this._captureListeners=this._captureListeners||{}:this._listeners=this._listeners||{};var e=d[a];return e&&this.removeEventListener(a,b,c),e=d[a],e?e.push(b):d[a]=[b],b},b.on=function(a,b,c,d,e,f){return b.handleEvent&&(c=c||b,b=b.handleEvent),c=c||this,this.addEventListener(a,function(a){b.call(c,a,e),d&&a.remove()},f)},b.removeEventListener=function(a,b,c){var d=c?this._captureListeners:this._listeners;if(d){var e=d[a];if(e)for(var f=0,g=e.length;g>f;f++)if(e[f]==b){1==g?delete d[a]:e.splice(f,1);break}}},b.off=b.removeEventListener,b.removeAllEventListeners=function(a){a?(this._listeners&&delete this._listeners[a],this._captureListeners&&delete this._captureListeners[a]):this._listeners=this._captureListeners=null},b.dispatchEvent=function(a,b,c){if("string"==typeof a){var d=this._listeners;if(!(b||d&&d[a]))return!0;a=new createjs.Event(a,b,c)}else a.target&&a.clone&&(a=a.clone());try{a.target=this}catch(e){}if(a.bubbles&&this.parent){for(var f=this,g=[f];f.parent;)g.push(f=f.parent);var h,i=g.length;for(h=i-1;h>=0&&!a.propagationStopped;h--)g[h]._dispatchEvent(a,1+(0==h));for(h=1;i>h&&!a.propagationStopped;h++)g[h]._dispatchEvent(a,3)}else this._dispatchEvent(a,2);return!a.defaultPrevented},b.hasEventListener=function(a){var b=this._listeners,c=this._captureListeners;return!!(b&&b[a]||c&&c[a])},b.willTrigger=function(a){for(var b=this;b;){if(b.hasEventListener(a))return!0;b=b.parent}return!1},b.toString=function(){return"[EventDispatcher]"},b._dispatchEvent=function(a,b){var c,d=1==b?this._captureListeners:this._listeners;if(a&&d){var e=d[a.type];if(!e||!(c=e.length))return;try{a.currentTarget=this}catch(f){}try{a.eventPhase=b}catch(f){}a.removed=!1,e=e.slice();for(var g=0;c>g&&!a.immediatePropagationStopped;g++){var h=e[g];h.handleEvent?h.handleEvent(a):h(a),a.removed&&(this.off(a.type,h,1==b),a.removed=!1)}}},createjs.EventDispatcher=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(){throw"Ticker cannot be instantiated."}a.RAF_SYNCHED="synched",a.RAF="raf",a.TIMEOUT="timeout",a.useRAF=!1,a.timingMode=null,a.maxDelta=0,a.paused=!1,a.removeEventListener=null,a.removeAllEventListeners=null,a.dispatchEvent=null,a.hasEventListener=null,a._listeners=null,createjs.EventDispatcher.initialize(a),a._addEventListener=a.addEventListener,a.addEventListener=function(){return!a._inited&&a.init(),a._addEventListener.apply(a,arguments)},a._inited=!1,a._startTime=0,a._pausedTime=0,a._ticks=0,a._pausedTicks=0,a._interval=50,a._lastTime=0,a._times=null,a._tickTimes=null,a._timerId=null,a._raf=!0,a.setInterval=function(b){a._interval=b,a._inited&&a._setupTick()},a.getInterval=function(){return a._interval},a.setFPS=function(b){a.setInterval(1e3/b)},a.getFPS=function(){return 1e3/a._interval};try{Object.defineProperties(a,{interval:{get:a.getInterval,set:a.setInterval},framerate:{get:a.getFPS,set:a.setFPS}})}catch(b){console.log(b)}a.init=function(){a._inited||(a._inited=!0,a._times=[],a._tickTimes=[],a._startTime=a._getTime(),a._times.push(a._lastTime=0),a.interval=a._interval)},a.reset=function(){if(a._raf){var b=window.cancelAnimationFrame||window.webkitCancelAnimationFrame||window.mozCancelAnimationFrame||window.oCancelAnimationFrame||window.msCancelAnimationFrame;b&&b(a._timerId)}else clearTimeout(a._timerId);a.removeAllEventListeners("tick"),a._timerId=a._times=a._tickTimes=null,a._startTime=a._lastTime=a._ticks=0,a._inited=!1},a.getMeasuredTickTime=function(b){var c=0,d=a._tickTimes;if(!d||d.length<1)return-1;b=Math.min(d.length,b||0|a.getFPS());for(var e=0;b>e;e++)c+=d[e];return c/b},a.getMeasuredFPS=function(b){var c=a._times;return!c||c.length<2?-1:(b=Math.min(c.length-1,b||0|a.getFPS()),1e3/((c[0]-c[b])/b))},a.setPaused=function(b){a.paused=b},a.getPaused=function(){return a.paused},a.getTime=function(b){return a._startTime?a._getTime()-(b?a._pausedTime:0):-1},a.getEventTime=function(b){return a._startTime?(a._lastTime||a._startTime)-(b?a._pausedTime:0):-1},a.getTicks=function(b){return a._ticks-(b?a._pausedTicks:0)},a._handleSynch=function(){a._timerId=null,a._setupTick(),a._getTime()-a._lastTime>=.97*(a._interval-1)&&a._tick()},a._handleRAF=function(){a._timerId=null,a._setupTick(),a._tick()},a._handleTimeout=function(){a._timerId=null,a._setupTick(),a._tick()},a._setupTick=function(){if(null==a._timerId){var b=a.timingMode||a.useRAF&&a.RAF_SYNCHED;if(b==a.RAF_SYNCHED||b==a.RAF){var c=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame;if(c)return a._timerId=c(b==a.RAF?a._handleRAF:a._handleSynch),void(a._raf=!0)}a._raf=!1,a._timerId=setTimeout(a._handleTimeout,a._interval)}},a._tick=function(){var b=a.paused,c=a._getTime(),d=c-a._lastTime;if(a._lastTime=c,a._ticks++,b&&(a._pausedTicks++,a._pausedTime+=d),a.hasEventListener("tick")){var e=new createjs.Event("tick"),f=a.maxDelta;e.delta=f&&d>f?f:d,e.paused=b,e.time=c,e.runTime=c-a._pausedTime,a.dispatchEvent(e)}for(a._tickTimes.unshift(a._getTime()-c);a._tickTimes.length>100;)a._tickTimes.pop();for(a._times.unshift(c);a._times.length>100;)a._times.pop()};var c=window.performance&&(performance.now||performance.mozNow||performance.msNow||performance.oNow||performance.webkitNow);a._getTime=function(){return(c&&c.call(performance)||(new Date).getTime())-a._startTime},createjs.Ticker=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(){throw"UID cannot be instantiated"}a._nextID=0,a.get=function(){return a._nextID++},createjs.UID=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d,e,f,g,h,i,j,k){this.Event_constructor(a,b,c),this.stageX=d,this.stageY=e,this.rawX=null==i?d:i,this.rawY=null==j?e:j,this.nativeEvent=f,this.pointerID=g,this.primary=!!h,this.relatedTarget=k}var b=createjs.extend(a,createjs.Event);b._get_localX=function(){return this.currentTarget.globalToLocal(this.rawX,this.rawY).x},b._get_localY=function(){return this.currentTarget.globalToLocal(this.rawX,this.rawY).y},b._get_isTouch=function(){return-1!==this.pointerID};try{Object.defineProperties(b,{localX:{get:b._get_localX},localY:{get:b._get_localY},isTouch:{get:b._get_isTouch}})}catch(c){}b.clone=function(){return new a(this.type,this.bubbles,this.cancelable,this.stageX,this.stageY,this.nativeEvent,this.pointerID,this.primary,this.rawX,this.rawY)},b.toString=function(){return"[MouseEvent (type="+this.type+" stageX="+this.stageX+" stageY="+this.stageY+")]"},createjs.MouseEvent=createjs.promote(a,"Event")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d,e,f){this.setValues(a,b,c,d,e,f)}var b=a.prototype;a.DEG_TO_RAD=Math.PI/180,a.identity=null,b.setValues=function(a,b,c,d,e,f){return this.a=null==a?1:a,this.b=b||0,this.c=c||0,this.d=null==d?1:d,this.tx=e||0,this.ty=f||0,this},b.append=function(a,b,c,d,e,f){var g=this.a,h=this.b,i=this.c,j=this.d;return(1!=a||0!=b||0!=c||1!=d)&&(this.a=g*a+i*b,this.b=h*a+j*b,this.c=g*c+i*d,this.d=h*c+j*d),this.tx=g*e+i*f+this.tx,this.ty=h*e+j*f+this.ty,this},b.prepend=function(a,b,c,d,e,f){var g=this.a,h=this.c,i=this.tx;return this.a=a*g+c*this.b,this.b=b*g+d*this.b,this.c=a*h+c*this.d,this.d=b*h+d*this.d,this.tx=a*i+c*this.ty+e,this.ty=b*i+d*this.ty+f,this},b.appendMatrix=function(a){return this.append(a.a,a.b,a.c,a.d,a.tx,a.ty)},b.prependMatrix=function(a){return this.prepend(a.a,a.b,a.c,a.d,a.tx,a.ty)},b.appendTransform=function(b,c,d,e,f,g,h,i,j){if(f%360)var k=f*a.DEG_TO_RAD,l=Math.cos(k),m=Math.sin(k);else l=1,m=0;return g||h?(g*=a.DEG_TO_RAD,h*=a.DEG_TO_RAD,this.append(Math.cos(h),Math.sin(h),-Math.sin(g),Math.cos(g),b,c),this.append(l*d,m*d,-m*e,l*e,0,0)):this.append(l*d,m*d,-m*e,l*e,b,c),(i||j)&&(this.tx-=i*this.a+j*this.c,this.ty-=i*this.b+j*this.d),this},b.prependTransform=function(b,c,d,e,f,g,h,i,j){if(f%360)var k=f*a.DEG_TO_RAD,l=Math.cos(k),m=Math.sin(k);else l=1,m=0;return(i||j)&&(this.tx-=i,this.ty-=j),g||h?(g*=a.DEG_TO_RAD,h*=a.DEG_TO_RAD,this.prepend(l*d,m*d,-m*e,l*e,0,0),this.prepend(Math.cos(h),Math.sin(h),-Math.sin(g),Math.cos(g),b,c)):this.prepend(l*d,m*d,-m*e,l*e,b,c),this},b.rotate=function(b){b*=a.DEG_TO_RAD;var c=Math.cos(b),d=Math.sin(b),e=this.a,f=this.b;return this.a=e*c+this.c*d,this.b=f*c+this.d*d,this.c=-e*d+this.c*c,this.d=-f*d+this.d*c,this},b.skew=function(b,c){return b*=a.DEG_TO_RAD,c*=a.DEG_TO_RAD,this.append(Math.cos(c),Math.sin(c),-Math.sin(b),Math.cos(b),0,0),this},b.scale=function(a,b){return this.a*=a,this.b*=a,this.c*=b,this.d*=b,this},b.translate=function(a,b){return this.tx+=this.a*a+this.c*b,this.ty+=this.b*a+this.d*b,this},b.identity=function(){return this.a=this.d=1,this.b=this.c=this.tx=this.ty=0,this},b.invert=function(){var a=this.a,b=this.b,c=this.c,d=this.d,e=this.tx,f=a*d-b*c;return this.a=d/f,this.b=-b/f,this.c=-c/f,this.d=a/f,this.tx=(c*this.ty-d*e)/f,this.ty=-(a*this.ty-b*e)/f,this},b.isIdentity=function(){return 0===this.tx&&0===this.ty&&1===this.a&&0===this.b&&0===this.c&&1===this.d},b.equals=function(a){return this.tx===a.tx&&this.ty===a.ty&&this.a===a.a&&this.b===a.b&&this.c===a.c&&this.d===a.d},b.transformPoint=function(a,b,c){return c=c||{},c.x=a*this.a+b*this.c+this.tx,c.y=a*this.b+b*this.d+this.ty,c},b.decompose=function(b){null==b&&(b={}),b.x=this.tx,b.y=this.ty,b.scaleX=Math.sqrt(this.a*this.a+this.b*this.b),b.scaleY=Math.sqrt(this.c*this.c+this.d*this.d);var c=Math.atan2(-this.c,this.d),d=Math.atan2(this.b,this.a),e=Math.abs(1-c/d);return 1e-5>e?(b.rotation=d/a.DEG_TO_RAD,this.a<0&&this.d>=0&&(b.rotation+=b.rotation<=0?180:-180),b.skewX=b.skewY=0):(b.skewX=c/a.DEG_TO_RAD,b.skewY=d/a.DEG_TO_RAD),b},b.copy=function(a){return this.setValues(a.a,a.b,a.c,a.d,a.tx,a.ty)},b.clone=function(){return new a(this.a,this.b,this.c,this.d,this.tx,this.ty)},b.toString=function(){return"[Matrix2D (a="+this.a+" b="+this.b+" c="+this.c+" d="+this.d+" tx="+this.tx+" ty="+this.ty+")]"},a.identity=new a,createjs.Matrix2D=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d,e){this.setValues(a,b,c,d,e)}var b=a.prototype;b.setValues=function(a,b,c,d,e){return this.visible=null==a?!0:!!a,this.alpha=null==b?1:b,this.shadow=c,this.compositeOperation=d,this.matrix=e||this.matrix&&this.matrix.identity()||new createjs.Matrix2D,this},b.append=function(a,b,c,d,e){return this.alpha*=b,this.shadow=c||this.shadow,this.compositeOperation=d||this.compositeOperation,this.visible=this.visible&&a,e&&this.matrix.appendMatrix(e),this},b.prepend=function(a,b,c,d,e){return this.alpha*=b,this.shadow=this.shadow||c,this.compositeOperation=this.compositeOperation||d,this.visible=this.visible&&a,e&&this.matrix.prependMatrix(e),this},b.identity=function(){return this.visible=!0,this.alpha=1,this.shadow=this.compositeOperation=null,this.matrix.identity(),this},b.clone=function(){return new a(this.alpha,this.shadow,this.compositeOperation,this.visible,this.matrix.clone())},createjs.DisplayProps=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b){this.setValues(a,b)}var b=a.prototype;b.setValues=function(a,b){return this.x=a||0,this.y=b||0,this},b.copy=function(a){return this.x=a.x,this.y=a.y,this},b.clone=function(){return new a(this.x,this.y)},b.toString=function(){return"[Point (x="+this.x+" y="+this.y+")]"},createjs.Point=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d){this.setValues(a,b,c,d)}var b=a.prototype;b.setValues=function(a,b,c,d){return this.x=a||0,this.y=b||0,this.width=c||0,this.height=d||0,this},b.extend=function(a,b,c,d){return c=c||0,d=d||0,a+c>this.x+this.width&&(this.width=a+c-this.x),b+d>this.y+this.height&&(this.height=b+d-this.y),a<this.x&&(this.width+=this.x-a,this.x=a),b<this.y&&(this.height+=this.y-b,this.y=b),this},b.pad=function(a,b,c,d){return this.x-=b,this.y-=a,this.width+=b+d,this.height+=a+c,this},b.copy=function(a){return this.setValues(a.x,a.y,a.width,a.height)},b.contains=function(a,b,c,d){return c=c||0,d=d||0,a>=this.x&&a+c<=this.x+this.width&&b>=this.y&&b+d<=this.y+this.height},b.union=function(a){return this.clone().extend(a.x,a.y,a.width,a.height)},b.intersection=function(b){var c=b.x,d=b.y,e=c+b.width,f=d+b.height;return this.x>c&&(c=this.x),this.y>d&&(d=this.y),this.x+this.width<e&&(e=this.x+this.width),this.y+this.height<f&&(f=this.y+this.height),c>=e||d>=f?null:new a(c,d,e-c,f-d)},b.intersects=function(a){return a.x<=this.x+this.width&&this.x<=a.x+a.width&&a.y<=this.y+this.height&&this.y<=a.y+a.height},b.isEmpty=function(){return this.width<=0||this.height<=0},b.clone=function(){return new a(this.x,this.y,this.width,this.height)},b.toString=function(){return"[Rectangle (x="+this.x+" y="+this.y+" width="+this.width+" height="+this.height+")]"},createjs.Rectangle=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d,e,f,g){a.addEventListener&&(this.target=a,this.overLabel=null==c?"over":c,this.outLabel=null==b?"out":b,this.downLabel=null==d?"down":d,this.play=e,this._isPressed=!1,this._isOver=!1,this._enabled=!1,a.mouseChildren=!1,this.enabled=!0,this.handleEvent({}),f&&(g&&(f.actionsEnabled=!1,f.gotoAndStop&&f.gotoAndStop(g)),a.hitArea=f))}var b=a.prototype;b.setEnabled=function(a){if(a!=this._enabled){var b=this.target;this._enabled=a,a?(b.cursor="pointer",b.addEventListener("rollover",this),b.addEventListener("rollout",this),b.addEventListener("mousedown",this),b.addEventListener("pressup",this),b._reset&&(b.__reset=b._reset,b._reset=this._reset)):(b.cursor=null,b.removeEventListener("rollover",this),b.removeEventListener("rollout",this),b.removeEventListener("mousedown",this),b.removeEventListener("pressup",this),b.__reset&&(b._reset=b.__reset,delete b.__reset))}},b.getEnabled=function(){return this._enabled};try{Object.defineProperties(b,{enabled:{get:b.getEnabled,set:b.setEnabled}})}catch(c){}b.toString=function(){return"[ButtonHelper]"},b.handleEvent=function(a){var b,c=this.target,d=a.type;"mousedown"==d?(this._isPressed=!0,b=this.downLabel):"pressup"==d?(this._isPressed=!1,b=this._isOver?this.overLabel:this.outLabel):"rollover"==d?(this._isOver=!0,b=this._isPressed?this.downLabel:this.overLabel):(this._isOver=!1,b=this._isPressed?this.overLabel:this.outLabel),this.play?c.gotoAndPlay&&c.gotoAndPlay(b):c.gotoAndStop&&c.gotoAndStop(b)},b._reset=function(){var a=this.paused;this.__reset(),this.paused=a},createjs.ButtonHelper=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d){this.color=a||"black",this.offsetX=b||0,this.offsetY=c||0,this.blur=d||0}var b=a.prototype;a.identity=new a("transparent",0,0,0),b.toString=function(){return"[Shadow]"},b.clone=function(){return new a(this.color,this.offsetX,this.offsetY,this.blur)},createjs.Shadow=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.EventDispatcher_constructor(),this.complete=!0,this.framerate=0,this._animations=null,this._frames=null,this._images=null,this._data=null,this._loadCount=0,this._frameHeight=0,this._frameWidth=0,this._numFrames=0,this._regX=0,this._regY=0,this._spacing=0,this._margin=0,this._parseData(a)}var b=createjs.extend(a,createjs.EventDispatcher);b.getAnimations=function(){return this._animations.slice()};try{Object.defineProperties(b,{animations:{get:b.getAnimations}})}catch(c){}b.getNumFrames=function(a){if(null==a)return this._frames?this._frames.length:this._numFrames||0;var b=this._data[a];return null==b?0:b.frames.length},b.getAnimation=function(a){return this._data[a]},b.getFrame=function(a){var b;return this._frames&&(b=this._frames[a])?b:null},b.getFrameBounds=function(a,b){var c=this.getFrame(a);return c?(b||new createjs.Rectangle).setValues(-c.regX,-c.regY,c.rect.width,c.rect.height):null},b.toString=function(){return"[SpriteSheet]"},b.clone=function(){throw"SpriteSheet cannot be cloned."},b._parseData=function(a){var b,c,d,e;if(null!=a){if(this.framerate=a.framerate||0,a.images&&(c=a.images.length)>0)for(e=this._images=[],b=0;c>b;b++){var f=a.images[b];if("string"==typeof f){var g=f;f=document.createElement("img"),f.src=g}e.push(f),f.getContext||f.naturalWidth||(this._loadCount++,this.complete=!1,function(a,b){f.onload=function(){a._handleImageLoad(b)}}(this,g),function(a,b){f.onerror=function(){a._handleImageError(b)}}(this,g))}if(null==a.frames);else if(Array.isArray(a.frames))for(this._frames=[],e=a.frames,b=0,c=e.length;c>b;b++){var h=e[b];this._frames.push({image:this._images[h[4]?h[4]:0],rect:new createjs.Rectangle(h[0],h[1],h[2],h[3]),regX:h[5]||0,regY:h[6]||0})}else d=a.frames,this._frameWidth=d.width,this._frameHeight=d.height,this._regX=d.regX||0,this._regY=d.regY||0,this._spacing=d.spacing||0,this._margin=d.margin||0,this._numFrames=d.count,0==this._loadCount&&this._calculateFrames();if(this._animations=[],null!=(d=a.animations)){this._data={};var i;for(i in d){var j={name:i},k=d[i];if("number"==typeof k)e=j.frames=[k];else if(Array.isArray(k))if(1==k.length)j.frames=[k[0]];else for(j.speed=k[3],j.next=k[2],e=j.frames=[],b=k[0];b<=k[1];b++)e.push(b);else{j.speed=k.speed,j.next=k.next;var l=k.frames;e=j.frames="number"==typeof l?[l]:l.slice(0)}(j.next===!0||void 0===j.next)&&(j.next=i),(j.next===!1||e.length<2&&j.next==i)&&(j.next=null),j.speed||(j.speed=1),this._animations.push(i),this._data[i]=j}}}},b._handleImageLoad=function(){0==--this._loadCount&&(this._calculateFrames(),this.complete=!0,this.dispatchEvent("complete"))},b._handleImageError=function(a){var b=new createjs.Event("error");b.src=a,this.dispatchEvent(b),0==--this._loadCount&&this.dispatchEvent("complete")},b._calculateFrames=function(){if(!this._frames&&0!=this._frameWidth){this._frames=[];var a=this._numFrames||1e5,b=0,c=this._frameWidth,d=this._frameHeight,e=this._spacing,f=this._margin;a:for(var g=0,h=this._images;g<h.length;g++)for(var i=h[g],j=i.width,k=i.height,l=f;k-f-d>=l;){for(var m=f;j-f-c>=m;){if(b>=a)break a;b++,this._frames.push({image:i,rect:new createjs.Rectangle(m,l,c,d),regX:this._regX,regY:this._regY}),m+=c+e}l+=d+e}this._numFrames=b}},createjs.SpriteSheet=createjs.promote(a,"EventDispatcher")}(),this.createjs=this.createjs||{},function(){"use strict";function a(){this.command=null,this._stroke=null,this._strokeStyle=null,this._oldStrokeStyle=null,this._strokeDash=null,this._oldStrokeDash=null,this._strokeIgnoreScale=!1,this._fill=null,this._instructions=[],this._commitIndex=0,this._activeInstructions=[],this._dirty=!1,this._storeIndex=0,this.clear()}var b=a.prototype,c=a;a.getRGB=function(a,b,c,d){return null!=a&&null==c&&(d=b,c=255&a,b=a>>8&255,a=a>>16&255),null==d?"rgb("+a+","+b+","+c+")":"rgba("+a+","+b+","+c+","+d+")"},a.getHSL=function(a,b,c,d){return null==d?"hsl("+a%360+","+b+"%,"+c+"%)":"hsla("+a%360+","+b+"%,"+c+"%,"+d+")"},a.BASE_64={A:0,B:1,C:2,D:3,E:4,F:5,G:6,H:7,I:8,J:9,K:10,L:11,M:12,N:13,O:14,P:15,Q:16,R:17,S:18,T:19,U:20,V:21,W:22,X:23,Y:24,Z:25,a:26,b:27,c:28,d:29,e:30,f:31,g:32,h:33,i:34,j:35,k:36,l:37,m:38,n:39,o:40,p:41,q:42,r:43,s:44,t:45,u:46,v:47,w:48,x:49,y:50,z:51,0:52,1:53,2:54,3:55,4:56,5:57,6:58,7:59,8:60,9:61,"+":62,"/":63},a.STROKE_CAPS_MAP=["butt","round","square"],a.STROKE_JOINTS_MAP=["miter","round","bevel"];var d=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas");d.getContext&&(a._ctx=d.getContext("2d"),d.width=d.height=1),b.getInstructions=function(){return this._updateInstructions(),this._instructions};try{Object.defineProperties(b,{instructions:{get:b.getInstructions}})}catch(e){}b.isEmpty=function(){return!(this._instructions.length||this._activeInstructions.length)},b.draw=function(a,b){this._updateInstructions();for(var c=this._instructions,d=this._storeIndex,e=c.length;e>d;d++)c[d].exec(a,b)},b.drawAsPath=function(a){this._updateInstructions();for(var b,c=this._instructions,d=this._storeIndex,e=c.length;e>d;d++)(b=c[d]).path!==!1&&b.exec(a)},b.moveTo=function(a,b){return this.append(new c.MoveTo(a,b),!0)},b.lineTo=function(a,b){return this.append(new c.LineTo(a,b))},b.arcTo=function(a,b,d,e,f){return this.append(new c.ArcTo(a,b,d,e,f))},b.arc=function(a,b,d,e,f,g){return this.append(new c.Arc(a,b,d,e,f,g))},b.quadraticCurveTo=function(a,b,d,e){return this.append(new c.QuadraticCurveTo(a,b,d,e))},b.bezierCurveTo=function(a,b,d,e,f,g){return this.append(new c.BezierCurveTo(a,b,d,e,f,g))},b.rect=function(a,b,d,e){return this.append(new c.Rect(a,b,d,e))},b.closePath=function(){return this._activeInstructions.length?this.append(new c.ClosePath):this},b.clear=function(){return this._instructions.length=this._activeInstructions.length=this._commitIndex=0,this._strokeStyle=this._oldStrokeStyle=this._stroke=this._fill=this._strokeDash=this._oldStrokeDash=null,this._dirty=this._strokeIgnoreScale=!1,this},b.beginFill=function(a){return this._setFill(a?new c.Fill(a):null)},b.beginLinearGradientFill=function(a,b,d,e,f,g){return this._setFill((new c.Fill).linearGradient(a,b,d,e,f,g))},b.beginRadialGradientFill=function(a,b,d,e,f,g,h,i){return this._setFill((new c.Fill).radialGradient(a,b,d,e,f,g,h,i))},b.beginBitmapFill=function(a,b,d){return this._setFill(new c.Fill(null,d).bitmap(a,b))},b.endFill=function(){return this.beginFill()},b.setStrokeStyle=function(a,b,d,e,f){return this._updateInstructions(!0),this._strokeStyle=this.command=new c.StrokeStyle(a,b,d,e,f),this._stroke&&(this._stroke.ignoreScale=f),this._strokeIgnoreScale=f,this},b.setStrokeDash=function(a,b){return this._updateInstructions(!0),this._strokeDash=this.command=new c.StrokeDash(a,b),this},b.beginStroke=function(a){return this._setStroke(a?new c.Stroke(a):null)},b.beginLinearGradientStroke=function(a,b,d,e,f,g){return this._setStroke((new c.Stroke).linearGradient(a,b,d,e,f,g))},b.beginRadialGradientStroke=function(a,b,d,e,f,g,h,i){return this._setStroke((new c.Stroke).radialGradient(a,b,d,e,f,g,h,i))},b.beginBitmapStroke=function(a,b){return this._setStroke((new c.Stroke).bitmap(a,b))},b.endStroke=function(){return this.beginStroke()},b.curveTo=b.quadraticCurveTo,b.drawRect=b.rect,b.drawRoundRect=function(a,b,c,d,e){return this.drawRoundRectComplex(a,b,c,d,e,e,e,e)},b.drawRoundRectComplex=function(a,b,d,e,f,g,h,i){return this.append(new c.RoundRect(a,b,d,e,f,g,h,i))},b.drawCircle=function(a,b,d){return this.append(new c.Circle(a,b,d))},b.drawEllipse=function(a,b,d,e){return this.append(new c.Ellipse(a,b,d,e))},b.drawPolyStar=function(a,b,d,e,f,g){return this.append(new c.PolyStar(a,b,d,e,f,g))},b.append=function(a,b){return this._activeInstructions.push(a),this.command=a,b||(this._dirty=!0),this},b.decodePath=function(b){for(var c=[this.moveTo,this.lineTo,this.quadraticCurveTo,this.bezierCurveTo,this.closePath],d=[2,2,4,6,0],e=0,f=b.length,g=[],h=0,i=0,j=a.BASE_64;f>e;){var k=b.charAt(e),l=j[k],m=l>>3,n=c[m];if(!n||3&l)throw"bad path data (@"+e+"): "+k;var o=d[m];m||(h=i=0),g.length=0,e++;for(var p=(l>>2&1)+2,q=0;o>q;q++){var r=j[b.charAt(e)],s=r>>5?-1:1;r=(31&r)<<6|j[b.charAt(e+1)],3==p&&(r=r<<6|j[b.charAt(e+2)]),r=s*r/10,q%2?h=r+=h:i=r+=i,g[q]=r,e+=p}n.apply(this,g)}return this},b.store=function(){return this._updateInstructions(!0),this._storeIndex=this._instructions.length,this},b.unstore=function(){return this._storeIndex=0,this},b.clone=function(){var b=new a;return b.command=this.command,b._stroke=this._stroke,b._strokeStyle=this._strokeStyle,b._strokeDash=this._strokeDash,b._strokeIgnoreScale=this._strokeIgnoreScale,b._fill=this._fill,b._instructions=this._instructions.slice(),b._commitIndex=this._commitIndex,b._activeInstructions=this._activeInstructions.slice(),b._dirty=this._dirty,b._storeIndex=this._storeIndex,b},b.toString=function(){return"[Graphics]"},b.mt=b.moveTo,b.lt=b.lineTo,b.at=b.arcTo,b.bt=b.bezierCurveTo,b.qt=b.quadraticCurveTo,b.a=b.arc,b.r=b.rect,b.cp=b.closePath,b.c=b.clear,b.f=b.beginFill,b.lf=b.beginLinearGradientFill,b.rf=b.beginRadialGradientFill,b.bf=b.beginBitmapFill,b.ef=b.endFill,b.ss=b.setStrokeStyle,b.sd=b.setStrokeDash,b.s=b.beginStroke,b.ls=b.beginLinearGradientStroke,b.rs=b.beginRadialGradientStroke,b.bs=b.beginBitmapStroke,b.es=b.endStroke,b.dr=b.drawRect,b.rr=b.drawRoundRect,b.rc=b.drawRoundRectComplex,b.dc=b.drawCircle,b.de=b.drawEllipse,b.dp=b.drawPolyStar,b.p=b.decodePath,b._updateInstructions=function(b){var c=this._instructions,d=this._activeInstructions,e=this._commitIndex;if(this._dirty&&d.length){c.length=e,c.push(a.beginCmd);var f=d.length,g=c.length;c.length=g+f;for(var h=0;f>h;h++)c[h+g]=d[h];this._fill&&c.push(this._fill),this._stroke&&(this._strokeDash!==this._oldStrokeDash&&(this._oldStrokeDash=this._strokeDash,c.push(this._strokeDash)),this._strokeStyle!==this._oldStrokeStyle&&(this._oldStrokeStyle=this._strokeStyle,c.push(this._strokeStyle)),c.push(this._stroke)),this._dirty=!1}b&&(d.length=0,this._commitIndex=c.length)},b._setFill=function(a){return this._updateInstructions(!0),this.command=this._fill=a,this},b._setStroke=function(a){return this._updateInstructions(!0),(this.command=this._stroke=a)&&(a.ignoreScale=this._strokeIgnoreScale),this},(c.LineTo=function(a,b){this.x=a,this.y=b}).prototype.exec=function(a){a.lineTo(this.x,this.y)},(c.MoveTo=function(a,b){this.x=a,this.y=b}).prototype.exec=function(a){a.moveTo(this.x,this.y)},(c.ArcTo=function(a,b,c,d,e){this.x1=a,this.y1=b,this.x2=c,this.y2=d,this.radius=e}).prototype.exec=function(a){a.arcTo(this.x1,this.y1,this.x2,this.y2,this.radius)},(c.Arc=function(a,b,c,d,e,f){this.x=a,this.y=b,this.radius=c,this.startAngle=d,this.endAngle=e,this.anticlockwise=!!f}).prototype.exec=function(a){a.arc(this.x,this.y,this.radius,this.startAngle,this.endAngle,this.anticlockwise)},(c.QuadraticCurveTo=function(a,b,c,d){this.cpx=a,this.cpy=b,this.x=c,this.y=d}).prototype.exec=function(a){a.quadraticCurveTo(this.cpx,this.cpy,this.x,this.y)},(c.BezierCurveTo=function(a,b,c,d,e,f){this.cp1x=a,this.cp1y=b,this.cp2x=c,this.cp2y=d,this.x=e,this.y=f}).prototype.exec=function(a){a.bezierCurveTo(this.cp1x,this.cp1y,this.cp2x,this.cp2y,this.x,this.y)},(c.Rect=function(a,b,c,d){this.x=a,this.y=b,this.w=c,this.h=d}).prototype.exec=function(a){a.rect(this.x,this.y,this.w,this.h)},(c.ClosePath=function(){}).prototype.exec=function(a){a.closePath()},(c.BeginPath=function(){}).prototype.exec=function(a){a.beginPath()},b=(c.Fill=function(a,b){this.style=a,this.matrix=b}).prototype,b.exec=function(a){if(this.style){a.fillStyle=this.style;var b=this.matrix;b&&(a.save(),a.transform(b.a,b.b,b.c,b.d,b.tx,b.ty)),a.fill(),b&&a.restore()}},b.linearGradient=function(b,c,d,e,f,g){for(var h=this.style=a._ctx.createLinearGradient(d,e,f,g),i=0,j=b.length;j>i;i++)h.addColorStop(c[i],b[i]);return h.props={colors:b,ratios:c,x0:d,y0:e,x1:f,y1:g,type:"linear"},this},b.radialGradient=function(b,c,d,e,f,g,h,i){for(var j=this.style=a._ctx.createRadialGradient(d,e,f,g,h,i),k=0,l=b.length;l>k;k++)j.addColorStop(c[k],b[k]);return j.props={colors:b,ratios:c,x0:d,y0:e,r0:f,x1:g,y1:h,r1:i,type:"radial"},this},b.bitmap=function(b,c){if(b.naturalWidth||b.getContext||b.readyState>=2){var d=this.style=a._ctx.createPattern(b,c||"");d.props={image:b,repetition:c,type:"bitmap"}}return this},b.path=!1,b=(c.Stroke=function(a,b){this.style=a,this.ignoreScale=b}).prototype,b.exec=function(a){this.style&&(a.strokeStyle=this.style,this.ignoreScale&&(a.save(),a.setTransform(1,0,0,1,0,0)),a.stroke(),this.ignoreScale&&a.restore())},b.linearGradient=c.Fill.prototype.linearGradient,b.radialGradient=c.Fill.prototype.radialGradient,b.bitmap=c.Fill.prototype.bitmap,b.path=!1,b=(c.StrokeStyle=function(a,b,c,d,e){this.width=a,this.caps=b,this.joints=c,this.miterLimit=d,this.ignoreScale=e}).prototype,b.exec=function(b){b.lineWidth=null==this.width?"1":this.width,b.lineCap=null==this.caps?"butt":isNaN(this.caps)?this.caps:a.STROKE_CAPS_MAP[this.caps],b.lineJoin=null==this.joints?"miter":isNaN(this.joints)?this.joints:a.STROKE_JOINTS_MAP[this.joints],b.miterLimit=null==this.miterLimit?"10":this.miterLimit,b.ignoreScale=null==this.ignoreScale?!1:this.ignoreScale},b.path=!1,(c.StrokeDash=function(a,b){this.segments=a,this.offset=b||0}).prototype.exec=function(a){a.setLineDash&&(a.setLineDash(this.segments||c.StrokeDash.EMPTY_SEGMENTS),a.lineDashOffset=this.offset||0)},c.StrokeDash.EMPTY_SEGMENTS=[],(c.RoundRect=function(a,b,c,d,e,f,g,h){this.x=a,this.y=b,this.w=c,this.h=d,this.radiusTL=e,this.radiusTR=f,this.radiusBR=g,this.radiusBL=h}).prototype.exec=function(a){var b=(j>i?i:j)/2,c=0,d=0,e=0,f=0,g=this.x,h=this.y,i=this.w,j=this.h,k=this.radiusTL,l=this.radiusTR,m=this.radiusBR,n=this.radiusBL;0>k&&(k*=c=-1),k>b&&(k=b),0>l&&(l*=d=-1),l>b&&(l=b),0>m&&(m*=e=-1),m>b&&(m=b),0>n&&(n*=f=-1),n>b&&(n=b),a.moveTo(g+i-l,h),a.arcTo(g+i+l*d,h-l*d,g+i,h+l,l),a.lineTo(g+i,h+j-m),a.arcTo(g+i+m*e,h+j+m*e,g+i-m,h+j,m),a.lineTo(g+n,h+j),a.arcTo(g-n*f,h+j+n*f,g,h+j-n,n),a.lineTo(g,h+k),a.arcTo(g-k*c,h-k*c,g+k,h,k),a.closePath()},(c.Circle=function(a,b,c){this.x=a,this.y=b,this.radius=c}).prototype.exec=function(a){a.arc(this.x,this.y,this.radius,0,2*Math.PI)},(c.Ellipse=function(a,b,c,d){this.x=a,this.y=b,this.w=c,this.h=d}).prototype.exec=function(a){var b=this.x,c=this.y,d=this.w,e=this.h,f=.5522848,g=d/2*f,h=e/2*f,i=b+d,j=c+e,k=b+d/2,l=c+e/2;a.moveTo(b,l),a.bezierCurveTo(b,l-h,k-g,c,k,c),a.bezierCurveTo(k+g,c,i,l-h,i,l),a.bezierCurveTo(i,l+h,k+g,j,k,j),a.bezierCurveTo(k-g,j,b,l+h,b,l)},(c.PolyStar=function(a,b,c,d,e,f){this.x=a,this.y=b,this.radius=c,this.sides=d,this.pointSize=e,this.angle=f}).prototype.exec=function(a){var b=this.x,c=this.y,d=this.radius,e=(this.angle||0)/180*Math.PI,f=this.sides,g=1-(this.pointSize||0),h=Math.PI/f;a.moveTo(b+Math.cos(e)*d,c+Math.sin(e)*d);for(var i=0;f>i;i++)e+=h,1!=g&&a.lineTo(b+Math.cos(e)*d*g,c+Math.sin(e)*d*g),e+=h,a.lineTo(b+Math.cos(e)*d,c+Math.sin(e)*d);a.closePath()},a.beginCmd=new c.BeginPath,createjs.Graphics=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(){this.EventDispatcher_constructor(),this.alpha=1,this.cacheCanvas=null,this.cacheID=0,this.id=createjs.UID.get(),this.mouseEnabled=!0,this.tickEnabled=!0,this.name=null,this.parent=null,this.regX=0,this.regY=0,this.rotation=0,this.scaleX=1,this.scaleY=1,this.skewX=0,this.skewY=0,this.shadow=null,this.visible=!0,this.x=0,this.y=0,this.transformMatrix=null,this.compositeOperation=null,this.snapToPixel=!0,this.filters=null,this.mask=null,this.hitArea=null,this.cursor=null,this._cacheOffsetX=0,this._cacheOffsetY=0,this._filterOffsetX=0,this._filterOffsetY=0,this._cacheScale=1,this._cacheDataURLID=0,this._cacheDataURL=null,this._props=new createjs.DisplayProps,this._rectangle=new createjs.Rectangle,this._bounds=null
}var b=createjs.extend(a,createjs.EventDispatcher);a._MOUSE_EVENTS=["click","dblclick","mousedown","mouseout","mouseover","pressmove","pressup","rollout","rollover"],a.suppressCrossDomainErrors=!1,a._snapToPixelEnabled=!1;var c=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas");c.getContext&&(a._hitTestCanvas=c,a._hitTestContext=c.getContext("2d"),c.width=c.height=1),a._nextCacheID=1,b.getStage=function(){for(var a=this,b=createjs.Stage;a.parent;)a=a.parent;return a instanceof b?a:null};try{Object.defineProperties(b,{stage:{get:b.getStage}})}catch(d){}b.isVisible=function(){return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY)},b.draw=function(a,b){var c=this.cacheCanvas;if(b||!c)return!1;var d=this._cacheScale;return a.drawImage(c,this._cacheOffsetX+this._filterOffsetX,this._cacheOffsetY+this._filterOffsetY,c.width/d,c.height/d),!0},b.updateContext=function(b){var c=this,d=c.mask,e=c._props.matrix;d&&d.graphics&&!d.graphics.isEmpty()&&(d.getMatrix(e),b.transform(e.a,e.b,e.c,e.d,e.tx,e.ty),d.graphics.drawAsPath(b),b.clip(),e.invert(),b.transform(e.a,e.b,e.c,e.d,e.tx,e.ty)),this.getMatrix(e);var f=e.tx,g=e.ty;a._snapToPixelEnabled&&c.snapToPixel&&(f=f+(0>f?-.5:.5)|0,g=g+(0>g?-.5:.5)|0),b.transform(e.a,e.b,e.c,e.d,f,g),b.globalAlpha*=c.alpha,c.compositeOperation&&(b.globalCompositeOperation=c.compositeOperation),c.shadow&&this._applyShadow(b,c.shadow)},b.cache=function(a,b,c,d,e){e=e||1,this.cacheCanvas||(this.cacheCanvas=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas")),this._cacheWidth=c,this._cacheHeight=d,this._cacheOffsetX=a,this._cacheOffsetY=b,this._cacheScale=e,this.updateCache()},b.updateCache=function(b){var c=this.cacheCanvas;if(!c)throw"cache() must be called before updateCache()";var d=this._cacheScale,e=this._cacheOffsetX*d,f=this._cacheOffsetY*d,g=this._cacheWidth,h=this._cacheHeight,i=c.getContext("2d"),j=this._getFilterBounds();e+=this._filterOffsetX=j.x,f+=this._filterOffsetY=j.y,g=Math.ceil(g*d)+j.width,h=Math.ceil(h*d)+j.height,g!=c.width||h!=c.height?(c.width=g,c.height=h):b||i.clearRect(0,0,g+1,h+1),i.save(),i.globalCompositeOperation=b,i.setTransform(d,0,0,d,-e,-f),this.draw(i,!0),this._applyFilters(),i.restore(),this.cacheID=a._nextCacheID++},b.uncache=function(){this._cacheDataURL=this.cacheCanvas=null,this.cacheID=this._cacheOffsetX=this._cacheOffsetY=this._filterOffsetX=this._filterOffsetY=0,this._cacheScale=1},b.getCacheDataURL=function(){return this.cacheCanvas?(this.cacheID!=this._cacheDataURLID&&(this._cacheDataURL=this.cacheCanvas.toDataURL()),this._cacheDataURL):null},b.localToGlobal=function(a,b,c){return this.getConcatenatedMatrix(this._props.matrix).transformPoint(a,b,c||new createjs.Point)},b.globalToLocal=function(a,b,c){return this.getConcatenatedMatrix(this._props.matrix).invert().transformPoint(a,b,c||new createjs.Point)},b.localToLocal=function(a,b,c,d){return d=this.localToGlobal(a,b,d),c.globalToLocal(d.x,d.y,d)},b.setTransform=function(a,b,c,d,e,f,g,h,i){return this.x=a||0,this.y=b||0,this.scaleX=null==c?1:c,this.scaleY=null==d?1:d,this.rotation=e||0,this.skewX=f||0,this.skewY=g||0,this.regX=h||0,this.regY=i||0,this},b.getMatrix=function(a){var b=this,c=a&&a.identity()||new createjs.Matrix2D;return b.transformMatrix?c.copy(b.transformMatrix):c.appendTransform(b.x,b.y,b.scaleX,b.scaleY,b.rotation,b.skewX,b.skewY,b.regX,b.regY)},b.getConcatenatedMatrix=function(a){for(var b=this,c=this.getMatrix(a);b=b.parent;)c.prependMatrix(b.getMatrix(b._props.matrix));return c},b.getConcatenatedDisplayProps=function(a){a=a?a.identity():new createjs.DisplayProps;var b=this,c=b.getMatrix(a.matrix);do a.prepend(b.visible,b.alpha,b.shadow,b.compositeOperation),b!=this&&c.prependMatrix(b.getMatrix(b._props.matrix));while(b=b.parent);return a},b.hitTest=function(b,c){var d=a._hitTestContext;d.setTransform(1,0,0,1,-b,-c),this.draw(d);var e=this._testHit(d);return d.setTransform(1,0,0,1,0,0),d.clearRect(0,0,2,2),e},b.set=function(a){for(var b in a)this[b]=a[b];return this},b.getBounds=function(){if(this._bounds)return this._rectangle.copy(this._bounds);var a=this.cacheCanvas;if(a){var b=this._cacheScale;return this._rectangle.setValues(this._cacheOffsetX,this._cacheOffsetY,a.width/b,a.height/b)}return null},b.getTransformedBounds=function(){return this._getBounds()},b.setBounds=function(a,b,c,d){null==a&&(this._bounds=a),this._bounds=(this._bounds||new createjs.Rectangle).setValues(a,b,c,d)},b.clone=function(){return this._cloneProps(new a)},b.toString=function(){return"[DisplayObject (name="+this.name+")]"},b._cloneProps=function(a){return a.alpha=this.alpha,a.mouseEnabled=this.mouseEnabled,a.tickEnabled=this.tickEnabled,a.name=this.name,a.regX=this.regX,a.regY=this.regY,a.rotation=this.rotation,a.scaleX=this.scaleX,a.scaleY=this.scaleY,a.shadow=this.shadow,a.skewX=this.skewX,a.skewY=this.skewY,a.visible=this.visible,a.x=this.x,a.y=this.y,a.compositeOperation=this.compositeOperation,a.snapToPixel=this.snapToPixel,a.filters=null==this.filters?null:this.filters.slice(0),a.mask=this.mask,a.hitArea=this.hitArea,a.cursor=this.cursor,a._bounds=this._bounds,a},b._applyShadow=function(a,b){b=b||Shadow.identity,a.shadowColor=b.color,a.shadowOffsetX=b.offsetX,a.shadowOffsetY=b.offsetY,a.shadowBlur=b.blur},b._tick=function(a){var b=this._listeners;b&&b.tick&&(a.target=null,a.propagationStopped=a.immediatePropagationStopped=!1,this.dispatchEvent(a))},b._testHit=function(b){try{var c=b.getImageData(0,0,1,1).data[3]>1}catch(d){if(!a.suppressCrossDomainErrors)throw"An error has occurred. This is most likely due to security restrictions on reading canvas pixel data with local or cross-domain images."}return c},b._applyFilters=function(){if(this.filters&&0!=this.filters.length&&this.cacheCanvas)for(var a=this.filters.length,b=this.cacheCanvas.getContext("2d"),c=this.cacheCanvas.width,d=this.cacheCanvas.height,e=0;a>e;e++)this.filters[e].applyFilter(b,0,0,c,d)},b._getFilterBounds=function(){var a,b=this.filters,c=this._rectangle.setValues(0,0,0,0);if(!b||!(a=b.length))return c;for(var d=0;a>d;d++){var e=this.filters[d];e.getBounds&&e.getBounds(c)}return c},b._getBounds=function(a,b){return this._transformBounds(this.getBounds(),a,b)},b._transformBounds=function(a,b,c){if(!a)return a;var d=a.x,e=a.y,f=a.width,g=a.height,h=this._props.matrix;h=c?h.identity():this.getMatrix(h),(d||e)&&h.appendTransform(0,0,1,1,0,0,0,-d,-e),b&&h.prependMatrix(b);var i=f*h.a,j=f*h.b,k=g*h.c,l=g*h.d,m=h.tx,n=h.ty,o=m,p=m,q=n,r=n;return(d=i+m)<o?o=d:d>p&&(p=d),(d=i+k+m)<o?o=d:d>p&&(p=d),(d=k+m)<o?o=d:d>p&&(p=d),(e=j+n)<q?q=e:e>r&&(r=e),(e=j+l+n)<q?q=e:e>r&&(r=e),(e=l+n)<q?q=e:e>r&&(r=e),a.setValues(o,q,p-o,r-q)},b._hasMouseEventListener=function(){for(var b=a._MOUSE_EVENTS,c=0,d=b.length;d>c;c++)if(this.hasEventListener(b[c]))return!0;return!!this.cursor},createjs.DisplayObject=createjs.promote(a,"EventDispatcher")}(),this.createjs=this.createjs||{},function(){"use strict";function a(){this.DisplayObject_constructor(),this.children=[],this.mouseChildren=!0,this.tickChildren=!0}var b=createjs.extend(a,createjs.DisplayObject);b.getNumChildren=function(){return this.children.length};try{Object.defineProperties(b,{numChildren:{get:b.getNumChildren}})}catch(c){}b.initialize=a,b.isVisible=function(){var a=this.cacheCanvas||this.children.length;return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY&&a)},b.draw=function(a,b){if(this.DisplayObject_draw(a,b))return!0;for(var c=this.children.slice(),d=0,e=c.length;e>d;d++){var f=c[d];f.isVisible()&&(a.save(),f.updateContext(a),f.draw(a),a.restore())}return!0},b.addChild=function(a){if(null==a)return a;var b=arguments.length;if(b>1){for(var c=0;b>c;c++)this.addChild(arguments[c]);return arguments[b-1]}return a.parent&&a.parent.removeChild(a),a.parent=this,this.children.push(a),a.dispatchEvent("added"),a},b.addChildAt=function(a,b){var c=arguments.length,d=arguments[c-1];if(0>d||d>this.children.length)return arguments[c-2];if(c>2){for(var e=0;c-1>e;e++)this.addChildAt(arguments[e],d+e);return arguments[c-2]}return a.parent&&a.parent.removeChild(a),a.parent=this,this.children.splice(b,0,a),a.dispatchEvent("added"),a},b.removeChild=function(a){var b=arguments.length;if(b>1){for(var c=!0,d=0;b>d;d++)c=c&&this.removeChild(arguments[d]);return c}return this.removeChildAt(createjs.indexOf(this.children,a))},b.removeChildAt=function(a){var b=arguments.length;if(b>1){for(var c=[],d=0;b>d;d++)c[d]=arguments[d];c.sort(function(a,b){return b-a});for(var e=!0,d=0;b>d;d++)e=e&&this.removeChildAt(c[d]);return e}if(0>a||a>this.children.length-1)return!1;var f=this.children[a];return f&&(f.parent=null),this.children.splice(a,1),f.dispatchEvent("removed"),!0},b.removeAllChildren=function(){for(var a=this.children;a.length;)this.removeChildAt(0)},b.getChildAt=function(a){return this.children[a]},b.getChildByName=function(a){for(var b=this.children,c=0,d=b.length;d>c;c++)if(b[c].name==a)return b[c];return null},b.sortChildren=function(a){this.children.sort(a)},b.getChildIndex=function(a){return createjs.indexOf(this.children,a)},b.swapChildrenAt=function(a,b){var c=this.children,d=c[a],e=c[b];d&&e&&(c[a]=e,c[b]=d)},b.swapChildren=function(a,b){for(var c,d,e=this.children,f=0,g=e.length;g>f&&(e[f]==a&&(c=f),e[f]==b&&(d=f),null==c||null==d);f++);f!=g&&(e[c]=b,e[d]=a)},b.setChildIndex=function(a,b){var c=this.children,d=c.length;if(!(a.parent!=this||0>b||b>=d)){for(var e=0;d>e&&c[e]!=a;e++);e!=d&&e!=b&&(c.splice(e,1),c.splice(b,0,a))}},b.contains=function(a){for(;a;){if(a==this)return!0;a=a.parent}return!1},b.hitTest=function(a,b){return null!=this.getObjectUnderPoint(a,b)},b.getObjectsUnderPoint=function(a,b,c){var d=[],e=this.localToGlobal(a,b);return this._getObjectsUnderPoint(e.x,e.y,d,c>0,1==c),d},b.getObjectUnderPoint=function(a,b,c){var d=this.localToGlobal(a,b);return this._getObjectsUnderPoint(d.x,d.y,null,c>0,1==c)},b.getBounds=function(){return this._getBounds(null,!0)},b.getTransformedBounds=function(){return this._getBounds()},b.clone=function(b){var c=this._cloneProps(new a);return b&&this._cloneChildren(c),c},b.toString=function(){return"[Container (name="+this.name+")]"},b._tick=function(a){if(this.tickChildren)for(var b=this.children.length-1;b>=0;b--){var c=this.children[b];c.tickEnabled&&c._tick&&c._tick(a)}this.DisplayObject__tick(a)},b._cloneChildren=function(a){a.children.length&&a.removeAllChildren();for(var b=a.children,c=0,d=this.children.length;d>c;c++){var e=this.children[c].clone(!0);e.parent=a,b.push(e)}},b._getObjectsUnderPoint=function(b,c,d,e,f,g){if(g=g||0,!g&&!this._testMask(this,b,c))return null;var h,i=createjs.DisplayObject._hitTestContext;f=f||e&&this._hasMouseEventListener();for(var j=this.children,k=j.length,l=k-1;l>=0;l--){var m=j[l],n=m.hitArea;if(m.visible&&(n||m.isVisible())&&(!e||m.mouseEnabled)&&(n||this._testMask(m,b,c)))if(!n&&m instanceof a){var o=m._getObjectsUnderPoint(b,c,d,e,f,g+1);if(!d&&o)return e&&!this.mouseChildren?this:o}else{if(e&&!f&&!m._hasMouseEventListener())continue;var p=m.getConcatenatedDisplayProps(m._props);if(h=p.matrix,n&&(h.appendMatrix(n.getMatrix(n._props.matrix)),p.alpha=n.alpha),i.globalAlpha=p.alpha,i.setTransform(h.a,h.b,h.c,h.d,h.tx-b,h.ty-c),(n||m).draw(i),!this._testHit(i))continue;if(i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,2,2),!d)return e&&!this.mouseChildren?this:m;d.push(m)}}return null},b._testMask=function(a,b,c){var d=a.mask;if(!d||!d.graphics||d.graphics.isEmpty())return!0;var e=this._props.matrix,f=a.parent;e=f?f.getConcatenatedMatrix(e):e.identity(),e=d.getMatrix(d._props.matrix).prependMatrix(e);var g=createjs.DisplayObject._hitTestContext;return g.setTransform(e.a,e.b,e.c,e.d,e.tx-b,e.ty-c),d.graphics.drawAsPath(g),g.fillStyle="#000",g.fill(),this._testHit(g)?(g.setTransform(1,0,0,1,0,0),g.clearRect(0,0,2,2),!0):!1},b._getBounds=function(a,b){var c=this.DisplayObject_getBounds();if(c)return this._transformBounds(c,a,b);var d=this._props.matrix;d=b?d.identity():this.getMatrix(d),a&&d.prependMatrix(a);for(var e=this.children.length,f=null,g=0;e>g;g++){var h=this.children[g];h.visible&&(c=h._getBounds(d))&&(f?f.extend(c.x,c.y,c.width,c.height):f=c.clone())}return f},createjs.Container=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.Container_constructor(),this.autoClear=!0,this.canvas="string"==typeof a?document.getElementById(a):a,this.mouseX=0,this.mouseY=0,this.drawRect=null,this.snapToPixelEnabled=!1,this.mouseInBounds=!1,this.tickOnUpdate=!0,this.mouseMoveOutside=!1,this.preventSelection=!0,this._pointerData={},this._pointerCount=0,this._primaryPointerID=null,this._mouseOverIntervalID=null,this._nextStage=null,this._prevStage=null,this.enableDOMEvents(!0)}var b=createjs.extend(a,createjs.Container);b._get_nextStage=function(){return this._nextStage},b._set_nextStage=function(a){this._nextStage&&(this._nextStage._prevStage=null),a&&(a._prevStage=this),this._nextStage=a};try{Object.defineProperties(b,{nextStage:{get:b._get_nextStage,set:b._set_nextStage}})}catch(c){}b.update=function(a){if(this.canvas&&(this.tickOnUpdate&&this.tick(a),this.dispatchEvent("drawstart",!1,!0)!==!1)){createjs.DisplayObject._snapToPixelEnabled=this.snapToPixelEnabled;var b=this.drawRect,c=this.canvas.getContext("2d");c.setTransform(1,0,0,1,0,0),this.autoClear&&(b?c.clearRect(b.x,b.y,b.width,b.height):c.clearRect(0,0,this.canvas.width+1,this.canvas.height+1)),c.save(),this.drawRect&&(c.beginPath(),c.rect(b.x,b.y,b.width,b.height),c.clip()),this.updateContext(c),this.draw(c,!1),c.restore(),this.dispatchEvent("drawend")}},b.tick=function(a){if(this.tickEnabled&&this.dispatchEvent("tickstart",!1,!0)!==!1){var b=new createjs.Event("tick");if(a)for(var c in a)a.hasOwnProperty(c)&&(b[c]=a[c]);this._tick(b),this.dispatchEvent("tickend")}},b.handleEvent=function(a){"tick"==a.type&&this.update(a)},b.clear=function(){if(this.canvas){var a=this.canvas.getContext("2d");a.setTransform(1,0,0,1,0,0),a.clearRect(0,0,this.canvas.width+1,this.canvas.height+1)}},b.toDataURL=function(a,b){var c,d=this.canvas.getContext("2d"),e=this.canvas.width,f=this.canvas.height;if(a){c=d.getImageData(0,0,e,f);var g=d.globalCompositeOperation;d.globalCompositeOperation="destination-over",d.fillStyle=a,d.fillRect(0,0,e,f)}var h=this.canvas.toDataURL(b||"image/png");return a&&(d.putImageData(c,0,0),d.globalCompositeOperation=g),h},b.enableMouseOver=function(a){if(this._mouseOverIntervalID&&(clearInterval(this._mouseOverIntervalID),this._mouseOverIntervalID=null,0==a&&this._testMouseOver(!0)),null==a)a=20;else if(0>=a)return;var b=this;this._mouseOverIntervalID=setInterval(function(){b._testMouseOver()},1e3/Math.min(50,a))},b.enableDOMEvents=function(a){null==a&&(a=!0);var b,c,d=this._eventListeners;if(!a&&d){for(b in d)c=d[b],c.t.removeEventListener(b,c.f,!1);this._eventListeners=null}else if(a&&!d&&this.canvas){var e=window.addEventListener?window:document,f=this;d=this._eventListeners={},d.mouseup={t:e,f:function(a){f._handleMouseUp(a)}},d.mousemove={t:e,f:function(a){f._handleMouseMove(a)}},d.dblclick={t:this.canvas,f:function(a){f._handleDoubleClick(a)}},d.mousedown={t:this.canvas,f:function(a){f._handleMouseDown(a)}};for(b in d)c=d[b],c.t.addEventListener(b,c.f,!1)}},b.clone=function(){throw"Stage cannot be cloned."},b.toString=function(){return"[Stage (name="+this.name+")]"},b._getElementRect=function(a){var b;try{b=a.getBoundingClientRect()}catch(c){b={top:a.offsetTop,left:a.offsetLeft,width:a.offsetWidth,height:a.offsetHeight}}var d=(window.pageXOffset||document.scrollLeft||0)-(document.clientLeft||document.body.clientLeft||0),e=(window.pageYOffset||document.scrollTop||0)-(document.clientTop||document.body.clientTop||0),f=window.getComputedStyle?getComputedStyle(a,null):a.currentStyle,g=parseInt(f.paddingLeft)+parseInt(f.borderLeftWidth),h=parseInt(f.paddingTop)+parseInt(f.borderTopWidth),i=parseInt(f.paddingRight)+parseInt(f.borderRightWidth),j=parseInt(f.paddingBottom)+parseInt(f.borderBottomWidth);return{left:b.left+d+g,right:b.right+d-i,top:b.top+e+h,bottom:b.bottom+e-j}},b._getPointerData=function(a){var b=this._pointerData[a];return b||(b=this._pointerData[a]={x:0,y:0}),b},b._handleMouseMove=function(a){a||(a=window.event),this._handlePointerMove(-1,a,a.pageX,a.pageY)},b._handlePointerMove=function(a,b,c,d,e){if((!this._prevStage||void 0!==e)&&this.canvas){var f=this._nextStage,g=this._getPointerData(a),h=g.inBounds;this._updatePointerPosition(a,b,c,d),(h||g.inBounds||this.mouseMoveOutside)&&(-1===a&&g.inBounds==!h&&this._dispatchMouseEvent(this,h?"mouseleave":"mouseenter",!1,a,g,b),this._dispatchMouseEvent(this,"stagemousemove",!1,a,g,b),this._dispatchMouseEvent(g.target,"pressmove",!0,a,g,b)),f&&f._handlePointerMove(a,b,c,d,null)}},b._updatePointerPosition=function(a,b,c,d){var e=this._getElementRect(this.canvas);c-=e.left,d-=e.top;var f=this.canvas.width,g=this.canvas.height;c/=(e.right-e.left)/f,d/=(e.bottom-e.top)/g;var h=this._getPointerData(a);(h.inBounds=c>=0&&d>=0&&f-1>=c&&g-1>=d)?(h.x=c,h.y=d):this.mouseMoveOutside&&(h.x=0>c?0:c>f-1?f-1:c,h.y=0>d?0:d>g-1?g-1:d),h.posEvtObj=b,h.rawX=c,h.rawY=d,(a===this._primaryPointerID||-1===a)&&(this.mouseX=h.x,this.mouseY=h.y,this.mouseInBounds=h.inBounds)},b._handleMouseUp=function(a){this._handlePointerUp(-1,a,!1)},b._handlePointerUp=function(a,b,c,d){var e=this._nextStage,f=this._getPointerData(a);if(!this._prevStage||void 0!==d){var g=null,h=f.target;d||!h&&!e||(g=this._getObjectsUnderPoint(f.x,f.y,null,!0)),f.down&&(this._dispatchMouseEvent(this,"stagemouseup",!1,a,f,b,g),f.down=!1),g==h&&this._dispatchMouseEvent(h,"click",!0,a,f,b),this._dispatchMouseEvent(h,"pressup",!0,a,f,b),c?(a==this._primaryPointerID&&(this._primaryPointerID=null),delete this._pointerData[a]):f.target=null,e&&e._handlePointerUp(a,b,c,d||g&&this)}},b._handleMouseDown=function(a){this._handlePointerDown(-1,a,a.pageX,a.pageY)},b._handlePointerDown=function(a,b,c,d,e){this.preventSelection&&b.preventDefault(),(null==this._primaryPointerID||-1===a)&&(this._primaryPointerID=a),null!=d&&this._updatePointerPosition(a,b,c,d);var f=null,g=this._nextStage,h=this._getPointerData(a);e||(f=h.target=this._getObjectsUnderPoint(h.x,h.y,null,!0)),h.inBounds&&(this._dispatchMouseEvent(this,"stagemousedown",!1,a,h,b,f),h.down=!0),this._dispatchMouseEvent(f,"mousedown",!0,a,h,b),g&&g._handlePointerDown(a,b,c,d,e||f&&this)},b._testMouseOver=function(a,b,c){if(!this._prevStage||void 0!==b){var d=this._nextStage;if(!this._mouseOverIntervalID)return void(d&&d._testMouseOver(a,b,c));var e=this._getPointerData(-1);if(e&&(a||this.mouseX!=this._mouseOverX||this.mouseY!=this._mouseOverY||!this.mouseInBounds)){var f,g,h,i=e.posEvtObj,j=c||i&&i.target==this.canvas,k=null,l=-1,m="";!b&&(a||this.mouseInBounds&&j)&&(k=this._getObjectsUnderPoint(this.mouseX,this.mouseY,null,!0),this._mouseOverX=this.mouseX,this._mouseOverY=this.mouseY);var n=this._mouseOverTarget||[],o=n[n.length-1],p=this._mouseOverTarget=[];for(f=k;f;)p.unshift(f),m||(m=f.cursor),f=f.parent;for(this.canvas.style.cursor=m,!b&&c&&(c.canvas.style.cursor=m),g=0,h=p.length;h>g&&p[g]==n[g];g++)l=g;for(o!=k&&this._dispatchMouseEvent(o,"mouseout",!0,-1,e,i,k),g=n.length-1;g>l;g--)this._dispatchMouseEvent(n[g],"rollout",!1,-1,e,i,k);for(g=p.length-1;g>l;g--)this._dispatchMouseEvent(p[g],"rollover",!1,-1,e,i,o);o!=k&&this._dispatchMouseEvent(k,"mouseover",!0,-1,e,i,o),d&&d._testMouseOver(a,b||k&&this,c||j&&this)}}},b._handleDoubleClick=function(a,b){var c=null,d=this._nextStage,e=this._getPointerData(-1);b||(c=this._getObjectsUnderPoint(e.x,e.y,null,!0),this._dispatchMouseEvent(c,"dblclick",!0,-1,e,a)),d&&d._handleDoubleClick(a,b||c&&this)},b._dispatchMouseEvent=function(a,b,c,d,e,f,g){if(a&&(c||a.hasEventListener(b))){var h=new createjs.MouseEvent(b,c,!1,e.x,e.y,f,d,d===this._primaryPointerID||-1===d,e.rawX,e.rawY,g);a.dispatchEvent(h)}},createjs.Stage=createjs.promote(a,"Container")}(),this.createjs=this.createjs||{},function(){function a(a){this.DisplayObject_constructor(),"string"==typeof a?(this.image=document.createElement("img"),this.image.src=a):this.image=a,this.sourceRect=null}var b=createjs.extend(a,createjs.DisplayObject);b.initialize=a,b.isVisible=function(){var a=this.image,b=this.cacheCanvas||a&&(a.naturalWidth||a.getContext||a.readyState>=2);return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY&&b)},b.draw=function(a,b){if(this.DisplayObject_draw(a,b)||!this.image)return!0;var c=this.image,d=this.sourceRect;if(d){var e=d.x,f=d.y,g=e+d.width,h=f+d.height,i=0,j=0,k=c.width,l=c.height;0>e&&(i-=e,e=0),g>k&&(g=k),0>f&&(j-=f,f=0),h>l&&(h=l),a.drawImage(c,e,f,g-e,h-f,i,j,g-e,h-f)}else a.drawImage(c,0,0);return!0},b.getBounds=function(){var a=this.DisplayObject_getBounds();if(a)return a;var b=this.image,c=this.sourceRect||b,d=b&&(b.naturalWidth||b.getContext||b.readyState>=2);return d?this._rectangle.setValues(0,0,c.width,c.height):null},b.clone=function(){var b=new a(this.image);return this.sourceRect&&(b.sourceRect=this.sourceRect.clone()),this._cloneProps(b),b},b.toString=function(){return"[Bitmap (name="+this.name+")]"},createjs.Bitmap=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b){this.DisplayObject_constructor(),this.currentFrame=0,this.currentAnimation=null,this.paused=!0,this.spriteSheet=a,this.currentAnimationFrame=0,this.framerate=0,this._animation=null,this._currentFrame=null,this._skipAdvance=!1,null!=b&&this.gotoAndPlay(b)}var b=createjs.extend(a,createjs.DisplayObject);b.initialize=a,b.isVisible=function(){var a=this.cacheCanvas||this.spriteSheet.complete;return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY&&a)},b.draw=function(a,b){if(this.DisplayObject_draw(a,b))return!0;this._normalizeFrame();var c=this.spriteSheet.getFrame(0|this._currentFrame);if(!c)return!1;var d=c.rect;return d.width&&d.height&&a.drawImage(c.image,d.x,d.y,d.width,d.height,-c.regX,-c.regY,d.width,d.height),!0},b.play=function(){this.paused=!1},b.stop=function(){this.paused=!0},b.gotoAndPlay=function(a){this.paused=!1,this._skipAdvance=!0,this._goto(a)},b.gotoAndStop=function(a){this.paused=!0,this._goto(a)},b.advance=function(a){var b=this.framerate||this.spriteSheet.framerate,c=b&&null!=a?a/(1e3/b):1;this._normalizeFrame(c)},b.getBounds=function(){return this.DisplayObject_getBounds()||this.spriteSheet.getFrameBounds(this.currentFrame,this._rectangle)},b.clone=function(){return this._cloneProps(new a(this.spriteSheet))},b.toString=function(){return"[Sprite (name="+this.name+")]"},b._cloneProps=function(a){return this.DisplayObject__cloneProps(a),a.currentFrame=this.currentFrame,a.currentAnimation=this.currentAnimation,a.paused=this.paused,a.currentAnimationFrame=this.currentAnimationFrame,a.framerate=this.framerate,a._animation=this._animation,a._currentFrame=this._currentFrame,a._skipAdvance=this._skipAdvance,a},b._tick=function(a){this.paused||(this._skipAdvance||this.advance(a&&a.delta),this._skipAdvance=!1),this.DisplayObject__tick(a)},b._normalizeFrame=function(a){a=a||0;var b,c=this._animation,d=this.paused,e=this._currentFrame;if(c){var f=c.speed||1,g=this.currentAnimationFrame;if(b=c.frames.length,g+a*f>=b){var h=c.next;if(this._dispatchAnimationEnd(c,e,d,h,b-1))return;if(h)return this._goto(h,a-(b-g)/f);this.paused=!0,g=c.frames.length-1}else g+=a*f;this.currentAnimationFrame=g,this._currentFrame=c.frames[0|g]}else if(e=this._currentFrame+=a,b=this.spriteSheet.getNumFrames(),e>=b&&b>0&&!this._dispatchAnimationEnd(c,e,d,b-1)&&(this._currentFrame-=b)>=b)return this._normalizeFrame();e=0|this._currentFrame,this.currentFrame!=e&&(this.currentFrame=e,this.dispatchEvent("change"))},b._dispatchAnimationEnd=function(a,b,c,d,e){var f=a?a.name:null;if(this.hasEventListener("animationend")){var g=new createjs.Event("animationend");g.name=f,g.next=d,this.dispatchEvent(g)}var h=this._animation!=a||this._currentFrame!=b;return h||c||!this.paused||(this.currentAnimationFrame=e,h=!0),h},b._goto=function(a,b){if(this.currentAnimationFrame=0,isNaN(a)){var c=this.spriteSheet.getAnimation(a);c&&(this._animation=c,this.currentAnimation=a,this._normalizeFrame(b))}else this.currentAnimation=this._animation=null,this._currentFrame=a,this._normalizeFrame()},createjs.Sprite=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.DisplayObject_constructor(),this.graphics=a?a:new createjs.Graphics}var b=createjs.extend(a,createjs.DisplayObject);b.isVisible=function(){var a=this.cacheCanvas||this.graphics&&!this.graphics.isEmpty();return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY&&a)},b.draw=function(a,b){return this.DisplayObject_draw(a,b)?!0:(this.graphics.draw(a,this),!0)},b.clone=function(b){var c=b&&this.graphics?this.graphics.clone():this.graphics;return this._cloneProps(new a(c))},b.toString=function(){return"[Shape (name="+this.name+")]"},createjs.Shape=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c){this.DisplayObject_constructor(),this.text=a,this.font=b,this.color=c,this.textAlign="left",this.textBaseline="top",this.maxWidth=null,this.outline=0,this.lineHeight=0,this.lineWidth=null}var b=createjs.extend(a,createjs.DisplayObject),c=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas");c.getContext&&(a._workingContext=c.getContext("2d"),c.width=c.height=1),a.H_OFFSETS={start:0,left:0,center:-.5,end:-1,right:-1},a.V_OFFSETS={top:0,hanging:-.01,middle:-.4,alphabetic:-.8,ideographic:-.85,bottom:-1},b.isVisible=function(){var a=this.cacheCanvas||null!=this.text&&""!==this.text;return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY&&a)},b.draw=function(a,b){if(this.DisplayObject_draw(a,b))return!0;var c=this.color||"#000";return this.outline?(a.strokeStyle=c,a.lineWidth=1*this.outline):a.fillStyle=c,this._drawText(this._prepContext(a)),!0},b.getMeasuredWidth=function(){return this._getMeasuredWidth(this.text)},b.getMeasuredLineHeight=function(){return 1.2*this._getMeasuredWidth("M")},b.getMeasuredHeight=function(){return this._drawText(null,{}).height},b.getBounds=function(){var b=this.DisplayObject_getBounds();if(b)return b;if(null==this.text||""===this.text)return null;var c=this._drawText(null,{}),d=this.maxWidth&&this.maxWidth<c.width?this.maxWidth:c.width,e=d*a.H_OFFSETS[this.textAlign||"left"],f=this.lineHeight||this.getMeasuredLineHeight(),g=f*a.V_OFFSETS[this.textBaseline||"top"];return this._rectangle.setValues(e,g,d,c.height)},b.getMetrics=function(){var b={lines:[]};return b.lineHeight=this.lineHeight||this.getMeasuredLineHeight(),b.vOffset=b.lineHeight*a.V_OFFSETS[this.textBaseline||"top"],this._drawText(null,b,b.lines)},b.clone=function(){return this._cloneProps(new a(this.text,this.font,this.color))},b.toString=function(){return"[Text (text="+(this.text.length>20?this.text.substr(0,17)+"...":this.text)+")]"},b._cloneProps=function(a){return this.DisplayObject__cloneProps(a),a.textAlign=this.textAlign,a.textBaseline=this.textBaseline,a.maxWidth=this.maxWidth,a.outline=this.outline,a.lineHeight=this.lineHeight,a.lineWidth=this.lineWidth,a},b._prepContext=function(a){return a.font=this.font||"10px sans-serif",a.textAlign=this.textAlign||"left",a.textBaseline=this.textBaseline||"top",a},b._drawText=function(b,c,d){var e=!!b;e||(b=a._workingContext,b.save(),this._prepContext(b));for(var f=this.lineHeight||this.getMeasuredLineHeight(),g=0,h=0,i=String(this.text).split(/(?:\r\n|\r|\n)/),j=0,k=i.length;k>j;j++){var l=i[j],m=null;if(null!=this.lineWidth&&(m=b.measureText(l).width)>this.lineWidth){var n=l.split(/(\s)/);l=n[0],m=b.measureText(l).width;for(var o=1,p=n.length;p>o;o+=2){var q=b.measureText(n[o]+n[o+1]).width;m+q>this.lineWidth?(e&&this._drawTextLine(b,l,h*f),d&&d.push(l),m>g&&(g=m),l=n[o+1],m=b.measureText(l).width,h++):(l+=n[o]+n[o+1],m+=q)}}e&&this._drawTextLine(b,l,h*f),d&&d.push(l),c&&null==m&&(m=b.measureText(l).width),m>g&&(g=m),h++}return c&&(c.width=g,c.height=h*f),e||b.restore(),c},b._drawTextLine=function(a,b,c){this.outline?a.strokeText(b,0,c,this.maxWidth||65535):a.fillText(b,0,c,this.maxWidth||65535)},b._getMeasuredWidth=function(b){var c=a._workingContext;c.save();var d=this._prepContext(c).measureText(b).width;return c.restore(),d},createjs.Text=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b){this.Container_constructor(),this.text=a||"",this.spriteSheet=b,this.lineHeight=0,this.letterSpacing=0,this.spaceWidth=0,this._oldProps={text:0,spriteSheet:0,lineHeight:0,letterSpacing:0,spaceWidth:0}}var b=createjs.extend(a,createjs.Container);a.maxPoolSize=100,a._spritePool=[],b.draw=function(a,b){this.DisplayObject_draw(a,b)||(this._updateText(),this.Container_draw(a,b))},b.getBounds=function(){return this._updateText(),this.Container_getBounds()},b.isVisible=function(){var a=this.cacheCanvas||this.spriteSheet&&this.spriteSheet.complete&&this.text;return!!(this.visible&&this.alpha>0&&0!==this.scaleX&&0!==this.scaleY&&a)},b.clone=function(){return this._cloneProps(new a(this.text,this.spriteSheet))},b.addChild=b.addChildAt=b.removeChild=b.removeChildAt=b.removeAllChildren=function(){},b._cloneProps=function(a){return this.Container__cloneProps(a),a.lineHeight=this.lineHeight,a.letterSpacing=this.letterSpacing,a.spaceWidth=this.spaceWidth,a},b._getFrameIndex=function(a,b){var c,d=b.getAnimation(a);return d||(a!=(c=a.toUpperCase())||a!=(c=a.toLowerCase())||(c=null),c&&(d=b.getAnimation(c))),d&&d.frames[0]},b._getFrame=function(a,b){var c=this._getFrameIndex(a,b);return null==c?c:b.getFrame(c)},b._getLineHeight=function(a){var b=this._getFrame("1",a)||this._getFrame("T",a)||this._getFrame("L",a)||a.getFrame(0);return b?b.rect.height:1},b._getSpaceWidth=function(a){var b=this._getFrame("1",a)||this._getFrame("l",a)||this._getFrame("e",a)||this._getFrame("a",a)||a.getFrame(0);return b?b.rect.width:1},b._updateText=function(){var b,c=0,d=0,e=this._oldProps,f=!1,g=this.spaceWidth,h=this.lineHeight,i=this.spriteSheet,j=a._spritePool,k=this.children,l=0,m=k.length;for(var n in e)e[n]!=this[n]&&(e[n]=this[n],f=!0);if(f){var o=!!this._getFrame(" ",i);o||g||(g=this._getSpaceWidth(i)),h||(h=this._getLineHeight(i));for(var p=0,q=this.text.length;q>p;p++){var r=this.text.charAt(p);if(" "!=r||o)if("\n"!=r&&"\r"!=r){var s=this._getFrameIndex(r,i);null!=s&&(m>l?b=k[l]:(k.push(b=j.length?j.pop():new createjs.Sprite),b.parent=this,m++),b.spriteSheet=i,b.gotoAndStop(s),b.x=c,b.y=d,l++,c+=b.getBounds().width+this.letterSpacing)}else"\r"==r&&"\n"==this.text.charAt(p+1)&&p++,c=0,d+=h;else c+=g}for(;m>l;)j.push(b=k.pop()),b.parent=null,m--;j.length>a.maxPoolSize&&(j.length=a.maxPoolSize)}},createjs.BitmapText=createjs.promote(a,"Container")}(),this.createjs=this.createjs||{},function(){"use strict";function a(b,c,d,e){this.Container_constructor(),!a.inited&&a.init(),this.mode=b||a.INDEPENDENT,this.startPosition=c||0,this.loop=d,this.currentFrame=0,this.timeline=new createjs.Timeline(null,e,{paused:!0,position:c,useTicks:!0}),this.paused=!1,this.actionsEnabled=!0,this.autoReset=!0,this.frameBounds=this.frameBounds||null,this.framerate=null,this._synchOffset=0,this._prevPos=-1,this._prevPosition=0,this._t=0,this._managed={}}function b(){throw"MovieClipPlugin cannot be instantiated."}var c=createjs.extend(a,createjs.Container);a.INDEPENDENT="independent",a.SINGLE_FRAME="single",a.SYNCHED="synched",a.inited=!1,a.init=function(){a.inited||(b.install(),a.inited=!0)},c.getLabels=function(){return this.timeline.getLabels()},c.getCurrentLabel=function(){return this._updateTimeline(),this.timeline.getCurrentLabel()},c.getDuration=function(){return this.timeline.duration};try{Object.defineProperties(c,{labels:{get:c.getLabels},currentLabel:{get:c.getCurrentLabel},totalFrames:{get:c.getDuration},duration:{get:c.getDuration}})}catch(d){}c.initialize=a,c.isVisible=function(){return!!(this.visible&&this.alpha>0&&0!=this.scaleX&&0!=this.scaleY)},c.draw=function(a,b){return this.DisplayObject_draw(a,b)?!0:(this._updateTimeline(),this.Container_draw(a,b),!0)
},c.play=function(){this.paused=!1},c.stop=function(){this.paused=!0},c.gotoAndPlay=function(a){this.paused=!1,this._goto(a)},c.gotoAndStop=function(a){this.paused=!0,this._goto(a)},c.advance=function(b){var c=a.INDEPENDENT;if(this.mode==c){for(var d=this,e=d.framerate;(d=d.parent)&&null==e;)d.mode==c&&(e=d._framerate);this._framerate=e;var f=null!=e&&-1!=e&&null!=b?b/(1e3/e)+this._t:1,g=0|f;for(this._t=f-g;!this.paused&&g--;)this._prevPosition=this._prevPos<0?0:this._prevPosition+1,this._updateTimeline()}},c.clone=function(){throw"MovieClip cannot be cloned."},c.toString=function(){return"[MovieClip (name="+this.name+")]"},c._tick=function(a){this.advance(a&&a.delta),this.Container__tick(a)},c._goto=function(a){var b=this.timeline.resolve(a);null!=b&&(-1==this._prevPos&&(this._prevPos=0/0),this._prevPosition=b,this._t=0,this._updateTimeline())},c._reset=function(){this._prevPos=-1,this._t=this.currentFrame=0,this.paused=!1},c._updateTimeline=function(){var b=this.timeline,c=this.mode!=a.INDEPENDENT;b.loop=null==this.loop?!0:this.loop;var d=c?this.startPosition+(this.mode==a.SINGLE_FRAME?0:this._synchOffset):this._prevPos<0?0:this._prevPosition,e=c||!this.actionsEnabled?createjs.Tween.NONE:null;if(this.currentFrame=b._calcPosition(d),b.setPosition(d,e),this._prevPosition=b._prevPosition,this._prevPos!=b._prevPos){this.currentFrame=this._prevPos=b._prevPos;for(var f in this._managed)this._managed[f]=1;for(var g=b._tweens,h=0,i=g.length;i>h;h++){var j=g[h],k=j._target;if(k!=this&&!j.passive){var l=j._stepPosition;k instanceof createjs.DisplayObject?this._addManagedChild(k,l):this._setState(k.state,l)}}var m=this.children;for(h=m.length-1;h>=0;h--){var n=m[h].id;1==this._managed[n]&&(this.removeChildAt(h),delete this._managed[n])}}},c._setState=function(a,b){if(a)for(var c=a.length-1;c>=0;c--){var d=a[c],e=d.t,f=d.p;for(var g in f)e[g]=f[g];this._addManagedChild(e,b)}},c._addManagedChild=function(b,c){b._off||(this.addChildAt(b,0),b instanceof a&&(b._synchOffset=c,b.mode==a.INDEPENDENT&&b.autoReset&&!this._managed[b.id]&&b._reset()),this._managed[b.id]=2)},c._getBounds=function(a,b){var c=this.DisplayObject_getBounds();return c||(this._updateTimeline(),this.frameBounds&&(c=this._rectangle.copy(this.frameBounds[this.currentFrame]))),c?this._transformBounds(c,a,b):this.Container__getBounds(a,b)},createjs.MovieClip=createjs.promote(a,"Container"),b.priority=100,b.install=function(){createjs.Tween.installPlugin(b,["startPosition"])},b.init=function(a,b,c){return c},b.step=function(){},b.tween=function(b,c,d,e,f,g){return b.target instanceof a?1==g?f[c]:e[c]:d}}(),this.createjs=this.createjs||{},function(){"use strict";function a(){throw"SpriteSheetUtils cannot be instantiated"}var b=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas");b.getContext&&(a._workingCanvas=b,a._workingContext=b.getContext("2d"),b.width=b.height=1),a.addFlippedFrames=function(b,c,d,e){if(c||d||e){var f=0;c&&a._flip(b,++f,!0,!1),d&&a._flip(b,++f,!1,!0),e&&a._flip(b,++f,!0,!0)}},a.extractFrame=function(b,c){isNaN(c)&&(c=b.getAnimation(c).frames[0]);var d=b.getFrame(c);if(!d)return null;var e=d.rect,f=a._workingCanvas;f.width=e.width,f.height=e.height,a._workingContext.drawImage(d.image,e.x,e.y,e.width,e.height,0,0,e.width,e.height);var g=document.createElement("img");return g.src=f.toDataURL("image/png"),g},a.mergeAlpha=function(a,b,c){c||(c=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas")),c.width=Math.max(b.width,a.width),c.height=Math.max(b.height,a.height);var d=c.getContext("2d");return d.save(),d.drawImage(a,0,0),d.globalCompositeOperation="destination-in",d.drawImage(b,0,0),d.restore(),c},a._flip=function(b,c,d,e){for(var f=b._images,g=a._workingCanvas,h=a._workingContext,i=f.length/c,j=0;i>j;j++){var k=f[j];k.__tmp=j,h.setTransform(1,0,0,1,0,0),h.clearRect(0,0,g.width+1,g.height+1),g.width=k.width,g.height=k.height,h.setTransform(d?-1:1,0,0,e?-1:1,d?k.width:0,e?k.height:0),h.drawImage(k,0,0);var l=document.createElement("img");l.src=g.toDataURL("image/png"),l.width=k.width,l.height=k.height,f.push(l)}var m=b._frames,n=m.length/c;for(j=0;n>j;j++){k=m[j];var o=k.rect.clone();l=f[k.image.__tmp+i*c];var p={image:l,rect:o,regX:k.regX,regY:k.regY};d&&(o.x=l.width-o.x-o.width,p.regX=o.width-k.regX),e&&(o.y=l.height-o.y-o.height,p.regY=o.height-k.regY),m.push(p)}var q="_"+(d?"h":"")+(e?"v":""),r=b._animations,s=b._data,t=r.length/c;for(j=0;t>j;j++){var u=r[j];k=s[u];var v={name:u+q,speed:k.speed,next:k.next,frames:[]};k.next&&(v.next+=q),m=k.frames;for(var w=0,x=m.length;x>w;w++)v.frames.push(m[w]+n*c);s[v.name]=v,r.push(v.name)}},createjs.SpriteSheetUtils=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.EventDispatcher_constructor(),this.maxWidth=2048,this.maxHeight=2048,this.spriteSheet=null,this.scale=1,this.padding=1,this.timeSlice=.3,this.progress=-1,this.framerate=a||0,this._frames=[],this._animations={},this._data=null,this._nextFrameIndex=0,this._index=0,this._timerID=null,this._scale=1}var b=createjs.extend(a,createjs.EventDispatcher);a.ERR_DIMENSIONS="frame dimensions exceed max spritesheet dimensions",a.ERR_RUNNING="a build is already running",b.addFrame=function(b,c,d,e,f){if(this._data)throw a.ERR_RUNNING;var g=c||b.bounds||b.nominalBounds;return!g&&b.getBounds&&(g=b.getBounds()),g?(d=d||1,this._frames.push({source:b,sourceRect:g,scale:d,funct:e,data:f,index:this._frames.length,height:g.height*d})-1):null},b.addAnimation=function(b,c,d,e){if(this._data)throw a.ERR_RUNNING;this._animations[b]={frames:c,next:d,speed:e}},b.addMovieClip=function(b,c,d,e,f,g){if(this._data)throw a.ERR_RUNNING;var h=b.frameBounds,i=c||b.bounds||b.nominalBounds;if(!i&&b.getBounds&&(i=b.getBounds()),i||h){var j,k,l=this._frames.length,m=b.timeline.duration;for(j=0;m>j;j++){var n=h&&h[j]?h[j]:i;this.addFrame(b,n,d,this._setupMovieClipFrame,{i:j,f:e,d:f})}var o=b.timeline._labels,p=[];for(var q in o)p.push({index:o[q],label:q});if(p.length)for(p.sort(function(a,b){return a.index-b.index}),j=0,k=p.length;k>j;j++){for(var r=p[j].label,s=l+p[j].index,t=l+(j==k-1?m:p[j+1].index),u=[],v=s;t>v;v++)u.push(v);(!g||(r=g(r,b,s,t)))&&this.addAnimation(r,u,!0)}}},b.build=function(){if(this._data)throw a.ERR_RUNNING;for(this._startBuild();this._drawNext(););return this._endBuild(),this.spriteSheet},b.buildAsync=function(b){if(this._data)throw a.ERR_RUNNING;this.timeSlice=b,this._startBuild();var c=this;this._timerID=setTimeout(function(){c._run()},50-50*Math.max(.01,Math.min(.99,this.timeSlice||.3)))},b.stopAsync=function(){clearTimeout(this._timerID),this._data=null},b.clone=function(){throw"SpriteSheetBuilder cannot be cloned."},b.toString=function(){return"[SpriteSheetBuilder]"},b._startBuild=function(){var b=this.padding||0;this.progress=0,this.spriteSheet=null,this._index=0,this._scale=this.scale;var c=[];this._data={images:[],frames:c,framerate:this.framerate,animations:this._animations};var d=this._frames.slice();if(d.sort(function(a,b){return a.height<=b.height?-1:1}),d[d.length-1].height+2*b>this.maxHeight)throw a.ERR_DIMENSIONS;for(var e=0,f=0,g=0;d.length;){var h=this._fillRow(d,e,g,c,b);if(h.w>f&&(f=h.w),e+=h.h,!h.h||!d.length){var i=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas");i.width=this._getSize(f,this.maxWidth),i.height=this._getSize(e,this.maxHeight),this._data.images[g]=i,h.h||(f=e=0,g++)}}},b._setupMovieClipFrame=function(a,b){var c=a.actionsEnabled;a.actionsEnabled=!1,a.gotoAndStop(b.i),a.actionsEnabled=c,b.f&&b.f(a,b.d,b.i)},b._getSize=function(a,b){for(var c=4;Math.pow(2,++c)<a;);return Math.min(b,Math.pow(2,c))},b._fillRow=function(b,c,d,e,f){var g=this.maxWidth,h=this.maxHeight;c+=f;for(var i=h-c,j=f,k=0,l=b.length-1;l>=0;l--){var m=b[l],n=this._scale*m.scale,o=m.sourceRect,p=m.source,q=Math.floor(n*o.x-f),r=Math.floor(n*o.y-f),s=Math.ceil(n*o.height+2*f),t=Math.ceil(n*o.width+2*f);if(t>g)throw a.ERR_DIMENSIONS;s>i||j+t>g||(m.img=d,m.rect=new createjs.Rectangle(j,c,t,s),k=k||s,b.splice(l,1),e[m.index]=[j,c,t,s,d,Math.round(-q+n*p.regX-f),Math.round(-r+n*p.regY-f)],j+=t)}return{w:j,h:k}},b._endBuild=function(){this.spriteSheet=new createjs.SpriteSheet(this._data),this._data=null,this.progress=1,this.dispatchEvent("complete")},b._run=function(){for(var a=50*Math.max(.01,Math.min(.99,this.timeSlice||.3)),b=(new Date).getTime()+a,c=!1;b>(new Date).getTime();)if(!this._drawNext()){c=!0;break}if(c)this._endBuild();else{var d=this;this._timerID=setTimeout(function(){d._run()},50-a)}var e=this.progress=this._index/this._frames.length;if(this.hasEventListener("progress")){var f=new createjs.Event("progress");f.progress=e,this.dispatchEvent(f)}},b._drawNext=function(){var a=this._frames[this._index],b=a.scale*this._scale,c=a.rect,d=a.sourceRect,e=this._data.images[a.img],f=e.getContext("2d");return a.funct&&a.funct(a.source,a.data),f.save(),f.beginPath(),f.rect(c.x,c.y,c.width,c.height),f.clip(),f.translate(Math.ceil(c.x-d.x*b),Math.ceil(c.y-d.y*b)),f.scale(b,b),a.source.draw(f),f.restore(),++this._index<this._frames.length},createjs.SpriteSheetBuilder=createjs.promote(a,"EventDispatcher")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.DisplayObject_constructor(),"string"==typeof a&&(a=document.getElementById(a)),this.mouseEnabled=!1;var b=a.style;b.position="absolute",b.transformOrigin=b.WebkitTransformOrigin=b.msTransformOrigin=b.MozTransformOrigin=b.OTransformOrigin="0% 0%",this.htmlElement=a,this._oldProps=null}var b=createjs.extend(a,createjs.DisplayObject);b.isVisible=function(){return null!=this.htmlElement},b.draw=function(){return!0},b.cache=function(){},b.uncache=function(){},b.updateCache=function(){},b.hitTest=function(){},b.localToGlobal=function(){},b.globalToLocal=function(){},b.localToLocal=function(){},b.clone=function(){throw"DOMElement cannot be cloned."},b.toString=function(){return"[DOMElement (name="+this.name+")]"},b._tick=function(a){var b=this.getStage();b&&b.on("drawend",this._handleDrawEnd,this,!0),this.DisplayObject__tick(a)},b._handleDrawEnd=function(){var a=this.htmlElement;if(a){var b=a.style,c=this.getConcatenatedDisplayProps(this._props),d=c.matrix,e=c.visible?"visible":"hidden";if(e!=b.visibility&&(b.visibility=e),c.visible){var f=this._oldProps,g=f&&f.matrix,h=1e4;if(!g||!g.equals(d)){var i="matrix("+(d.a*h|0)/h+","+(d.b*h|0)/h+","+(d.c*h|0)/h+","+(d.d*h|0)/h+","+(d.tx+.5|0);b.transform=b.WebkitTransform=b.OTransform=b.msTransform=i+","+(d.ty+.5|0)+")",b.MozTransform=i+"px,"+(d.ty+.5|0)+"px)",f||(f=this._oldProps=new createjs.DisplayProps(!0,0/0)),f.matrix.copy(d)}f.alpha!=c.alpha&&(b.opacity=""+(c.alpha*h|0)/h,f.alpha=c.alpha)}}},createjs.DOMElement=createjs.promote(a,"DisplayObject")}(),this.createjs=this.createjs||{},function(){"use strict";function a(){}var b=a.prototype;b.getBounds=function(a){return a},b.applyFilter=function(a,b,c,d,e,f,g,h){f=f||a,null==g&&(g=b),null==h&&(h=c);try{var i=a.getImageData(b,c,d,e)}catch(j){return!1}return this._applyFilter(i)?(f.putImageData(i,g,h),!0):!1},b.toString=function(){return"[Filter]"},b.clone=function(){return new a},b._applyFilter=function(){return!0},createjs.Filter=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c){(isNaN(a)||0>a)&&(a=0),(isNaN(b)||0>b)&&(b=0),(isNaN(c)||1>c)&&(c=1),this.blurX=0|a,this.blurY=0|b,this.quality=0|c}var b=createjs.extend(a,createjs.Filter);a.MUL_TABLE=[1,171,205,293,57,373,79,137,241,27,391,357,41,19,283,265,497,469,443,421,25,191,365,349,335,161,155,149,9,278,269,261,505,245,475,231,449,437,213,415,405,395,193,377,369,361,353,345,169,331,325,319,313,307,301,37,145,285,281,69,271,267,263,259,509,501,493,243,479,118,465,459,113,446,55,435,429,423,209,413,51,403,199,393,97,3,379,375,371,367,363,359,355,351,347,43,85,337,333,165,327,323,5,317,157,311,77,305,303,75,297,294,73,289,287,71,141,279,277,275,68,135,67,133,33,262,260,129,511,507,503,499,495,491,61,121,481,477,237,235,467,232,115,457,227,451,7,445,221,439,218,433,215,427,425,211,419,417,207,411,409,203,202,401,399,396,197,49,389,387,385,383,95,189,47,187,93,185,23,183,91,181,45,179,89,177,11,175,87,173,345,343,341,339,337,21,167,83,331,329,327,163,81,323,321,319,159,79,315,313,39,155,309,307,153,305,303,151,75,299,149,37,295,147,73,291,145,289,287,143,285,71,141,281,35,279,139,69,275,137,273,17,271,135,269,267,133,265,33,263,131,261,130,259,129,257,1],a.SHG_TABLE=[0,9,10,11,9,12,10,11,12,9,13,13,10,9,13,13,14,14,14,14,10,13,14,14,14,13,13,13,9,14,14,14,15,14,15,14,15,15,14,15,15,15,14,15,15,15,15,15,14,15,15,15,15,15,15,12,14,15,15,13,15,15,15,15,16,16,16,15,16,14,16,16,14,16,13,16,16,16,15,16,13,16,15,16,14,9,16,16,16,16,16,16,16,16,16,13,14,16,16,15,16,16,10,16,15,16,14,16,16,14,16,16,14,16,16,14,15,16,16,16,14,15,14,15,13,16,16,15,17,17,17,17,17,17,14,15,17,17,16,16,17,16,15,17,16,17,11,17,16,17,16,17,16,17,17,16,17,17,16,17,17,16,16,17,17,17,16,14,17,17,17,17,15,16,14,16,15,16,13,16,15,16,14,16,15,16,12,16,15,16,17,17,17,17,17,13,16,15,17,17,17,16,15,17,17,17,16,15,17,17,14,16,17,17,16,17,17,16,15,17,16,14,17,16,15,17,16,17,17,16,17,15,16,17,14,17,16,15,17,16,17,13,17,16,17,17,16,17,14,17,16,17,16,17,16,17,9],b.getBounds=function(a){var b=0|this.blurX,c=0|this.blurY;if(0>=b&&0>=c)return a;var d=Math.pow(this.quality,.2);return(a||new createjs.Rectangle).pad(b*d+1,c*d+1,b*d+1,c*d+1)},b.clone=function(){return new a(this.blurX,this.blurY,this.quality)},b.toString=function(){return"[BlurFilter]"},b._applyFilter=function(b){var c=this.blurX>>1;if(isNaN(c)||0>c)return!1;var d=this.blurY>>1;if(isNaN(d)||0>d)return!1;if(0==c&&0==d)return!1;var e=this.quality;(isNaN(e)||1>e)&&(e=1),e|=0,e>3&&(e=3),1>e&&(e=1);var f=b.data,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=c+c+1|0,w=d+d+1|0,x=0|b.width,y=0|b.height,z=x-1|0,A=y-1|0,B=c+1|0,C=d+1|0,D={r:0,b:0,g:0,a:0},E=D;for(i=1;v>i;i++)E=E.n={r:0,b:0,g:0,a:0};E.n=D;var F={r:0,b:0,g:0,a:0},G=F;for(i=1;w>i;i++)G=G.n={r:0,b:0,g:0,a:0};G.n=F;for(var H=null,I=0|a.MUL_TABLE[c],J=0|a.SHG_TABLE[c],K=0|a.MUL_TABLE[d],L=0|a.SHG_TABLE[d];e-->0;){m=l=0;var M=I,N=J;for(h=y;--h>-1;){for(n=B*(r=f[0|l]),o=B*(s=f[l+1|0]),p=B*(t=f[l+2|0]),q=B*(u=f[l+3|0]),E=D,i=B;--i>-1;)E.r=r,E.g=s,E.b=t,E.a=u,E=E.n;for(i=1;B>i;i++)j=l+((i>z?z:i)<<2)|0,n+=E.r=f[j],o+=E.g=f[j+1],p+=E.b=f[j+2],q+=E.a=f[j+3],E=E.n;for(H=D,g=0;x>g;g++)f[l++]=n*M>>>N,f[l++]=o*M>>>N,f[l++]=p*M>>>N,f[l++]=q*M>>>N,j=m+((j=g+c+1)<z?j:z)<<2,n-=H.r-(H.r=f[j]),o-=H.g-(H.g=f[j+1]),p-=H.b-(H.b=f[j+2]),q-=H.a-(H.a=f[j+3]),H=H.n;m+=x}for(M=K,N=L,g=0;x>g;g++){for(l=g<<2|0,n=C*(r=f[l])|0,o=C*(s=f[l+1|0])|0,p=C*(t=f[l+2|0])|0,q=C*(u=f[l+3|0])|0,G=F,i=0;C>i;i++)G.r=r,G.g=s,G.b=t,G.a=u,G=G.n;for(k=x,i=1;d>=i;i++)l=k+g<<2,n+=G.r=f[l],o+=G.g=f[l+1],p+=G.b=f[l+2],q+=G.a=f[l+3],G=G.n,A>i&&(k+=x);if(l=g,H=F,e>0)for(h=0;y>h;h++)j=l<<2,f[j+3]=u=q*M>>>N,u>0?(f[j]=n*M>>>N,f[j+1]=o*M>>>N,f[j+2]=p*M>>>N):f[j]=f[j+1]=f[j+2]=0,j=g+((j=h+C)<A?j:A)*x<<2,n-=H.r-(H.r=f[j]),o-=H.g-(H.g=f[j+1]),p-=H.b-(H.b=f[j+2]),q-=H.a-(H.a=f[j+3]),H=H.n,l+=x;else for(h=0;y>h;h++)j=l<<2,f[j+3]=u=q*M>>>N,u>0?(u=255/u,f[j]=(n*M>>>N)*u,f[j+1]=(o*M>>>N)*u,f[j+2]=(p*M>>>N)*u):f[j]=f[j+1]=f[j+2]=0,j=g+((j=h+C)<A?j:A)*x<<2,n-=H.r-(H.r=f[j]),o-=H.g-(H.g=f[j+1]),p-=H.b-(H.b=f[j+2]),q-=H.a-(H.a=f[j+3]),H=H.n,l+=x}}return!0},createjs.BlurFilter=createjs.promote(a,"Filter")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.alphaMap=a,this._alphaMap=null,this._mapData=null}var b=createjs.extend(a,createjs.Filter);b.clone=function(){var b=new a(this.alphaMap);return b._alphaMap=this._alphaMap,b._mapData=this._mapData,b},b.toString=function(){return"[AlphaMapFilter]"},b._applyFilter=function(a){if(!this.alphaMap)return!0;if(!this._prepAlphaMap())return!1;for(var b=a.data,c=this._mapData,d=0,e=b.length;e>d;d+=4)b[d+3]=c[d]||0;return!0},b._prepAlphaMap=function(){if(!this.alphaMap)return!1;if(this.alphaMap==this._alphaMap&&this._mapData)return!0;this._mapData=null;var a,b=this._alphaMap=this.alphaMap,c=b;b instanceof HTMLCanvasElement?a=c.getContext("2d"):(c=createjs.createCanvas?createjs.createCanvas():document.createElement("canvas"),c.width=b.width,c.height=b.height,a=c.getContext("2d"),a.drawImage(b,0,0));try{var d=a.getImageData(0,0,b.width,b.height)}catch(e){return!1}return this._mapData=d.data,!0},createjs.AlphaMapFilter=createjs.promote(a,"Filter")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.mask=a}var b=createjs.extend(a,createjs.Filter);b.applyFilter=function(a,b,c,d,e,f,g,h){return this.mask?(f=f||a,null==g&&(g=b),null==h&&(h=c),f.save(),a!=f?!1:(f.globalCompositeOperation="destination-in",f.drawImage(this.mask,g,h),f.restore(),!0)):!0},b.clone=function(){return new a(this.mask)},b.toString=function(){return"[AlphaMaskFilter]"},createjs.AlphaMaskFilter=createjs.promote(a,"Filter")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d,e,f,g,h){this.redMultiplier=null!=a?a:1,this.greenMultiplier=null!=b?b:1,this.blueMultiplier=null!=c?c:1,this.alphaMultiplier=null!=d?d:1,this.redOffset=e||0,this.greenOffset=f||0,this.blueOffset=g||0,this.alphaOffset=h||0}var b=createjs.extend(a,createjs.Filter);b.toString=function(){return"[ColorFilter]"},b.clone=function(){return new a(this.redMultiplier,this.greenMultiplier,this.blueMultiplier,this.alphaMultiplier,this.redOffset,this.greenOffset,this.blueOffset,this.alphaOffset)},b._applyFilter=function(a){for(var b=a.data,c=b.length,d=0;c>d;d+=4)b[d]=b[d]*this.redMultiplier+this.redOffset,b[d+1]=b[d+1]*this.greenMultiplier+this.greenOffset,b[d+2]=b[d+2]*this.blueMultiplier+this.blueOffset,b[d+3]=b[d+3]*this.alphaMultiplier+this.alphaOffset;return!0},createjs.ColorFilter=createjs.promote(a,"Filter")}(),this.createjs=this.createjs||{},function(){"use strict";function a(a,b,c,d){this.setColor(a,b,c,d)}var b=a.prototype;a.DELTA_INDEX=[0,.01,.02,.04,.05,.06,.07,.08,.1,.11,.12,.14,.15,.16,.17,.18,.2,.21,.22,.24,.25,.27,.28,.3,.32,.34,.36,.38,.4,.42,.44,.46,.48,.5,.53,.56,.59,.62,.65,.68,.71,.74,.77,.8,.83,.86,.89,.92,.95,.98,1,1.06,1.12,1.18,1.24,1.3,1.36,1.42,1.48,1.54,1.6,1.66,1.72,1.78,1.84,1.9,1.96,2,2.12,2.25,2.37,2.5,2.62,2.75,2.87,3,3.2,3.4,3.6,3.8,4,4.3,4.7,4.9,5,5.5,6,6.5,6.8,7,7.3,7.5,7.8,8,8.4,8.7,9,9.4,9.6,9.8,10],a.IDENTITY_MATRIX=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],a.LENGTH=a.IDENTITY_MATRIX.length,b.setColor=function(a,b,c,d){return this.reset().adjustColor(a,b,c,d)},b.reset=function(){return this.copy(a.IDENTITY_MATRIX)},b.adjustColor=function(a,b,c,d){return this.adjustHue(d),this.adjustContrast(b),this.adjustBrightness(a),this.adjustSaturation(c)},b.adjustBrightness=function(a){return 0==a||isNaN(a)?this:(a=this._cleanValue(a,255),this._multiplyMatrix([1,0,0,0,a,0,1,0,0,a,0,0,1,0,a,0,0,0,1,0,0,0,0,0,1]),this)},b.adjustContrast=function(b){if(0==b||isNaN(b))return this;b=this._cleanValue(b,100);var c;return 0>b?c=127+b/100*127:(c=b%1,c=0==c?a.DELTA_INDEX[b]:a.DELTA_INDEX[b<<0]*(1-c)+a.DELTA_INDEX[(b<<0)+1]*c,c=127*c+127),this._multiplyMatrix([c/127,0,0,0,.5*(127-c),0,c/127,0,0,.5*(127-c),0,0,c/127,0,.5*(127-c),0,0,0,1,0,0,0,0,0,1]),this},b.adjustSaturation=function(a){if(0==a||isNaN(a))return this;a=this._cleanValue(a,100);var b=1+(a>0?3*a/100:a/100),c=.3086,d=.6094,e=.082;return this._multiplyMatrix([c*(1-b)+b,d*(1-b),e*(1-b),0,0,c*(1-b),d*(1-b)+b,e*(1-b),0,0,c*(1-b),d*(1-b),e*(1-b)+b,0,0,0,0,0,1,0,0,0,0,0,1]),this},b.adjustHue=function(a){if(0==a||isNaN(a))return this;a=this._cleanValue(a,180)/180*Math.PI;var b=Math.cos(a),c=Math.sin(a),d=.213,e=.715,f=.072;return this._multiplyMatrix([d+b*(1-d)+c*-d,e+b*-e+c*-e,f+b*-f+c*(1-f),0,0,d+b*-d+.143*c,e+b*(1-e)+.14*c,f+b*-f+c*-.283,0,0,d+b*-d+c*-(1-d),e+b*-e+c*e,f+b*(1-f)+c*f,0,0,0,0,0,1,0,0,0,0,0,1]),this},b.concat=function(b){return b=this._fixMatrix(b),b.length!=a.LENGTH?this:(this._multiplyMatrix(b),this)},b.clone=function(){return(new a).copy(this)},b.toArray=function(){for(var b=[],c=0,d=a.LENGTH;d>c;c++)b[c]=this[c];return b},b.copy=function(b){for(var c=a.LENGTH,d=0;c>d;d++)this[d]=b[d];return this},b.toString=function(){return"[ColorMatrix]"},b._multiplyMatrix=function(a){var b,c,d,e=[];for(b=0;5>b;b++){for(c=0;5>c;c++)e[c]=this[c+5*b];for(c=0;5>c;c++){var f=0;for(d=0;5>d;d++)f+=a[c+5*d]*e[d];this[c+5*b]=f}}},b._cleanValue=function(a,b){return Math.min(b,Math.max(-b,a))},b._fixMatrix=function(b){return b instanceof a&&(b=b.toArray()),b.length<a.LENGTH?b=b.slice(0,b.length).concat(a.IDENTITY_MATRIX.slice(b.length,a.LENGTH)):b.length>a.LENGTH&&(b=b.slice(0,a.LENGTH)),b},createjs.ColorMatrix=a}(),this.createjs=this.createjs||{},function(){"use strict";function a(a){this.matrix=a}var b=createjs.extend(a,createjs.Filter);b.toString=function(){return"[ColorMatrixFilter]"},b.clone=function(){return new a(this.matrix)},b._applyFilter=function(a){for(var b,c,d,e,f=a.data,g=f.length,h=this.matrix,i=h[0],j=h[1],k=h[2],l=h[3],m=h[4],n=h[5],o=h[6],p=h[7],q=h[8],r=h[9],s=h[10],t=h[11],u=h[12],v=h[13],w=h[14],x=h[15],y=h[16],z=h[17],A=h[18],B=h[19],C=0;g>C;C+=4)b=f[C],c=f[C+1],d=f[C+2],e=f[C+3],f[C]=b*i+c*j+d*k+e*l+m,f[C+1]=b*n+c*o+d*p+e*q+r,f[C+2]=b*s+c*t+d*u+e*v+w,f[C+3]=b*x+c*y+d*z+e*A+B;return!0},createjs.ColorMatrixFilter=createjs.promote(a,"Filter")}(),this.createjs=this.createjs||{},function(){"use strict";function a(){throw"Touch cannot be instantiated"}a.isSupported=function(){return!!("ontouchstart"in window||window.navigator.msPointerEnabled&&window.navigator.msMaxTouchPoints>0||window.navigator.pointerEnabled&&window.navigator.maxTouchPoints>0)},a.enable=function(b,c,d){return b&&b.canvas&&a.isSupported()?b.__touch?!0:(b.__touch={pointers:{},multitouch:!c,preventDefault:!d,count:0},"ontouchstart"in window?a._IOS_enable(b):(window.navigator.msPointerEnabled||window.navigator.pointerEnabled)&&a._IE_enable(b),!0):!1},a.disable=function(b){b&&("ontouchstart"in window?a._IOS_disable(b):(window.navigator.msPointerEnabled||window.navigator.pointerEnabled)&&a._IE_disable(b),delete b.__touch)},a._IOS_enable=function(b){var c=b.canvas,d=b.__touch.f=function(c){a._IOS_handleEvent(b,c)};c.addEventListener("touchstart",d,!1),c.addEventListener("touchmove",d,!1),c.addEventListener("touchend",d,!1),c.addEventListener("touchcancel",d,!1)},a._IOS_disable=function(a){var b=a.canvas;if(b){var c=a.__touch.f;b.removeEventListener("touchstart",c,!1),b.removeEventListener("touchmove",c,!1),b.removeEventListener("touchend",c,!1),b.removeEventListener("touchcancel",c,!1)}},a._IOS_handleEvent=function(a,b){if(a){a.__touch.preventDefault&&b.preventDefault&&b.preventDefault();for(var c=b.changedTouches,d=b.type,e=0,f=c.length;f>e;e++){var g=c[e],h=g.identifier;g.target==a.canvas&&("touchstart"==d?this._handleStart(a,h,b,g.pageX,g.pageY):"touchmove"==d?this._handleMove(a,h,b,g.pageX,g.pageY):("touchend"==d||"touchcancel"==d)&&this._handleEnd(a,h,b))}}},a._IE_enable=function(b){var c=b.canvas,d=b.__touch.f=function(c){a._IE_handleEvent(b,c)};void 0===window.navigator.pointerEnabled?(c.addEventListener("MSPointerDown",d,!1),window.addEventListener("MSPointerMove",d,!1),window.addEventListener("MSPointerUp",d,!1),window.addEventListener("MSPointerCancel",d,!1),b.__touch.preventDefault&&(c.style.msTouchAction="none")):(c.addEventListener("pointerdown",d,!1),window.addEventListener("pointermove",d,!1),window.addEventListener("pointerup",d,!1),window.addEventListener("pointercancel",d,!1),b.__touch.preventDefault&&(c.style.touchAction="none")),b.__touch.activeIDs={}},a._IE_disable=function(a){var b=a.__touch.f;void 0===window.navigator.pointerEnabled?(window.removeEventListener("MSPointerMove",b,!1),window.removeEventListener("MSPointerUp",b,!1),window.removeEventListener("MSPointerCancel",b,!1),a.canvas&&a.canvas.removeEventListener("MSPointerDown",b,!1)):(window.removeEventListener("pointermove",b,!1),window.removeEventListener("pointerup",b,!1),window.removeEventListener("pointercancel",b,!1),a.canvas&&a.canvas.removeEventListener("pointerdown",b,!1))},a._IE_handleEvent=function(a,b){if(a){a.__touch.preventDefault&&b.preventDefault&&b.preventDefault();var c=b.type,d=b.pointerId,e=a.__touch.activeIDs;if("MSPointerDown"==c||"pointerdown"==c){if(b.srcElement!=a.canvas)return;e[d]=!0,this._handleStart(a,d,b,b.pageX,b.pageY)}else e[d]&&("MSPointerMove"==c||"pointermove"==c?this._handleMove(a,d,b,b.pageX,b.pageY):("MSPointerUp"==c||"MSPointerCancel"==c||"pointerup"==c||"pointercancel"==c)&&(delete e[d],this._handleEnd(a,d,b)))}},a._handleStart=function(a,b,c,d,e){var f=a.__touch;if(f.multitouch||!f.count){var g=f.pointers;g[b]||(g[b]=!0,f.count++,a._handlePointerDown(b,c,d,e))}},a._handleMove=function(a,b,c,d,e){a.__touch.pointers[b]&&a._handlePointerMove(b,c,d,e)},a._handleEnd=function(a,b,c){var d=a.__touch,e=d.pointers;e[b]&&(d.count--,a._handlePointerUp(b,c,!0),delete e[b])},createjs.Touch=a}(),this.createjs=this.createjs||{},function(){"use strict";var a=createjs.EaselJS=createjs.EaselJS||{};a.version="0.8.2",a.buildDate="Thu, 26 Nov 2015 20:44:34 GMT"}();
define("easel", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.createjs;
    };
}(this)));

define('tetris/constants',[], function(){
    'use strict';

    return {
        COLOR_BG: '#000000',
        COLOR_FG: '#C2FFAE',
        PAGE_INTRO: 'PAGE_INTRO',
        PAGE_GAME: 'PAGE_GAME',
        PAGE_FINAL: 'PAGE_FINAL',
        GAME_WIDTH: 400,
        GAME_HEIGHT: 600,
        PIXEL_WIDTH: 24,
        FIELD_WIDTH: 12,
        FIELD_HEIGHT: 23,
        HISTORY: 9,
        FONT: '"Nova Mono", monospace',

        KEY_LEFT: 'KEY_LEFT',
        KEY_RIGHT: 'KEY_RIGHT',
        KEY_DROP: 'KEY_DROP',
        KEY_ROTATE: 'KEY_ROTATE',
        KEY_BACK: 'KEY_BACK',
        KEY_MAGIC: 'KEY_MAGIC',
    };
});

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define('redux',[], factory);
	else if(typeof exports === 'object')
		exports["Redux"] = factory();
	else
		root["Redux"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _createStore = __webpack_require__(1);

	var _createStore2 = _interopRequireDefault(_createStore);

	var _utilsCombineReducers = __webpack_require__(7);

	var _utilsCombineReducers2 = _interopRequireDefault(_utilsCombineReducers);

	var _utilsBindActionCreators = __webpack_require__(6);

	var _utilsBindActionCreators2 = _interopRequireDefault(_utilsBindActionCreators);

	var _utilsApplyMiddleware = __webpack_require__(5);

	var _utilsApplyMiddleware2 = _interopRequireDefault(_utilsApplyMiddleware);

	var _utilsCompose = __webpack_require__(2);

	var _utilsCompose2 = _interopRequireDefault(_utilsCompose);

	exports.createStore = _createStore2['default'];
	exports.combineReducers = _utilsCombineReducers2['default'];
	exports.bindActionCreators = _utilsBindActionCreators2['default'];
	exports.applyMiddleware = _utilsApplyMiddleware2['default'];
	exports.compose = _utilsCompose2['default'];

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports['default'] = createStore;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _utilsIsPlainObject = __webpack_require__(3);

	var _utilsIsPlainObject2 = _interopRequireDefault(_utilsIsPlainObject);

	/**
	 * These are private action types reserved by Redux.
	 * For any unknown actions, you must return the current state.
	 * If the current state is undefined, you must return the initial state.
	 * Do not reference these action types directly in your code.
	 */
	var ActionTypes = {
	  INIT: '@@redux/INIT'
	};

	exports.ActionTypes = ActionTypes;
	/**
	 * Creates a Redux store that holds the state tree.
	 * The only way to change the data in the store is to call `dispatch()` on it.
	 *
	 * There should only be a single store in your app. To specify how different
	 * parts of the state tree respond to actions, you may combine several reducers
	 * into a single reducer function by using `combineReducers`.
	 *
	 * @param {Function} reducer A function that returns the next state tree, given
	 * the current state tree and the action to handle.
	 *
	 * @param {any} [initialState] The initial state. You may optionally specify it
	 * to hydrate the state from the server in universal apps, or to restore a
	 * previously serialized user session.
	 * If you use `combineReducers` to produce the root reducer function, this must be
	 * an object with the same shape as `combineReducers` keys.
	 *
	 * @returns {Store} A Redux store that lets you read the state, dispatch actions
	 * and subscribe to changes.
	 */

	function createStore(reducer, initialState) {
	  if (typeof reducer !== 'function') {
	    throw new Error('Expected the reducer to be a function.');
	  }

	  var currentReducer = reducer;
	  var currentState = initialState;
	  var listeners = [];
	  var isDispatching = false;

	  /**
	   * Reads the state tree managed by the store.
	   *
	   * @returns {any} The current state tree of your application.
	   */
	  function getState() {
	    return currentState;
	  }

	  /**
	   * Adds a change listener. It will be called any time an action is dispatched,
	   * and some part of the state tree may potentially have changed. You may then
	   * call `getState()` to read the current state tree inside the callback.
	   *
	   * @param {Function} listener A callback to be invoked on every dispatch.
	   * @returns {Function} A function to remove this change listener.
	   */
	  function subscribe(listener) {
	    listeners.push(listener);
	    var isSubscribed = true;

	    return function unsubscribe() {
	      if (!isSubscribed) {
	        return;
	      }

	      isSubscribed = false;
	      var index = listeners.indexOf(listener);
	      listeners.splice(index, 1);
	    };
	  }

	  /**
	   * Dispatches an action. It is the only way to trigger a state change.
	   *
	   * The `reducer` function, used to create the store, will be called with the
	   * current state tree and the given `action`. Its return value will
	   * be considered the **next** state of the tree, and the change listeners
	   * will be notified.
	   *
	   * The base implementation only supports plain object actions. If you want to
	   * dispatch a Promise, an Observable, a thunk, or something else, you need to
	   * wrap your store creating function into the corresponding middleware. For
	   * example, see the documentation for the `redux-thunk` package. Even the
	   * middleware will eventually dispatch plain object actions using this method.
	   *
	   * @param {Object} action A plain object representing “what changed”. It is
	   * a good idea to keep actions serializable so you can record and replay user
	   * sessions, or use the time travelling `redux-devtools`. An action must have
	   * a `type` property which may not be `undefined`. It is a good idea to use
	   * string constants for action types.
	   *
	   * @returns {Object} For convenience, the same action object you dispatched.
	   *
	   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
	   * return something else (for example, a Promise you can await).
	   */
	  function dispatch(action) {
	    if (!_utilsIsPlainObject2['default'](action)) {
	      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
	    }

	    if (typeof action.type === 'undefined') {
	      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
	    }

	    if (isDispatching) {
	      throw new Error('Reducers may not dispatch actions.');
	    }

	    try {
	      isDispatching = true;
	      currentState = currentReducer(currentState, action);
	    } finally {
	      isDispatching = false;
	    }

	    listeners.slice().forEach(function (listener) {
	      return listener();
	    });
	    return action;
	  }

	  /**
	   * Replaces the reducer currently used by the store to calculate the state.
	   *
	   * You might need this if your app implements code splitting and you want to
	   * load some of the reducers dynamically. You might also need this if you
	   * implement a hot reloading mechanism for Redux.
	   *
	   * @param {Function} nextReducer The reducer for the store to use instead.
	   * @returns {void}
	   */
	  function replaceReducer(nextReducer) {
	    currentReducer = nextReducer;
	    dispatch({ type: ActionTypes.INIT });
	  }

	  // When a store is created, an "INIT" action is dispatched so that every
	  // reducer returns their initial state. This effectively populates
	  // the initial state tree.
	  dispatch({ type: ActionTypes.INIT });

	  return {
	    dispatch: dispatch,
	    subscribe: subscribe,
	    getState: getState,
	    replaceReducer: replaceReducer
	  };
	}

/***/ },
/* 2 */
/***/ function(module, exports) {

	/**
	 * Composes single-argument functions from right to left.
	 *
	 * @param {...Function} funcs The functions to compose.
	 * @returns {Function} A function obtained by composing functions from right to
	 * left. For example, compose(f, g, h) is identical to arg => f(g(h(arg))).
	 */
	"use strict";

	exports.__esModule = true;
	exports["default"] = compose;

	function compose() {
	  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	    funcs[_key] = arguments[_key];
	  }

	  return function (arg) {
	    return funcs.reduceRight(function (composed, f) {
	      return f(composed);
	    }, arg);
	  };
	}

	module.exports = exports["default"];

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports['default'] = isPlainObject;
	var fnToString = function fnToString(fn) {
	  return Function.prototype.toString.call(fn);
	};

	/**
	 * @param {any} obj The object to inspect.
	 * @returns {boolean} True if the argument appears to be a plain object.
	 */

	function isPlainObject(obj) {
	  if (!obj || typeof obj !== 'object') {
	    return false;
	  }

	  var proto = typeof obj.constructor === 'function' ? Object.getPrototypeOf(obj) : Object.prototype;

	  if (proto === null) {
	    return true;
	  }

	  var constructor = proto.constructor;

	  return typeof constructor === 'function' && constructor instanceof constructor && fnToString(constructor) === fnToString(Object);
	}

	module.exports = exports['default'];

/***/ },
/* 4 */
/***/ function(module, exports) {

	/**
	 * Applies a function to every key-value pair inside an object.
	 *
	 * @param {Object} obj The source object.
	 * @param {Function} fn The mapper function that receives the value and the key.
	 * @returns {Object} A new object that contains the mapped values for the keys.
	 */
	"use strict";

	exports.__esModule = true;
	exports["default"] = mapValues;

	function mapValues(obj, fn) {
	  return Object.keys(obj).reduce(function (result, key) {
	    result[key] = fn(obj[key], key);
	    return result;
	  }, {});
	}

	module.exports = exports["default"];

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	exports['default'] = applyMiddleware;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _compose = __webpack_require__(2);

	var _compose2 = _interopRequireDefault(_compose);

	/**
	 * Creates a store enhancer that applies middleware to the dispatch method
	 * of the Redux store. This is handy for a variety of tasks, such as expressing
	 * asynchronous actions in a concise manner, or logging every action payload.
	 *
	 * See `redux-thunk` package as an example of the Redux middleware.
	 *
	 * Because middleware is potentially asynchronous, this should be the first
	 * store enhancer in the composition chain.
	 *
	 * Note that each middleware will be given the `dispatch` and `getState` functions
	 * as named arguments.
	 *
	 * @param {...Function} middlewares The middleware chain to be applied.
	 * @returns {Function} A store enhancer applying the middleware.
	 */

	function applyMiddleware() {
	  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
	    middlewares[_key] = arguments[_key];
	  }

	  return function (next) {
	    return function (reducer, initialState) {
	      var store = next(reducer, initialState);
	      var _dispatch = store.dispatch;
	      var chain = [];

	      var middlewareAPI = {
	        getState: store.getState,
	        dispatch: function dispatch(action) {
	          return _dispatch(action);
	        }
	      };
	      chain = middlewares.map(function (middleware) {
	        return middleware(middlewareAPI);
	      });
	      _dispatch = _compose2['default'].apply(undefined, chain)(store.dispatch);

	      return _extends({}, store, {
	        dispatch: _dispatch
	      });
	    };
	  };
	}

	module.exports = exports['default'];

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports['default'] = bindActionCreators;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _utilsMapValues = __webpack_require__(4);

	var _utilsMapValues2 = _interopRequireDefault(_utilsMapValues);

	function bindActionCreator(actionCreator, dispatch) {
	  return function () {
	    return dispatch(actionCreator.apply(undefined, arguments));
	  };
	}

	/**
	 * Turns an object whose values are action creators, into an object with the
	 * same keys, but with every function wrapped into a `dispatch` call so they
	 * may be invoked directly. This is just a convenience method, as you can call
	 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
	 *
	 * For convenience, you can also pass a single function as the first argument,
	 * and get a function in return.
	 *
	 * @param {Function|Object} actionCreators An object whose values are action
	 * creator functions. One handy way to obtain it is to use ES6 `import * as`
	 * syntax. You may also pass a single function.
	 *
	 * @param {Function} dispatch The `dispatch` function available on your Redux
	 * store.
	 *
	 * @returns {Function|Object} The object mimicking the original object, but with
	 * every action creator wrapped into the `dispatch` call. If you passed a
	 * function as `actionCreators`, the return value will also be a single
	 * function.
	 */

	function bindActionCreators(actionCreators, dispatch) {
	  if (typeof actionCreators === 'function') {
	    return bindActionCreator(actionCreators, dispatch);
	  }

	  if (typeof actionCreators !== 'object' || actionCreators === null || actionCreators === undefined) {
	    // eslint-disable-line no-eq-null
	    throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
	  }

	  return _utilsMapValues2['default'](actionCreators, function (actionCreator) {
	    return bindActionCreator(actionCreator, dispatch);
	  });
	}

	module.exports = exports['default'];

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports['default'] = combineReducers;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _createStore = __webpack_require__(1);

	var _utilsIsPlainObject = __webpack_require__(3);

	var _utilsIsPlainObject2 = _interopRequireDefault(_utilsIsPlainObject);

	var _utilsMapValues = __webpack_require__(4);

	var _utilsMapValues2 = _interopRequireDefault(_utilsMapValues);

	var _utilsPick = __webpack_require__(8);

	var _utilsPick2 = _interopRequireDefault(_utilsPick);

	/* eslint-disable no-console */

	function getUndefinedStateErrorMessage(key, action) {
	  var actionType = action && action.type;
	  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

	  return 'Reducer "' + key + '" returned undefined handling ' + actionName + '. ' + 'To ignore an action, you must explicitly return the previous state.';
	}

	function getUnexpectedStateKeyWarningMessage(inputState, outputState, action) {
	  var reducerKeys = Object.keys(outputState);
	  var argumentName = action && action.type === _createStore.ActionTypes.INIT ? 'initialState argument passed to createStore' : 'previous state received by the reducer';

	  if (reducerKeys.length === 0) {
	    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
	  }

	  if (!_utilsIsPlainObject2['default'](inputState)) {
	    return 'The ' + argumentName + ' has unexpected type of "' + ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
	  }

	  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
	    return reducerKeys.indexOf(key) < 0;
	  });

	  if (unexpectedKeys.length > 0) {
	    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
	  }
	}

	function assertReducerSanity(reducers) {
	  Object.keys(reducers).forEach(function (key) {
	    var reducer = reducers[key];
	    var initialState = reducer(undefined, { type: _createStore.ActionTypes.INIT });

	    if (typeof initialState === 'undefined') {
	      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined.');
	    }

	    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
	    if (typeof reducer(undefined, { type: type }) === 'undefined') {
	      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + _createStore.ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined.');
	    }
	  });
	}

	/**
	 * Turns an object whose values are different reducer functions, into a single
	 * reducer function. It will call every child reducer, and gather their results
	 * into a single state object, whose keys correspond to the keys of the passed
	 * reducer functions.
	 *
	 * @param {Object} reducers An object whose values correspond to different
	 * reducer functions that need to be combined into one. One handy way to obtain
	 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
	 * undefined for any action. Instead, they should return their initial state
	 * if the state passed to them was undefined, and the current state for any
	 * unrecognized action.
	 *
	 * @returns {Function} A reducer function that invokes every reducer inside the
	 * passed object, and builds a state object with the same shape.
	 */

	function combineReducers(reducers) {
	  var finalReducers = _utilsPick2['default'](reducers, function (val) {
	    return typeof val === 'function';
	  });
	  var sanityError;

	  try {
	    assertReducerSanity(finalReducers);
	  } catch (e) {
	    sanityError = e;
	  }

	  var defaultState = _utilsMapValues2['default'](finalReducers, function () {
	    return undefined;
	  });

	  return function combination(state, action) {
	    if (state === undefined) state = defaultState;

	    if (sanityError) {
	      throw sanityError;
	    }

	    var hasChanged = false;
	    var finalState = _utilsMapValues2['default'](finalReducers, function (reducer, key) {
	      var previousStateForKey = state[key];
	      var nextStateForKey = reducer(previousStateForKey, action);
	      if (typeof nextStateForKey === 'undefined') {
	        var errorMessage = getUndefinedStateErrorMessage(key, action);
	        throw new Error(errorMessage);
	      }
	      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
	      return nextStateForKey;
	    });

	    if (true) {
	      var warningMessage = getUnexpectedStateKeyWarningMessage(state, finalState, action);
	      if (warningMessage) {
	        console.error(warningMessage);
	      }
	    }

	    return hasChanged ? finalState : state;
	  };
	}

	module.exports = exports['default'];

/***/ },
/* 8 */
/***/ function(module, exports) {

	/**
	 * Picks key-value pairs from an object where values satisfy a predicate.
	 *
	 * @param {Object} obj The object to pick from.
	 * @param {Function} fn The predicate the values must satisfy to be copied.
	 * @returns {Object} The object with the values that satisfied the predicate.
	 */
	"use strict";

	exports.__esModule = true;
	exports["default"] = pick;

	function pick(obj, fn) {
	  return Object.keys(obj).reduce(function (result, key) {
	    if (fn(obj[key])) {
	      result[key] = obj[key];
	    }
	    return result;
	  }, {});
	}

	module.exports = exports["default"];

/***/ }
/******/ ])
});
;
//  Ramda v0.20.1
//  https://github.com/ramda/ramda
//  (c) 2013-2016 Scott Sauyet, Michael Hurley, and David Chambers
//  Ramda may be freely distributed under the MIT license.

(function(){"use strict";var t={"@@functional/placeholder":!0},n=function(t,n){switch(t){case 0:return function(){return n.apply(this,arguments)};case 1:return function(t){return n.apply(this,arguments)};case 2:return function(t,r){return n.apply(this,arguments)};case 3:return function(t,r,e){return n.apply(this,arguments)};case 4:return function(t,r,e,u){return n.apply(this,arguments)};case 5:return function(t,r,e,u,i){return n.apply(this,arguments)};case 6:return function(t,r,e,u,i,o){return n.apply(this,arguments)};case 7:return function(t,r,e,u,i,o,c){return n.apply(this,arguments)};case 8:return function(t,r,e,u,i,o,c,s){return n.apply(this,arguments)};case 9:return function(t,r,e,u,i,o,c,s,a){return n.apply(this,arguments)};case 10:return function(t,r,e,u,i,o,c,s,a,f){return n.apply(this,arguments)};default:throw new Error("First argument to _arity must be a non-negative integer no greater than ten")}},r=function(t){for(var n,r=[];!(n=t.next()).done;)r.push(n.value);return r},e=function(){return Array.prototype.slice.call(arguments)},u=function(t){return new RegExp(t.source,(t.global?"g":"")+(t.ignoreCase?"i":"")+(t.multiline?"m":"")+(t.sticky?"y":"")+(t.unicode?"u":""))},i=function(t){return function(){return!t.apply(this,arguments)}},o=function(t,n){t=t||[],n=n||[];var r,e=t.length,u=n.length,i=[];for(r=0;e>r;)i[i.length]=t[r],r+=1;for(r=0;u>r;)i[i.length]=n[r],r+=1;return i},c=function(t,n,r){for(var e=0,u=r.length;u>e;){if(t(n,r[e]))return!0;e+=1}return!1},s=function(t,n){for(var r=0,e=n.length,u=[];e>r;)t(n[r])&&(u[u.length]=n[r]),r+=1;return u},a=function(t){return{"@@transducer/value":t,"@@transducer/reduced":!0}},f=function(t){var n=String(t).match(/^function (\w*)/);return null==n?"":n[1]},l=function(t,n){return Object.prototype.hasOwnProperty.call(n,t)},p=function(t){return t},h=function(){var t=Object.prototype.toString;return"[object Arguments]"===t.call(arguments)?function(n){return"[object Arguments]"===t.call(n)}:function(t){return l("callee",t)}}(),g=Array.isArray||function(t){return null!=t&&t.length>=0&&"[object Array]"===Object.prototype.toString.call(t)},d=function(t){return"[object Function]"===Object.prototype.toString.call(t)},y=Number.isInteger||function(t){return t<<0===t},m=function(t){return"[object Number]"===Object.prototype.toString.call(t)},v=function(t){return"[object Object]"===Object.prototype.toString.call(t)},b=function(t){return null!=t&&"object"==typeof t&&t["@@functional/placeholder"]===!0},w=function(t){return"[object RegExp]"===Object.prototype.toString.call(t)},x=function(t){return"[object String]"===Object.prototype.toString.call(t)},j=function(t){return"function"==typeof t["@@transducer/step"]},O=function(t,n){for(var r=0,e=n.length,u=Array(e);e>r;)u[r]=t(n[r]),r+=1;return u},S=function(t){if(null==t)throw new TypeError("Cannot convert undefined or null to object");for(var n=Object(t),r=1,e=arguments.length;e>r;){var u=arguments[r];if(null!=u)for(var i in u)l(i,u)&&(n[i]=u[i]);r+=1}return n},A=function(t){return[t]},_=function(t,n){return function(){return n.call(this,t.apply(this,arguments))}},E=function(t,n){return function(){var r=this;return t.apply(r,arguments).then(function(t){return n.call(r,t)})}},N=function(t){var n=t.replace(/\\/g,"\\\\").replace(/[\b]/g,"\\b").replace(/\f/g,"\\f").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t").replace(/\v/g,"\\v").replace(/\0/g,"\\0");return'"'+n.replace(/"/g,'\\"')+'"'},k=function(t){return t&&t["@@transducer/reduced"]?t:{"@@transducer/value":t,"@@transducer/reduced":!0}},I=function Tu(t,n,r){switch(arguments.length){case 1:return Tu(t,0,t.length);case 2:return Tu(t,n,t.length);default:for(var e=[],u=0,i=Math.max(0,Math.min(t.length,r)-n);i>u;)e[u]=t[n+u],u+=1;return e}},q=function(){var t=function(t){return(10>t?"0":"")+t};return"function"==typeof Date.prototype.toISOString?function(t){return t.toISOString()}:function(n){return n.getUTCFullYear()+"-"+t(n.getUTCMonth()+1)+"-"+t(n.getUTCDate())+"T"+t(n.getUTCHours())+":"+t(n.getUTCMinutes())+":"+t(n.getUTCSeconds())+"."+(n.getUTCMilliseconds()/1e3).toFixed(3).slice(2,5)+"Z"}}(),C={init:function(){return this.xf["@@transducer/init"]()},result:function(t){return this.xf["@@transducer/result"](t)}},P=function(){function t(t){this.f=t}return t.prototype["@@transducer/init"]=function(){throw new Error("init not implemented on XWrap")},t.prototype["@@transducer/result"]=function(t){return t},t.prototype["@@transducer/step"]=function(t,n){return this.f(t,n)},function(n){return new t(n)}}(),W=function(t,n){for(var r=0,e=n.length-(t-1),u=new Array(e>=0?e:0);e>r;)u[r]=I(n,r,r+t),r+=1;return u},B="function"==typeof Object.assign?Object.assign:S,M=function(t,n){return function(){var r=arguments.length;if(0===r)return n();var e=arguments[r-1];return g(e)||"function"!=typeof e[t]?n.apply(this,arguments):e[t].apply(e,I(arguments,0,r-1))}},R=function(t){return function n(r){return 0===arguments.length||b(r)?n:t.apply(this,arguments)}},T=function(t){return function n(r,e){switch(arguments.length){case 0:return n;case 1:return b(r)?n:R(function(n){return t(r,n)});default:return b(r)&&b(e)?n:b(r)?R(function(n){return t(n,e)}):b(e)?R(function(n){return t(r,n)}):t(r,e)}}},U=function(t){return function n(r,e,u){switch(arguments.length){case 0:return n;case 1:return b(r)?n:T(function(n,e){return t(r,n,e)});case 2:return b(r)&&b(e)?n:b(r)?T(function(n,r){return t(n,e,r)}):b(e)?T(function(n,e){return t(r,n,e)}):R(function(n){return t(r,e,n)});default:return b(r)&&b(e)&&b(u)?n:b(r)&&b(e)?T(function(n,r){return t(n,r,u)}):b(r)&&b(u)?T(function(n,r){return t(n,e,r)}):b(e)&&b(u)?T(function(n,e){return t(r,n,e)}):b(r)?R(function(n){return t(n,e,u)}):b(e)?R(function(n){return t(r,n,u)}):b(u)?R(function(n){return t(r,e,n)}):t(r,e,u)}}},F=function Uu(t,r,e){return function(){for(var u=[],i=0,o=t,c=0;c<r.length||i<arguments.length;){var s;c<r.length&&(!b(r[c])||i>=arguments.length)?s=r[c]:(s=arguments[i],i+=1),u[c]=s,b(s)||(o-=1),c+=1}return 0>=o?e.apply(this,u):n(o,Uu(t,u,e))}},L=function(t,n,r){return function(){var e=arguments.length;if(0===e)return r();var u=arguments[e-1];if(!g(u)){var i=I(arguments,0,e-1);if("function"==typeof u[t])return u[t].apply(u,i);if(j(u)){var o=n.apply(null,i);return o(u)}}return r.apply(this,arguments)}},D=function(t,n){for(var r=n.length-1;r>=0&&t(n[r]);)r-=1;return I(n,0,r+1)},z=function(){function t(t,n){this.xf=n,this.f=t,this.all=!0}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.all&&(t=this.xf["@@transducer/step"](t,!0)),this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.f(n)||(this.all=!1,t=k(this.xf["@@transducer/step"](t,!1))),t},T(function(n,r){return new t(n,r)})}(),V=function(){function t(t,n){this.xf=n,this.f=t,this.any=!1}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.any||(t=this.xf["@@transducer/step"](t,!1)),this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.f(n)&&(this.any=!0,t=k(this.xf["@@transducer/step"](t,!0))),t},T(function(n,r){return new t(n,r)})}(),K=function(){function t(t,n){this.xf=n,this.pos=0,this.full=!1,this.acc=new Array(t)}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.acc=null,this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.store(n),this.full?this.xf["@@transducer/step"](t,this.getCopy()):t},t.prototype.store=function(t){this.acc[this.pos]=t,this.pos+=1,this.pos===this.acc.length&&(this.pos=0,this.full=!0)},t.prototype.getCopy=function(){return o(I(this.acc,this.pos),I(this.acc,0,this.pos))},T(function(n,r){return new t(n,r)})}(),$=function(){function t(t,n){this.xf=n,this.n=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){return this.n>0?(this.n-=1,t):this.xf["@@transducer/step"](t,n)},T(function(n,r){return new t(n,r)})}(),H=function(){function t(t,n){this.xf=n,this.pos=0,this.full=!1,this.acc=new Array(t)}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.acc=null,this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.full&&(t=this.xf["@@transducer/step"](t,this.acc[this.pos])),this.store(n),t},t.prototype.store=function(t){this.acc[this.pos]=t,this.pos+=1,this.pos===this.acc.length&&(this.pos=0,this.full=!0)},T(function(n,r){return new t(n,r)})}(),X=function(){function t(t,n){this.xf=n,this.pred=t,this.lastValue=void 0,this.seenFirstValue=!1}return t.prototype["@@transducer/init"]=function(){return this.xf["@@transducer/init"]()},t.prototype["@@transducer/result"]=function(t){return this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){var r=!1;return this.seenFirstValue?this.pred(this.lastValue,n)&&(r=!0):this.seenFirstValue=!0,this.lastValue=n,r?t:this.xf["@@transducer/step"](t,n)},T(function(n,r){return new t(n,r)})}(),Y=function(){function t(t,n){this.xf=n,this.f=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){if(this.f){if(this.f(n))return t;this.f=null}return this.xf["@@transducer/step"](t,n)},T(function(n,r){return new t(n,r)})}(),Z=function(){function t(t,n){this.xf=n,this.f=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){return this.f(n)?this.xf["@@transducer/step"](t,n):t},T(function(n,r){return new t(n,r)})}(),G=function(){function t(t,n){this.xf=n,this.f=t,this.found=!1}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.found||(t=this.xf["@@transducer/step"](t,void 0)),this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.f(n)&&(this.found=!0,t=k(this.xf["@@transducer/step"](t,n))),t},T(function(n,r){return new t(n,r)})}(),J=function(){function t(t,n){this.xf=n,this.f=t,this.idx=-1,this.found=!1}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.found||(t=this.xf["@@transducer/step"](t,-1)),this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.idx+=1,this.f(n)&&(this.found=!0,t=k(this.xf["@@transducer/step"](t,this.idx))),t},T(function(n,r){return new t(n,r)})}(),Q=function(){function t(t,n){this.xf=n,this.f=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.xf["@@transducer/result"](this.xf["@@transducer/step"](t,this.last))},t.prototype["@@transducer/step"]=function(t,n){return this.f(n)&&(this.last=n),t},T(function(n,r){return new t(n,r)})}(),tt=function(){function t(t,n){this.xf=n,this.f=t,this.idx=-1,this.lastIdx=-1}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.xf["@@transducer/result"](this.xf["@@transducer/step"](t,this.lastIdx))},t.prototype["@@transducer/step"]=function(t,n){return this.idx+=1,this.f(n)&&(this.lastIdx=this.idx),t},T(function(n,r){return new t(n,r)})}(),nt=function(){function t(t,n){this.xf=n,this.f=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){return this.xf["@@transducer/step"](t,this.f(n))},T(function(n,r){return new t(n,r)})}(),rt=function(){function t(t,n){this.xf=n,this.n=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){return 0===this.n?k(t):(this.n-=1,this.xf["@@transducer/step"](t,n))},T(function(n,r){return new t(n,r)})}(),et=function(){function t(t,n){this.xf=n,this.f=t}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=C.result,t.prototype["@@transducer/step"]=function(t,n){return this.f(n)?this.xf["@@transducer/step"](t,n):k(t)},T(function(n,r){return new t(n,r)})}(),ut=T(function(t,n){return Number(t)+Number(n)}),it=U(function(t,n,r){if(n>=r.length||n<-r.length)return r;var e=0>n?r.length:0,u=e+n,i=o(r);return i[u]=t(r[u]),i}),ot=T(L("all",z,function(t,n){for(var r=0;r<n.length;){if(!t(n[r]))return!1;r+=1}return!0})),ct=R(function(t){return function(){return t}}),st=T(function(t,n){return t&&n}),at=T(L("any",V,function(t,n){for(var r=0;r<n.length;){if(t(n[r]))return!0;r+=1}return!1})),ft=T(L("aperture",K,W)),lt=T(function(t,n){return o(n,[t])}),pt=T(function(t,n){return t.apply(this,n)}),ht=U(function(t,n,r){var e={};for(var u in r)e[u]=r[u];return e[t]=n,e}),gt=U(function Fu(t,n,r){switch(t.length){case 0:return n;case 1:return ht(t[0],n,r);default:return ht(t[0],Fu(I(t,1),n,Object(r[t[0]])),r)}}),dt=T(function(t,r){return n(t.length,function(){return t.apply(r,arguments)})}),yt=U(function(t,n,r){if(t>n)throw new Error("min must not be greater than max in clamp(min, max, value)");return t>r?t:r>n?n:r}),mt=R(function(t){return function(n,r){return t(n,r)?-1:t(r,n)?1:0}}),vt=T(function(t,n){for(var r={},e=n.length,u=0;e>u;){var i=t(n[u]);r[i]=(l(i,r)?r[i]:0)+1,u+=1}return r}),bt=T(function(t,r){return 1===t?R(r):n(t,F(t,[],r))}),wt=ut(-1),xt=T(function(t,n){return null==n||n!==n?t:n}),jt=U(function(t,n,r){for(var e=[],u=0,i=n.length;i>u;)c(t,n[u],r)||c(t,n[u],e)||e.push(n[u]),u+=1;return e}),Ot=T(function(t,n){var r={};for(var e in n)e!==t&&(r[e]=n[e]);return r}),St=T(function Lu(t,n){switch(t.length){case 0:return n;case 1:return Ot(t[0],n);default:var r=t[0],e=I(t,1);return null==n[r]?n:ht(r,Lu(e,n[r]),n)}}),At=T(function(t,n){return t/n}),_t=T(L("dropWhile",Y,function(t,n){for(var r=0,e=n.length;e>r&&t(n[r]);)r+=1;return I(n,r)})),Et=R(function(t){return null!=t&&"function"==typeof t.empty?t.empty():null!=t&&null!=t.constructor&&"function"==typeof t.constructor.empty?t.constructor.empty():g(t)?[]:x(t)?"":v(t)?{}:h(t)?function(){return arguments}():void 0}),Nt=T(function Du(t,n){var r,e,u,i={};for(e in n)r=t[e],u=typeof r,i[e]="function"===u?r(n[e]):"object"===u?Du(t[e],n[e]):n[e];return i}),kt=T(L("find",G,function(t,n){for(var r=0,e=n.length;e>r;){if(t(n[r]))return n[r];r+=1}})),It=T(L("findIndex",J,function(t,n){for(var r=0,e=n.length;e>r;){if(t(n[r]))return r;r+=1}return-1})),qt=T(L("findLast",Q,function(t,n){for(var r=n.length-1;r>=0;){if(t(n[r]))return n[r];r-=1}})),Ct=T(L("findLastIndex",tt,function(t,n){for(var r=n.length-1;r>=0;){if(t(n[r]))return r;r-=1}return-1})),Pt=T(M("forEach",function(t,n){for(var r=n.length,e=0;r>e;)t(n[e]),e+=1;return n})),Wt=R(function(t){for(var n=0,r=t.length,e={};r>n;)g(t[n])&&t[n].length&&(e[t[n][0]]=t[n][1]),n+=1;return e}),Bt=T(function(t,n){return t>n}),Mt=T(function(t,n){return t>=n}),Rt=T(l),Tt=T(function(t,n){return t in n}),Ut=T(function(t,n){return t===n?0!==t||1/t===1/n:t!==t&&n!==n}),Ft=R(p),Lt=U(function(t,n,r){return bt(Math.max(t.length,n.length,r.length),function(){return t.apply(this,arguments)?n.apply(this,arguments):r.apply(this,arguments)})}),Dt=ut(1),zt=U(function(t,n,r){t=t<r.length&&t>=0?t:r.length;var e=I(r);return e.splice(t,0,n),e}),Vt=U(function(t,n,r){return t=t<r.length&&t>=0?t:r.length,o(o(I(r,0,t),n),I(r,t))}),Kt=T(M("intersperse",function(t,n){for(var r=[],e=0,u=n.length;u>e;)e===u-1?r.push(n[e]):r.push(n[e],t),e+=1;return r})),$t=T(function(t,n){return null!=n&&n.constructor===t||n instanceof t}),Ht=R(function(t){return g(t)?!0:t?"object"!=typeof t?!1:t instanceof String?!1:1===t.nodeType?!!t.length:0===t.length?!0:t.length>0?t.hasOwnProperty(0)&&t.hasOwnProperty(t.length-1):!1:!1}),Xt=R(function(t){return null==t}),Yt=function(){var t=!{toString:null}.propertyIsEnumerable("toString"),n=["constructor","valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"],r=function(){return arguments.propertyIsEnumerable("length")}(),e=function(t,n){for(var r=0;r<t.length;){if(t[r]===n)return!0;r+=1}return!1};return R("function"!=typeof Object.keys||r?function(u){if(Object(u)!==u)return[];var i,o,c=[],s=r&&h(u);for(i in u)!l(i,u)||s&&"length"===i||(c[c.length]=i);if(t)for(o=n.length-1;o>=0;)i=n[o],l(i,u)&&!e(c,i)&&(c[c.length]=i),o-=1;return c}:function(t){return Object(t)!==t?[]:Object.keys(t)})}(),Zt=R(function(t){var n,r=[];for(n in t)r[r.length]=n;return r}),Gt=R(function(t){return null!=t&&$t(Number,t.length)?t.length:NaN}),Jt=T(function(t,n){return n>t}),Qt=T(function(t,n){return n>=t}),tn=U(function(t,n,r){for(var e=0,u=r.length,i=[],o=[n];u>e;)o=t(o[0],r[e]),i[e]=o[1],e+=1;return[o[0],i]}),nn=U(function(t,n,r){for(var e=r.length-1,u=[],i=[n];e>=0;)i=t(i[0],r[e]),u[e]=i[1],e-=1;return[i[0],u]}),rn=T(function(t,n){return n.match(t)||[]}),en=T(function(t,n){return y(t)?!y(n)||1>n?NaN:(t%n+n)%n:NaN}),un=T(function(t,n){return n>t?n:t}),on=U(function(t,n,r){return t(r)>t(n)?r:n}),cn=T(function(t,n){return B({},t,n)}),sn=R(function(t){return B.apply(null,[{}].concat(t))}),an=U(function(t,n,r){var e,u={};for(e in n)l(e,n)&&(u[e]=l(e,r)?t(e,n[e],r[e]):n[e]);for(e in r)l(e,r)&&!l(e,u)&&(u[e]=r[e]);return u}),fn=T(function(t,n){return t>n?n:t}),ln=U(function(t,n,r){return t(r)<t(n)?r:n}),pn=T(function(t,n){return t%n}),hn=T(function(t,n){return t*n}),gn=T(function(t,n){switch(t){case 0:return function(){return n.call(this)};case 1:return function(t){return n.call(this,t)};case 2:return function(t,r){return n.call(this,t,r)};case 3:return function(t,r,e){return n.call(this,t,r,e)};case 4:return function(t,r,e,u){return n.call(this,t,r,e,u)};case 5:return function(t,r,e,u,i){return n.call(this,t,r,e,u,i)};case 6:return function(t,r,e,u,i,o){return n.call(this,t,r,e,u,i,o)};case 7:return function(t,r,e,u,i,o,c){return n.call(this,t,r,e,u,i,o,c)};case 8:return function(t,r,e,u,i,o,c,s){return n.call(this,t,r,e,u,i,o,c,s)};case 9:return function(t,r,e,u,i,o,c,s,a){return n.call(this,t,r,e,u,i,o,c,s,a)};case 10:return function(t,r,e,u,i,o,c,s,a,f){return n.call(this,t,r,e,u,i,o,c,s,a,f)};default:throw new Error("First argument to nAry must be a non-negative integer no greater than ten")}}),dn=R(function(t){return-t}),yn=T(i(L("any",V,at))),mn=R(function(t){return!t}),vn=T(function(t,n){var r=0>t?n.length+t:t;return x(n)?n.charAt(r):n[r]}),bn=R(function(t){return function(){return vn(t,arguments)}}),wn=T(function(t,n){var r={};return r[t]=n,r}),xn=R(A),jn=R(function(t){var r,e=!1;return n(t.length,function(){return e?r:(e=!0,r=t.apply(this,arguments))})}),On=T(function(t,n){return t||n}),Sn=function(){var t=function(n){return{value:n,map:function(r){return t(r(n))}}};return U(function(n,r,e){return n(function(n){return t(r(n))})(e).value})}(),An=T(function(t,n){return[t,n]}),_n=T(function(t,n){for(var r=n,e=0;e<t.length;){if(null==r)return;r=r[t[e]],e+=1}return r}),En=U(function(t,n,r){return xt(t,_n(n,r))}),Nn=U(function(t,n,r){return n.length>0&&t(_n(n,r))}),kn=T(function(t,n){for(var r={},e=0;e<t.length;)t[e]in n&&(r[t[e]]=n[t[e]]),e+=1;return r}),In=T(function(t,n){for(var r={},e=0,u=t.length;u>e;){var i=t[e];r[i]=n[i],e+=1}return r}),qn=T(function(t,n){var r={};for(var e in n)t(n[e],e,n)&&(r[e]=n[e]);return r}),Cn=T(function(t,n){return o([t],n)}),Pn=T(function(t,n){return n[t]}),Wn=U(function(t,n,r){return null!=r&&l(n,r)?r[n]:t}),Bn=U(function(t,n,r){return t(r[n])}),Mn=T(function(t,n){for(var r=t.length,e=[],u=0;r>u;)e[u]=n[t[u]],u+=1;return e}),Rn=T(function(t,n){if(!m(t)||!m(n))throw new TypeError("Both arguments to range must be numbers");for(var r=[],e=t;n>e;)r.push(e),e+=1;return r}),Tn=U(function(t,n,r){for(var e=r.length-1;e>=0;)n=t(n,r[e]),e-=1;return n}),Un=R(k),Fn=U(function(t,n,r){return o(I(r,0,Math.min(t,r.length)),I(r,Math.min(r.length,t+n)))}),Ln=U(function(t,n,r){return r.replace(t,n)}),Dn=R(function(t){return x(t)?t.split("").reverse().join(""):I(t).reverse()}),zn=U(function(t,n,r){for(var e=0,u=r.length,i=[n];u>e;)n=t(n,r[e]),i[e+1]=n,e+=1;return i}),Vn=U(function(t,n,r){return Sn(t,ct(n),r)}),Kn=U(M("slice",function(t,n,r){return Array.prototype.slice.call(r,t,n)})),$n=T(function(t,n){return I(n).sort(t)}),Hn=T(function(t,n){return I(n).sort(function(n,r){var e=t(n),u=t(r);return u>e?-1:e>u?1:0})}),Xn=T(function(t,n){return[Kn(0,t,n),Kn(t,Gt(n),n)]}),Yn=T(function(t,n){if(0>=t)throw new Error("First argument to splitEvery must be a positive integer");for(var r=[],e=0;e<n.length;)r.push(Kn(e,e+=t,n));return r}),Zn=T(function(t,n){for(var r=0,e=n.length,u=[];e>r&&!t(n[r]);)u.push(n[r]),r+=1;return[u,I(n,r)]}),Gn=T(function(t,n){return Number(t)-Number(n)}),Jn=M("tail",Kn(1,1/0)),Qn=T(L("take",rt,function(t,n){return Kn(0,0>t?1/0:t,n)})),tr=T(function(t,n){for(var r=n.length-1;r>=0&&t(n[r]);)r-=1;return I(n,r+1,1/0)}),nr=T(L("takeWhile",et,function(t,n){for(var r=0,e=n.length;e>r&&t(n[r]);)r+=1;return I(n,0,r)})),rr=T(function(t,n){return t(n),n}),er=T(function(t,n){var r,e=Number(n),u=0;if(0>e||isNaN(e))throw new RangeError("n must be a non-negative number");for(r=new Array(e);e>u;)r[u]=t(u),u+=1;return r}),ur=R(function(t){var n=[];for(var r in t)l(r,t)&&(n[n.length]=[r,t[r]]);return n}),ir=R(function(t){var n=[];for(var r in t)n[n.length]=[r,t[r]];return n}),or=R(function(t){for(var n=0,r=[];n<t.length;){for(var e=t[n],u=0;u<e.length;)"undefined"==typeof r[u]&&(r[u]=[]),r[u].push(e[u]),u+=1;n+=1}return r}),cr=function(){var t="	\n\f\r   ᠎             　\u2028\u2029\ufeff",n="​",r="function"==typeof String.prototype.trim;return R(r&&!t.trim()&&n.trim()?function(t){return t.trim()}:function(n){var r=new RegExp("^["+t+"]["+t+"]*"),e=new RegExp("["+t+"]["+t+"]*$");return n.replace(r,"").replace(e,"")})}(),sr=T(function(t,r){return n(t.length,function(){try{return t.apply(this,arguments)}catch(n){return r.apply(this,o([n],arguments))}})}),ar=R(function(t){return null===t?"Null":void 0===t?"Undefined":Object.prototype.toString.call(t).slice(8,-1)}),fr=R(function(t){return function(){return t(I(arguments))}}),lr=R(function(t){return gn(1,t)}),pr=T(function(t,n){return bt(t,function(){for(var r,e=1,u=n,i=0;t>=e&&"function"==typeof u;)r=e===t?arguments.length:i+u.length,u=u.apply(this,I(arguments,i,r)),e+=1,i=r;return u})}),hr=T(function(t,n){for(var r=t(n),e=[];r&&r.length;)e[e.length]=r[0],r=t(r[1]);return e}),gr=T(function(t,n){for(var r,e=0,u=n.length,i=[];u>e;)r=n[e],c(t,r,i)||(i[i.length]=r),e+=1;return i}),dr=U(function(t,n,r){return t(r)?r:n(r)}),yr=U(function(t,n,r){for(var e=r;!t(e);)e=n(e);return e}),mr=U(function(t,n,r){return it(ct(n),t,r)}),vr=T(function(t,n){return bt(n.length,function(){for(var r=[],e=0;e<n.length;)r.push(n[e].call(this,arguments[e])),e+=1;return t.apply(this,r.concat(I(arguments,n.length)))})}),br=R(function(t){for(var n=Yt(t),r=n.length,e=[],u=0;r>u;)e[u]=t[n[u]],u+=1;return e}),wr=R(function(t){var n,r=[];for(n in t)r[r.length]=t[n];return r}),xr=function(){var t=function(t){return{value:t,map:function(){return this}}};return T(function(n,r){return n(t)(r).value})}(),jr=U(function(t,n,r){return t(r)?n(r):r}),Or=T(function(t,n){for(var r in t)if(l(r,t)&&!t[r](n[r]))return!1;return!0}),Sr=T(function(t,n){return bt(t.length,function(){return n.apply(this,o([t],arguments))})}),Ar=T(function(t,n){for(var r,e=0,u=t.length,i=n.length,o=[];u>e;){for(r=0;i>r;)o[o.length]=[t[e],n[r]],r+=1;e+=1}return o}),_r=T(function(t,n){for(var r=[],e=0,u=Math.min(t.length,n.length);u>e;)r[e]=[t[e],n[e]],e+=1;return r}),Er=T(function(t,n){for(var r=0,e=Math.min(t.length,n.length),u={};e>r;)u[t[r]]=n[r],r+=1;return u}),Nr=U(function(t,n,r){for(var e=[],u=0,i=Math.min(n.length,r.length);i>u;)e[u]=t(n[u],r[u]),u+=1;return e}),kr=ct(!1),Ir=ct(!0),qr=function zu(t,n,r,e){var i=function(u){for(var i=n.length,o=0;i>o;){if(t===n[o])return r[o];o+=1}n[o+1]=t,r[o+1]=u;for(var c in t)u[c]=e?zu(t[c],n,r,!0):t[c];return u};switch(ar(t)){case"Object":return i({});case"Array":return i([]);case"Date":return new Date(t.valueOf());case"RegExp":return u(t);default:return t}},Cr=function(t){return T(function(r,e){return n(Math.max(0,r.length-e.length),function(){return r.apply(this,t(e,arguments))})})},Pr=function(t,n){return Qn(t<n.length?n.length-t:0,n)},Wr=function Vu(t,n,e,u){if(Ut(t,n))return!0;if(ar(t)!==ar(n))return!1;if(null==t||null==n)return!1;if("function"==typeof t.equals||"function"==typeof n.equals)return"function"==typeof t.equals&&t.equals(n)&&"function"==typeof n.equals&&n.equals(t);switch(ar(t)){case"Arguments":case"Array":case"Object":if("function"==typeof t.constructor&&"Promise"===f(t.constructor))return t===n;break;case"Boolean":case"Number":case"String":if(typeof t!=typeof n||!Ut(t.valueOf(),n.valueOf()))return!1;break;case"Date":if(!Ut(t.valueOf(),n.valueOf()))return!1;break;case"Error":return t.name===n.name&&t.message===n.message;case"RegExp":if(t.source!==n.source||t.global!==n.global||t.ignoreCase!==n.ignoreCase||t.multiline!==n.multiline||t.sticky!==n.sticky||t.unicode!==n.unicode)return!1;break;case"Map":case"Set":if(!Vu(r(t.entries()),r(n.entries()),e,u))return!1;break;case"Int8Array":case"Uint8Array":case"Uint8ClampedArray":case"Int16Array":case"Uint16Array":case"Int32Array":case"Uint32Array":case"Float32Array":case"Float64Array":break;case"ArrayBuffer":break;default:return!1}var i=Yt(t);if(i.length!==Yt(n).length)return!1;for(var o=e.length-1;o>=0;){if(e[o]===t)return u[o]===n;o-=1}for(e.push(t),u.push(n),o=i.length-1;o>=0;){var c=i[o];if(!l(c,n)||!Vu(n[c],t[c],e,u))return!1;o-=1}return e.pop(),u.pop(),!0},Br=function(t){return function n(r){for(var e,u,i,o=[],c=0,s=r.length;s>c;){if(Ht(r[c]))for(e=t?n(r[c]):r[c],i=0,u=e.length;u>i;)o[o.length]=e[i],i+=1;else o[o.length]=r[c];c+=1}return o}},Mr=function(){function t(t,n,r){for(var e=0,u=r.length;u>e;){if(n=t["@@transducer/step"](n,r[e]),n&&n["@@transducer/reduced"]){n=n["@@transducer/value"];break}e+=1}return t["@@transducer/result"](n)}function n(t,n,r){for(var e=r.next();!e.done;){if(n=t["@@transducer/step"](n,e.value),n&&n["@@transducer/reduced"]){n=n["@@transducer/value"];break}e=r.next()}return t["@@transducer/result"](n)}function r(t,n,r){return t["@@transducer/result"](r.reduce(dt(t["@@transducer/step"],t),n))}var e="undefined"!=typeof Symbol?Symbol.iterator:"@@iterator";return function(u,i,o){if("function"==typeof u&&(u=P(u)),Ht(o))return t(u,i,o);if("function"==typeof o.reduce)return r(u,i,o);if(null!=o[e])return n(u,i,o[e]());if("function"==typeof o.next)return n(u,i,o);throw new TypeError("reduce: list must be array or iterable")}}(),Rr=function(){var t={"@@transducer/init":Array,"@@transducer/step":function(t,n){return t.push(n),t},"@@transducer/result":p},n={"@@transducer/init":String,"@@transducer/step":function(t,n){return t+n},"@@transducer/result":p},r={"@@transducer/init":Object,"@@transducer/step":function(t,n){return B(t,Ht(n)?wn(n[0],n[1]):n)},"@@transducer/result":p};return function(e){if(j(e))return e;if(Ht(e))return t;if("string"==typeof e)return n;if("object"==typeof e)return r;throw new Error("Cannot create transformer for "+e)}}(),Tr=function(){function t(t,n){this.f=t,this.retained=[],this.xf=n}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){return this.retained=null,this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){return this.f(n)?this.retain(t,n):this.flush(t,n)},t.prototype.flush=function(t,n){return t=Mr(this.xf["@@transducer/step"],t,this.retained),this.retained=[],this.xf["@@transducer/step"](t,n)},t.prototype.retain=function(t,n){return this.retained.push(n),t},T(function(n,r){return new t(n,r)})}(),Ur=function(){function t(t,n){this.xf=n,this.f=t,this.inputs={}}return t.prototype["@@transducer/init"]=C.init,t.prototype["@@transducer/result"]=function(t){var n;for(n in this.inputs)if(l(n,this.inputs)&&(t=this.xf["@@transducer/step"](t,this.inputs[n]),t["@@transducer/reduced"])){t=t["@@transducer/value"];break}return this.inputs=null,this.xf["@@transducer/result"](t)},t.prototype["@@transducer/step"]=function(t,n){var r=this.f(n);return this.inputs[r]=this.inputs[r]||[r,[]],this.inputs[r][1]=lt(n,this.inputs[r][1]),t},T(function(n,r){return new t(n,r)})}(),Fr=R(function(t){return bt(t.length,function(){var n=0,r=arguments[0],e=arguments[arguments.length-1],u=I(arguments);return u[0]=function(){var t=r.apply(this,o(arguments,[n,e]));return n+=1,t},t.apply(this,u)})}),Lr=R(function(t){return gn(2,t)}),Dr=R(function(t){return null!=t&&"function"==typeof t.clone?t.clone():qr(t,[],[],!0)}),zr=R(function(t){return bt(t.length,t)}),Vr=T(L("drop",$,function(t,n){return Kn(Math.max(0,t),1/0,n)})),Kr=T(L("dropLast",H,Pr)),$r=T(L("dropLastWhile",Tr,D)),Hr=T(function(t,n){return Wr(t,n,[],[])}),Xr=T(L("filter",Z,function(t,n){return v(n)?Mr(function(r,e){return t(n[e])&&(r[e]=n[e]),r},{},Yt(n)):s(t,n)})),Yr=R(Br(!0)),Zr=R(function(t){return zr(function(n,r){var e=I(arguments);return e[0]=r,e[1]=n,t.apply(this,e)})}),Gr=T(L("groupBy",Ur,function(t,n){return Mr(function(n,r){var e=t(r);return n[e]=lt(r,n[e]||(n[e]=[])),n},{},n)})),Jr=vn(0),Qr=T(function(t,n){return Mr(function(n,r){var e=t(r);return n[e]=r,n},{},n)}),te=Kn(0,-1),ne=U(function(t,n,r){var e,u;n.length>r.length?(e=n,u=r):(e=r,u=n);for(var i=[],o=0;o<u.length;)c(t,u[o],e)&&(i[i.length]=u[o]),o+=1;return gr(t,i)}),re=U(function(t,n,r){return j(t)?Mr(n(t),t["@@transducer/init"](),r):Mr(n(Rr(t)),qr(t,[],[],!1),r)}),ee=R(function(t){for(var n=Yt(t),r=n.length,e=0,u={};r>e;){var i=n[e],o=t[i],c=l(o,u)?u[o]:u[o]=[];c[c.length]=i,e+=1}return u}),ue=R(function(t){for(var n=Yt(t),r=n.length,e=0,u={};r>e;){var i=n[e];u[t[i]]=i,e+=1}return u}),ie=R(function(t){return null!=t&&Hr(t,Et(t))}),oe=vn(-1),ce=T(function(t,n){if("function"!=typeof n.lastIndexOf||g(n)){for(var r=n.length-1;r>=0;){if(Hr(n[r],t))return r;r-=1}return-1}return n.lastIndexOf(t)}),se=T(L("map",nt,function(t,n){switch(Object.prototype.toString.call(n)){case"[object Function]":return bt(n.length,function(){return t.call(this,n.apply(this,arguments))});case"[object Object]":return Mr(function(r,e){return r[e]=t(n[e]),r},{},Yt(n));default:return O(t,n)}})),ae=T(function(t,n){return Mr(function(r,e){return r[e]=t(n[e],e,n),r},{},Yt(n))}),fe=U(function(t,n,r){return an(function(n,r,e){return t(r,e)},n,r)}),le=Cr(o),pe=Cr(Zr(o)),he=U(function(t,n,r){return Hr(_n(t,r),n)}),ge=T(function(t,n){return se(Pn(t),n)}),de=vr(O,[In,Ft]),ye=U(function(t,n,r){return Bn(Hr(n),t,r)}),me=U(function(t,n,r){return Bn($t(t),n,r)}),ve=U(Mr),be=F(4,[],function(t,n,r,e){return Mr(function(e,u){var i=t(u);return e[i]=n(l(i,e)?e[i]:r,u),e},{},e)}),we=T(function(t,n){return Xr(i(t),n)}),xe=T(function(t,n){return er(ct(t),n)}),je=ve(ut,0),Oe=T(function(t,n){return Vr(t>=0?n.length-t:0,n)}),Se=bt(4,function(t,n,r,e){return Mr(t("function"==typeof n?P(n):n),r,e)}),Ae=U(function(t,n,r){return gr(t,o(n,r))}),_e=T(function(t,n){return Or(se(Hr,t),n)}),Ee=function(){var t=function(t){return{"@@transducer/init":C.init,"@@transducer/result":function(n){return t["@@transducer/result"](n)},"@@transducer/step":function(n,r){var e=t["@@transducer/step"](n,r);return e["@@transducer/reduced"]?a(e):e}}};return function(n){var r=t(n);return{"@@transducer/init":C.init,"@@transducer/result":function(t){return r["@@transducer/result"](t)},"@@transducer/step":function(t,n){return Ht(n)?Mr(r,t,n):Mr(r,t,[n])}}}}(),Ne=function(t,n,r){var e,u;if("function"==typeof t.indexOf)switch(typeof n){case"number":if(0===n){for(e=1/n;r<t.length;){if(u=t[r],0===u&&1/u===e)return r;r+=1}return-1}if(n!==n){for(;r<t.length;){if(u=t[r],"number"==typeof u&&u!==u)return r;r+=1}return-1}return t.indexOf(n,r);case"string":case"boolean":case"function":case"undefined":return t.indexOf(n,r);case"object":if(null===n)return t.indexOf(n,r)}for(;r<t.length;){if(Hr(t[r],n))return r;r+=1}return-1},ke=T(function(t,n){return se(t,Ee(n))}),Ie=R(function(t){return bt(ve(un,0,ge("length",t)),function(){for(var n=0,r=t.length;r>n;){if(!t[n].apply(this,arguments))return!1;n+=1}return!0})}),qe=R(function(t){for(var n=t.length,r=0;n>r;){
if(Ne(t,t[r],r+1)>=0)return!1;r+=1}return!0}),Ce=R(function(t){return bt(ve(un,0,ge("length",t)),function(){for(var n=0,r=t.length;r>n;){if(t[n].apply(this,arguments))return!0;n+=1}return!1})}),Pe=T(function(t,n){return"function"==typeof t.ap?t.ap(n):"function"==typeof t?bt(Math.max(t.length,n.length),function(){return t.apply(this,arguments)(n.apply(this,arguments))}):Mr(function(t,r){return o(t,se(r,n))},[],t)}),We=R(function Ku(t){return t=se(function(t){return"function"==typeof t?t:Ku(t)},t),bt(ve(un,0,ge("length",br(t))),function(){var n=arguments;return se(function(t){return pt(t,n)},t)})}),Be=zr(function(t){return t.apply(this,I(arguments,1))}),Me=T(L("chain",ke,function(t,n){return"function"==typeof n?function(){return n.call(this,t.apply(this,arguments)).apply(this,arguments)}:Br(!1)(se(t,n))})),Re=R(function(t){var r=ve(un,0,se(function(t){return t[0].length},t));return n(r,function(){for(var n=0;n<t.length;){if(t[n][0].apply(this,arguments))return t[n][1].apply(this,arguments);n+=1}})}),Te=T(function(t,n){if(t>10)throw new Error("Constructor with greater than ten arguments");return 0===t?function(){return new n}:zr(gn(t,function(t,r,e,u,i,o,c,s,a,f){switch(arguments.length){case 1:return new n(t);case 2:return new n(t,r);case 3:return new n(t,r,e);case 4:return new n(t,r,e,u);case 5:return new n(t,r,e,u,i);case 6:return new n(t,r,e,u,i,o);case 7:return new n(t,r,e,u,i,o,c);case 8:return new n(t,r,e,u,i,o,c,s);case 9:return new n(t,r,e,u,i,o,c,s,a);case 10:return new n(t,r,e,u,i,o,c,s,a,f)}}))}),Ue=T(function(t,n){return bt(ve(un,0,ge("length",n)),function(){var r=arguments,e=this;return t.apply(e,O(function(t){return t.apply(e,r)},n))})}),Fe=T(L("dropRepeatsWith",X,function(t,n){var r=[],e=1,u=n.length;if(0!==u)for(r[0]=n[0];u>e;)t(oe(r),n[e])||(r[r.length]=n[e]),e+=1;return r})),Le=U(function(t,n,r){return Hr(t(n),t(r))}),De=U(function(t,n,r){return Hr(n[t],r[t])}),ze=T(function(t,n){return"function"!=typeof n.indexOf||g(n)?Ne(n,t,0):n.indexOf(t)}),Ve=R(function(t){return Ue(e,t)}),Ke=T(function(t,n){return function(r){return function(e){return se(function(t){return n(t,e)},r(t(e)))}}}),$e=R(function(t){return Ke(vn(t),mr(t))}),He=R(function(t){return Ke(_n(t),gt(t))}),Xe=R(function(t){return Ke(Pn(t),ht(t))}),Ye=T(function(t,n){var r=bt(t,n);return bt(t,function(){return Mr(Pe,se(r,arguments[0]),I(arguments,1))})}),Ze=R(function(t){return je(t)/t.length}),Ge=R(function(t){var n=t.length;if(0===n)return NaN;var r=2-n%2,e=(n-r)/2;return Ze(I(t).sort(function(t,n){return n>t?-1:t>n?1:0}).slice(e,e+r))}),Je=Ve([Xr,we]),Qe=function(){if(0===arguments.length)throw new Error("pipe requires at least one argument");return n(arguments[0].length,ve(_,arguments[0],Jn(arguments)))},tu=function(){if(0===arguments.length)throw new Error("pipeP requires at least one argument");return n(arguments[0].length,ve(E,arguments[0],Jn(arguments)))},nu=ve(hn,1),ru=T(function(t,n){return"function"==typeof n.sequence?n.sequence(t):Tn(function(t,n){return Pe(se(Cn,n),t)},t([]),n)}),eu=U(function(t,n,r){return ru(t,se(n,r))}),uu=Me(p),iu=function(t,n){return Ne(n,t,0)>=0},ou=function $u(t,n){var r=function(r){var e=n.concat([t]);return iu(r,e)?"<Circular>":$u(r,e)},e=function(t,n){return O(function(n){return N(n)+": "+r(t[n])},n.slice().sort())};switch(Object.prototype.toString.call(t)){case"[object Arguments]":return"(function() { return arguments; }("+O(r,t).join(", ")+"))";case"[object Array]":return"["+O(r,t).concat(e(t,we(function(t){return/^\d+$/.test(t)},Yt(t)))).join(", ")+"]";case"[object Boolean]":return"object"==typeof t?"new Boolean("+r(t.valueOf())+")":t.toString();case"[object Date]":return"new Date("+(isNaN(t.valueOf())?r(NaN):N(q(t)))+")";case"[object Null]":return"null";case"[object Number]":return"object"==typeof t?"new Number("+r(t.valueOf())+")":1/t===-(1/0)?"-0":t.toString(10);case"[object String]":return"object"==typeof t?"new String("+r(t.valueOf())+")":N(t);case"[object Undefined]":return"undefined";default:if("function"==typeof t.toString){var u=t.toString();if("[object Object]"!==u)return u}return"{"+e(t,Yt(t)).join(", ")+"}"}},cu=function(){if(0===arguments.length)throw new Error("compose requires at least one argument");return Qe.apply(this,Dn(arguments))},su=function(){return cu.apply(this,Cn(Ft,se(Me,arguments)))},au=function(){if(0===arguments.length)throw new Error("composeP requires at least one argument");return tu.apply(this,Dn(arguments))},fu=R(function(t){return Te(t.length,t)}),lu=T(iu),pu=T(function(t,n){for(var r=[],e=0,u=t.length;u>e;)iu(t[e],n)||iu(t[e],r)||(r[r.length]=t[e]),e+=1;return r}),hu=R(L("dropRepeats",X(Hr),Fe(Hr))),gu=R(function(t){return Ye(t.length,t)}),du=T(function(t,n){var r={};for(var e in n)iu(e,t)||(r[e]=n[e]);return r}),yu=function(){return su.apply(this,Dn(arguments))},mu=R(function(t){return ou(t,[])}),vu=T(function(t,n){return we(Zr(iu)(t),n)}),bu=function(){function t(){this._nativeSet="function"==typeof Set?new Set:null,this._items={}}function n(t,n,r){var e,u,i=typeof t;switch(i){case"string":case"number":return 0!==t||r._items["-0"]||1/t!==-(1/0)?null!==r._nativeSet?n?(e=r._nativeSet.size,r._nativeSet.add(t),u=r._nativeSet.size,u>e):r._nativeSet.has(t):i in r._items?t in r._items[i]?!n:(n&&(r._items[i][t]=!0),n):(n&&(r._items[i]={},r._items[i][t]=!0),n):(n&&(r._items["-0"]=!0),n);case"boolean":if(i in r._items){var o=t?1:0;return r._items[i][o]?!n:(n&&(r._items[i][o]=!0),n)}return n&&(r._items[i]=t?[!1,!0]:[!0,!1]),n;case"function":return null!==r._nativeSet?n?(e=r._nativeSet.size,r._nativeSet.add(t),u=r._nativeSet.size,u>e):r._nativeSet.has(t):i in r._items?iu(t,r._items[i])?!n:(n&&r._items[i].push(t),n):(n&&(r._items[i]=[t]),n);case"undefined":return r._items[i]?!n:(n&&(r._items[i]=!0),n);case"object":if(null===t)return r._items["null"]?!n:(n&&(r._items["null"]=!0),n);default:return i=Object.prototype.toString.call(t),i in r._items?iu(t,r._items[i])?!n:(n&&r._items[i].push(t),n):(n&&(r._items[i]=[t]),n)}}return t.prototype.add=function(t){return n(t,!0,this)},t.prototype.has=function(t){return n(t,!1,this)},t}(),wu=T(function(t,n){return d(t)?function(){return t.apply(this,arguments)&&n.apply(this,arguments)}:gu(st)(t,n)}),xu=gu(mn),ju=T(function(t,n){return d(t)?function(){return t.apply(this,arguments)||n.apply(this,arguments)}:gu(On)(t,n)}),Ou=T(function(t,n){return bt(t+1,function(){var r=arguments[t];if(null!=r&&$t(Function,r[n]))return r[n].apply(r,I(arguments,0,t));throw new TypeError(mu(r)+' does not have a method named "'+n+'"')})}),Su=Ou(1,"join"),Au=R(function(t){var r={};return n(t.length,function(){var n=mu(arguments);return l(n,r)||(r[n]=t.apply(this,arguments)),r[n]})}),_u=Ou(1,"split"),Eu=T(function(t,n){if(!w(t))throw new TypeError("‘test’ requires a value of type RegExp as its first argument; received "+mu(t));return u(t).test(n)}),Nu=Ou(0,"toLowerCase"),ku=Ou(0,"toUpperCase"),Iu=T(function(t,n){for(var r,e,u=new bu,i=[],o=0;o<n.length;)e=n[o],r=t(e),u.add(r)&&i.push(e),o+=1;return i}),qu=Zr(Ou(1,"concat")),Cu=T(function(t,n){return qu(pu(t,n),pu(n,t))}),Pu=U(function(t,n,r){return qu(jt(t,n,r),jt(t,r,n))}),Wu=Iu(Ft),Bu=T(function(t,n){var r,e;return t.length>n.length?(r=t,e=n):(r=n,e=t),Wu(s(Zr(iu)(r),e))}),Mu=T(cu(Wu,o)),Ru={F:kr,T:Ir,__:t,add:ut,addIndex:Fr,adjust:it,all:ot,allPass:Ie,allUniq:qe,always:ct,and:st,any:at,anyPass:Ce,ap:Pe,aperture:ft,append:lt,apply:pt,applySpec:We,assoc:ht,assocPath:gt,binary:Lr,bind:dt,both:wu,call:Be,chain:Me,clamp:yt,clone:Dr,comparator:mt,complement:xu,compose:cu,composeK:su,composeP:au,concat:qu,cond:Re,construct:fu,constructN:Te,contains:lu,converge:Ue,countBy:vt,curry:zr,curryN:bt,dec:wt,defaultTo:xt,difference:pu,differenceWith:jt,dissoc:Ot,dissocPath:St,divide:At,drop:Vr,dropLast:Kr,dropLastWhile:$r,dropRepeats:hu,dropRepeatsWith:Fe,dropWhile:_t,either:ju,empty:Et,eqBy:Le,eqProps:De,equals:Hr,evolve:Nt,filter:Xr,find:kt,findIndex:It,findLast:qt,findLastIndex:Ct,flatten:Yr,flip:Zr,forEach:Pt,fromPairs:Wt,groupBy:Gr,gt:Bt,gte:Mt,has:Rt,hasIn:Tt,head:Jr,identical:Ut,identity:Ft,ifElse:Lt,inc:Dt,indexBy:Qr,indexOf:ze,init:te,insert:zt,insertAll:Vt,intersection:Bu,intersectionWith:ne,intersperse:Kt,into:re,invert:ee,invertObj:ue,invoker:Ou,is:$t,isArrayLike:Ht,isEmpty:ie,isNil:Xt,join:Su,juxt:Ve,keys:Yt,keysIn:Zt,last:oe,lastIndexOf:ce,length:Gt,lens:Ke,lensIndex:$e,lensPath:He,lensProp:Xe,lift:gu,liftN:Ye,lt:Jt,lte:Qt,map:se,mapAccum:tn,mapAccumRight:nn,mapObjIndexed:ae,match:rn,mathMod:en,max:un,maxBy:on,mean:Ze,median:Ge,memoize:Au,merge:cn,mergeAll:sn,mergeWith:fe,mergeWithKey:an,min:fn,minBy:ln,modulo:pn,multiply:hn,nAry:gn,negate:dn,none:yn,not:mn,nth:vn,nthArg:bn,objOf:wn,of:xn,omit:du,once:jn,or:On,over:Sn,pair:An,partial:le,partialRight:pe,partition:Je,path:_n,pathEq:he,pathOr:En,pathSatisfies:Nn,pick:kn,pickAll:In,pickBy:qn,pipe:Qe,pipeK:yu,pipeP:tu,pluck:ge,prepend:Cn,product:nu,project:de,prop:Pn,propEq:ye,propIs:me,propOr:Wn,propSatisfies:Bn,props:Mn,range:Rn,reduce:ve,reduceBy:be,reduceRight:Tn,reduced:Un,reject:we,remove:Fn,repeat:xe,replace:Ln,reverse:Dn,scan:zn,sequence:ru,set:Vn,slice:Kn,sort:$n,sortBy:Hn,split:_u,splitAt:Xn,splitEvery:Yn,splitWhen:Zn,subtract:Gn,sum:je,symmetricDifference:Cu,symmetricDifferenceWith:Pu,tail:Jn,take:Qn,takeLast:Oe,takeLastWhile:tr,takeWhile:nr,tap:rr,test:Eu,times:er,toLower:Nu,toPairs:ur,toPairsIn:ir,toString:mu,toUpper:ku,transduce:Se,transpose:or,traverse:eu,trim:cr,tryCatch:sr,type:ar,unapply:fr,unary:lr,uncurryN:pr,unfold:hr,union:Mu,unionWith:Ae,uniq:Wu,uniqBy:Iu,uniqWith:gr,unless:dr,unnest:uu,until:yr,update:mr,useWith:vr,values:br,valuesIn:wr,view:xr,when:jr,where:Or,whereEq:_e,without:vu,wrap:Sr,xprod:Ar,zip:_r,zipObj:Er,zipWith:Nr};"object"==typeof exports?module.exports=Ru:"function"==typeof define&&define.amd?define('ramda',[],function(){return Ru}):this.R=Ru}).call(this);

define('tetris/store/actions',['ramda'], function(R){
    'use strict';

    // convert underscored uppercase string into the cameleCased
    let dashToCamel = R.compose(
            (a) => a[0].toLowerCase() + a.substr(1),
            R.join(''),
            R.map((a) => a[0] + a.substr(1).toLowerCase()),
            R.split('_')
        );

    const FIELDS = ['MOVE_RIGHT',
                    'MOVE_LEFT',
                    'MOVE_DOWN',
                    'DROP_DOWN',
                    'ROTATE_LEFT',
                    'MAGIC',
                    'GAME_START',
                    'GAME_RESTART',
                    'GAME_STOP',
                    'PUSH_BACK',
                    'SWITCH_PAGE'];

    var constants = R.reduce(
        (a, b) => R.merge(a, {[b]: b}),
        {}, FIELDS);

    // It generates an action creator
    let action = (type) => (value) => ({type, value});

    return R.reduce(
        (a, b) => R.merge(a, {[dashToCamel(b)]: action(b)})
    )(constants, FIELDS);
});

define('tetris/store/tetris',['ramda', '../constants'],
    function(R, constants){
        'use strict';

        const EMPTY_FIELD = R.repeat(R.repeat(0, constants.FIELD_WIDTH), constants.FIELD_HEIGHT);

        const SHAPES = [
            [[ 1, 1 ],
             [ 1, 1 ]],

            [[ 2, 2, 2 ],
             [ 0, 0, 2]],

            [[ 3, 3, 3 ],
             [ 3, 0, 0]],

            [[ 4, 4, 0 ],
             [ 0, 4, 4]],

            [[ 0, 5, 5 ],
             [ 5, 5, 0]],

            [[ 0, 5, 0 ],
             [ 5, 5, 5]],

            [[ 6, 6, 6 ]],
        ];

        let pick = (list) => R.nth(Math.floor(Math.random() * list.length), list);

        // TODO make it rotate around the center
        let rotateDataLeft = function(data){
            let out = R.map(() => [], R.range(0, data[0].length));
            for(let y = 0, l = data.length; y < l; ++y){
                for(let x = 0, m = data[0].length; x < m; ++x){
                    out[out.length - 1 - x].push(data[y][x]);
                }
            }
            return out;
        };
        // generate a random piece and rotate it random times
        let makePiece = (x, y, data) => {
            let piece = {
                x: 0,
                y: 0,
                data: data || pick(SHAPES),
            };
            R.forEach(
                () => piece.data = rotateDataLeft(piece.data)
            )(R.range(1, Math.floor(Math.random() * 4)));
            piece.x = (x === undefined) ? (Math.floor(Math.random()
                                  * (constants.FIELD_WIDTH - piece.data[0].length + 1)))
                                : x;
            piece.y = (y === undefined) ? (constants.FIELD_HEIGHT - piece.data.length + 0)
                                : y;
            return piece;
        };

        // shift game field down eliminating filled rows
        let shiftField = (gamefield) => {
            let ff = R.filter(R.any(a => a === 0 ))(gamefield);
            let nf = R.compose(
                    R.take(constants.FIELD_HEIGHT),
                    R.flip(R.concat)(EMPTY_FIELD)
                )(ff);
            return [nf, nf.length - ff.length];
        };

        // check if a block is outside of the gamefield
        let isInBorders = (block, field) => (
                   (block.x + block.data[0].length <= field[0].length)
                && (block.x >= 0)
                && (block.y >= 0)
                && (block.y + block.data.length <= field.length)
            );

        // check if a block could be placed in the field
        let isHitWalls = function(block, field){
            if(!isInBorders(block, field)){
                return true;
            }
            for(let y = 0, l = block.data.length; y < l; ++y){
                for(let x = 0, m = block.data[0].length; x < m; ++x){
                    if(field[y + block.y][x + block.x] && block.data[y][x]){
                        return true;
                    }
                }
            }
            return false;
        };

        // merge block data into a gamefield
        let mergeBlock = function(block, field){
            let nField = R.map(R.map(R.identity), field);
            for(let y = 0, l = block.data.length; y < l; ++y){
                for(let x = 0, m = block.data[0].length; x < m; ++x){
                    nField[y + block.y][x + block.x] += block.data[y][x];
                }
            }
            return nField;
        };

        // move block
        let moveDown = function(block, field){
            if(block.y > 0){
                let nBlock = R.merge(block, {y: block.y - 1});
                return isHitWalls(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let moveLeft = function(block, field){
            if(block.x > 0){
                let nBlock = R.merge(block, {x: block.x - 1});
                return isHitWalls(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let moveRight = function(block, field){
            if((block.x + block.data[0].length) < field[0].length){
                let nBlock = R.merge(block, {x: block.x + 1});
                return isHitWalls(nBlock, field) ? block : nBlock;
            }
            return block;
        };

        let rotateLeft = function(block, field){
            let nBlock = R.merge(
                block,
                {data: rotateDataLeft(block.data)}
            );
            return isHitWalls(nBlock, field) ? block : nBlock;
        };

        // move a block down unitl hits an obstakle
        let dropDown = function(block, field){
            let nBlock;
            do{
                nBlock = block;
                block = moveDown(block, field);
            }while(nBlock.y !== block.y);
            return block;
        };

        return {
            makePiece, mergeBlock, isHitWalls, rotateLeft, moveRight, moveLeft,
            moveDown, dropDown, shiftField, EMPTY_FIELD,
        };
});

define('tetris/store/gamestore',['redux', 'ramda', './actions', './tetris', '../constants'],
    function(redux, R, actions, tetris, constants){
        'use strict';

        // main reducer handle all state changes
        const INITIAL_STATE = {
            score: 0,
            startTime: 0,
            time: 0,
            speed: 2,
            page: constants.PAGE_INTRO,
            queue: tetris.makePiece(),
            piece: tetris.makePiece(),
            gamefield: tetris.EMPTY_FIELD,
            game: null,
        };
        function gameReducer(state, action){
            if(!state){
                return INITIAL_STATE;
            }
            let nState;
            switch(action.type){
            case actions.SWITCH_PAGE:
                nState = R.merge(state, {page: action.value});
                if(action.value === constants.PAGE_GAME){
                    nState.startTime = new Date().getTime();
                }
                break;
            case actions.GAME_RESTART:
                nState = R.merge(state, {
                    gamefield: INITIAL_STATE.gamefield,
                    speed: INITIAL_STATE.speed,
                    lives: INITIAL_STATE.lives,
                    score: INITIAL_STATE.score,
                });
                break;
            case actions.PUSH_BACK: //restore the state from the history
                return action.value;
            case actions.MOVE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.moveLeft(state.piece, state.gamefield),
                });
                break;
            case actions.MOVE_RIGHT:
                nState = R.merge(state, {
                    piece: tetris.moveRight(state.piece, state.gamefield),
                });
                break;
            case actions.ROTATE_LEFT:
                nState = R.merge(state, {
                    piece: tetris.rotateLeft(state.piece, state.gamefield),
                });
                break;
            case actions.DROP_DOWN:
                let nPiece = tetris.dropDown(state.piece, state.gamefield);
                nState = R.merge(state, {
                    gamefield: tetris.mergeBlock(nPiece, state.gamefield),
                    queue: tetris.makePiece(),
                    piece: state.queue,
                });
                break;
            case actions.MAGIC:
                let nBlock = tetris.makePiece(state.piece.x, state.piece.y);
                if(!tetris.isHitWalls(nBlock, state.gamefield)){
                    nState = R.merge(state, {
                        piece: nBlock,
                    });
                }else{
                    nState = state;
                }
                break;
            case actions.MOVE_DOWN:
                nState = R.merge(state, {
                    piece: tetris.moveDown(state.piece, state.gamefield),
                });
                // if block has not moved...
                if(R.equals(nState.piece, state.piece)){
                    nState = R.merge(nState, {
                        gamefield: tetris.mergeBlock(nState.piece, nState.gamefield),
                        queue: tetris.makePiece(),
                        piece: state.queue,
                    });
                }
                break;
            default:
                nState = state;
            }

            // we are playing game try to move the gamefield down,
            // collect the scores, update time, speed etc
            if(state.page === constants.PAGE_GAME){
                let res = tetris.shiftField(nState.gamefield);
                let nScore = state.score + res[1];
                nState = R.merge(nState, {
                    gamefield: res[0],
                    score: nScore,
                    speed: nScore
                        ? INITIAL_STATE.speed / nScore
                        : INITIAL_STATE.speed,
                });

                nState.time = new Date().getTime() - nState.startTime;
                if(tetris.isHitWalls(nState.piece, nState.gamefield)){
                    nState = R.merge(nState, {
                        page: constants.PAGE_FINAL,
                    });
                }
            }
            nState = R.merge(nState, {
                game: tetris.mergeBlock(nState.piece, nState.gamefield),
            });
            return nState;
        }

        return redux.createStore(gameReducer);
});

define('tetris/store/history',['./gamestore', '../constants', 'ramda'], function(store, constants, R){
        'use strict';

        let history = [];
        store.subscribe(function(){
            let st = store.getState();
            // store history only than pice changed
            if(st != R.last(history) && (!history.length || st.piece != R.last(history).piece)){
                history.push(st);
                history = R.takeLast(constants.HISTORY, history);
            }
            // clear the history when switching a page
            if(st.page !== constants.PAGE_GAME){
                history.length = 0;
            }
        });

        return {
            pop(){
                history.pop();
                return history.pop();
            },
            length: ()=> history.length,
        }
});

define('tetris/utils/keylistener',['easel', '../constants'], function(createjs, constants){
    'use strict';

    const KEYCODE_LEFT = 37,
          KEYCODE_RIGHT = 39,
          KEYCODE_UP = 38,
          KEYCODE_DOWN = 40,
          KEYCODE_M = 77,
          KEYCODE_SPACE = 32;


    let onKeyDown = (listener) =>
        (ev) => {
            switch(ev.keyCode){
            case KEYCODE_LEFT:
                listener.dispatchEvent({
                        type: 'key',
                        value: constants.KEY_LEFT,
                });
                break;
            case KEYCODE_RIGHT:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_RIGHT,
                });
                break;
            case KEYCODE_UP:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_BACK,
                });
                break;
            case KEYCODE_DOWN:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_ROTATE,
                });
                break;
            case KEYCODE_SPACE:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_DROP,
                });
            case KEYCODE_M:
                listener.dispatchEvent({
                    type: 'key',
                    value: constants.KEY_MAGIC,
                });
                break;
            };
        }

    function KeyListener(){
    }
    createjs.EventDispatcher.initialize(KeyListener.prototype);

    return function(){
        let kl = new KeyListener();
        let listener = onKeyDown(kl);
        window.addEventListener('keydown', listener);
        kl.destroy = () => window.removeEventListener('keydown', listener);
        return kl;
    };

});

define(
    'tetris/controller',['easel', './constants', './store/gamestore', './store/history', './store/actions', './utils/keylistener'],
    function(createjs, constants, store, history,  actions, keylistener){
    'use strict';

    // the main game controller. It set the key listener and dispatch
    // corrsponding actions on the store.
    function Controller(){
        this.isRunning = false;
    }

    Controller.prototype.onKey= function(ev){
        switch( ev.value ){
        case constants.KEY_LEFT:
            store.dispatch(actions.moveLeft());
            break;
        case constants.KEY_RIGHT:
            store.dispatch(actions.moveRight());
            break;
        case constants.KEY_ROTATE:
            store.dispatch(actions.rotateLeft());
            break;
        case constants.KEY_DROP:
            store.dispatch(actions.dropDown());
            break;
        case constants.KEY_BACK:
            let prevState = history.pop();
            if(prevState && prevState.page === constants.PAGE_GAME){
                store.dispatch(actions.pushBack(prevState));
            }
            break;
        case constants.KEY_MAGIC:
            store.dispatch(actions.magic());
            break;
        }
    };

    Controller.prototype.stop = function(){
        this.isRunning = false;
        clearInterval(this.interval);
        this.kListener.destroy();
    };

    Controller.prototype.update = function(){
        clearInterval(this.interval);
        store.dispatch(actions.moveDown());
        if(this.isRunning){
            this.interval = setTimeout( this.update.bind(this), store.getState().speed * 1000);
        }
    };

    Controller.prototype.start = function(){
        this.kListener = keylistener(store);
        this.kListener.on('key', this.onKey);
        this.isRunning = true;
        this.interval = setTimeout( this.update.bind(this), store.getState().speed * 1000);
    };

    return Controller;
});

define('tetris/views/uis',['easel'], function(createjs){
    'use strict';

    const ENTER_BUTTON_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [10, 10, 80, 35],
            [95, 10, 80, 35],
            [175, 10, 80, 35],
        ],
        animations: {
            out: 0,
            over: 1,
            down: 2,
        }
    });

    const LOGO_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [10, 50, 140, 80],
        ],
    });
    let logo = new createjs.Sprite(LOGO_SHEET);


    return {
        buttonEnter: function(){
            let buttonEnter = new createjs.Sprite(ENTER_BUTTON_SHEET, 'out');
            let helper = new createjs.ButtonHelper(buttonEnter, 'out', 'over', 'down', false);
            return buttonEnter;
        },
        logo,
    };
});

define('tetris/views/intro_page',['easel', '../constants', './uis'], function(createjs, constants, uis){
    'use strict';

    const INFO = ['# <LEFT>  - left',
                  '# <RIGHT> - right',
                  '# <DOWN>  - rotate',
                  '# <SPACE> - drop',
                  '# <UP>    - rollback',
                  '# <M>     - magic'
                 ].join('\n');

    function IntroPage() {
        this.Container_constructor();

        let logo = uis.logo;
        logo.x = constants.GAME_WIDTH / 2 - 65;
        logo.y = constants.GAME_HEIGHT / 2 - 90;

        this.addChild(logo);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT / 2 + 10;
        buttonEnter.addEventListener('click', () => this.dispatchEvent('complete'));

        this.addChild(buttonEnter);

        let info = new createjs.Text(INFO, '18px ' + constants.FONT, constants.COLOR_FG);
        info.textAlign = 'left';
        info.lineHeight = 18;
        info.x = constants.GAME_WIDTH / 2 - 90;
        info.y = constants.GAME_HEIGHT - 140;
        this.addChild(info);
    }

    let p = createjs.extend(IntroPage, createjs.Container);
    IntroPage = createjs.promote(IntroPage, 'Container');
    return IntroPage;
});

define('tetris/utils/tools',['ramda'], function(R){
    'use strict';

    let enumerate = list => R.zip(R.range(0, list.length), list);

    return {
        enumerate
    }
});

define('tetris/views/magic',['easel'], function(createjs){
    'use strict';

    const MAGIC_SHEET = new createjs.SpriteSheet({
        images: ['./assets/sprites.png'],
        frames: [
            [150, 50, 24, 24],
            [150 + 1 * 24, 50, 24, 24],
            [150 + 2 * 24, 50, 24, 24],
            [150 + 3 * 24, 50, 24, 24],
            [150, 75, 24, 24],
        ],
        animations: {
            in: {
                frames: [4, 0, 1, 2, 3, 4],
                next: false,
                speed: 0.5,
            },
            out: {
                frames: [3, 2, 1, 0, 4],
                next: false,
                speed: 0.5,
            },
        }
    });

    return () => new createjs.Sprite(MAGIC_SHEET);
});

define('tetris/views/gamepixel_view',['easel', './magic', '../constants'], function(createjs, magic, constants){
    'use strict';


    function fill(g, color){
        g.beginFill(constants.COLOR_BG)
         .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        switch(color){
        case 0:
            g.beginFill(constants.COLOR_FG)
                .drawRect(10, 10, constants.PIXEL_WIDTH - 20, constants.PIXEL_WIDTH - 20);
            break;
        case 1:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(8, 8, constants.PIXEL_WIDTH - 16, constants.PIXEL_WIDTH - 16);
            break;
        case 2:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12);
            break;
        case 3:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(10, 10, constants.PIXEL_WIDTH - 20, constants.PIXEL_WIDTH - 20);
            break;
        case 4:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(4, 4, constants.PIXEL_WIDTH - 8, constants.PIXEL_WIDTH - 8)
            g.beginFill(constants.COLOR_BG)
                .drawRect(5, 5, constants.PIXEL_WIDTH - 10, constants.PIXEL_WIDTH - 10)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            break;
        case 5:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            g.beginFill(constants.COLOR_BG)
                .drawRect(3, 3, constants.PIXEL_WIDTH - 6, constants.PIXEL_WIDTH - 6)
            g.beginFill(constants.COLOR_FG)
                .drawRect(6, 6, constants.PIXEL_WIDTH - 12, constants.PIXEL_WIDTH - 12)
            g.beginFill(constants.COLOR_BG)
                .drawRect(8, 8, constants.PIXEL_WIDTH - 16, constants.PIXEL_WIDTH - 16);
            break;
        default:
            g.beginFill(constants.COLOR_FG)
                .drawRect(1, 1, constants.PIXEL_WIDTH - 2, constants.PIXEL_WIDTH - 2)
            break;
        }
    }

    function GamePixel() {
        this.Container_constructor();
        this.enabled = false;
        this.magic = magic();

        this.bg = new createjs.Shape();
        this.addChild(this.bg);
        this.addChild(this.magic);
        this.reDraw();
    }

    let p = createjs.extend(GamePixel, createjs.Container);
    p.highlight = function(color) {
        if(this.color !== color){
            this.color = color;
            this.reDraw();
        }
    }
    p.reDraw = function() {
        this.bg.graphics
            .beginFill(constants.COLOR_BG)
            .drawRect(0, 0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);

        fill(this.bg.graphics, this.color);
        this.magic.gotoAndPlay(this.color ? 'out' : 'in');
        this.bg.cache(0,0, constants.PIXEL_WIDTH, constants.PIXEL_WIDTH);
    }

    GamePixel = createjs.promote(GamePixel, 'Container');
    return GamePixel;

});

define('tetris/views/state_listener',['ramda'], function(R){
    'use strict';

    // the basic view which only rerenders itself when one of the <fields> in
    // the <store> changed
    let StateListener = function(store, fields, callback){
        this.store = store;
        this.fields = fields;
        this.callback = callback;
        this.lastState = {};
        if(store){
            this.store.subscribe(this.onUpdate.bind(this));
        }
    };

    StateListener.prototype.callback = R.identity;

    StateListener.prototype.onUpdate = function(){
        let state = R.pick(this.fields)(this.store.getState());
        if(!R.equals(this.lastState, state)){
            this.callback(state);
            this.lastState = state;
        }
    };

    return StateListener;
});

define(
    'tetris/views/gamefield_view',['ramda', 'easel', '../constants', '../utils/tools', './gamepixel_view', './state_listener'],
    function(R, createjs, constants, U, GamepixelView, StateListener){
    'use strict';

    function GamefieldView(store) {
        this.Container_constructor();

        this.pixels = [];
        R.forEach(n => {
            let px = new GamepixelView();
            px.y = constants.GAME_HEIGHT
                   - constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH * Math.floor(n / constants.FIELD_WIDTH);
            px.x = constants.PIXEL_WIDTH * (n % constants.FIELD_WIDTH);
            this.pixels.push(px);
            this.addChild(px);
        })(R.range(0, constants.FIELD_WIDTH * constants.FIELD_HEIGHT));

        let sl = new StateListener(store, ['game'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(GamefieldView, createjs.Container);

    p.onUpdate = function(state){
        R.forEach(pair => {
            this.pixels[pair[0]].highlight(pair[1]);
        })(U.enumerate(R.flatten(state.game)));
    };

    GamefieldView = createjs.promote(GamefieldView, 'Container');
    return GamefieldView;
});

define(
    'tetris/views/queue_view',['ramda', 'easel', '../constants', '../utils/tools', './gamepixel_view', './state_listener'],
    function(R, createjs, constants, U, GamepixelView, StateListener){
    'use strict';

    const PIECE_WIDTH = 3;

    function QueueView(store) {
        this.Container_constructor();

        this.width = this.height = constants.PIXEL_WIDTH * 4;
        this.lastUpdated = null;

        let bg = new createjs.Shape();
        bg.graphics
            .beginFill(constants.COLOR_FG)
            .drawRect(0, 0, this.width, this.width)
            .beginFill(constants.COLOR_BG)
            .drawRect(2, 2, this.width - 4, this.width - 4);
        bg.y = constants.PIXEL_WIDTH * 1.5;
        this.addChild(bg);

        var text = new createjs.Text('NEXT', '22px ' + constants.FONT, constants.COLOR_FG);
        text.x = constants.PIXEL_WIDTH * 0.95;

        this.addChild(text);

        this.pixels = [];
        R.forEach(n => {
            let px = new GamepixelView();
            px.y = 4 *  constants.PIXEL_WIDTH
                   - constants.PIXEL_WIDTH * Math.floor(n / 3);
            px.x = constants.PIXEL_WIDTH / 2 + constants.PIXEL_WIDTH * (n % 3);
            px.highlight(0);
            this.pixels.push(px);
            this.addChild(px);
        })(R.range(0, 9));

        let sl = new StateListener(store, ['queue'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(QueueView, createjs.Container);
    p.onUpdate = function(state){
        let q = state.queue;
        if(this.lastUpdated !== q){
            this.lastUpdated = q;
            // draw a gamefield
            R.forEach(p => {
                this.pixels[p].highlight(0);
            })(R.range(0, PIECE_WIDTH * PIECE_WIDTH));

            // draw a piece over the game field
            if(q.data){
                R.forEach(
                    pair =>
                    this.pixels[(Math.floor(pair[0] / q.data[0].length))
                            * PIECE_WIDTH
                            + (pair[0] % q.data[0].length)
                        ].highlight(pair[1])
                )( U.enumerate(R.flatten(q.data)) );
            }
        }
    };

    QueueView = createjs.promote(QueueView, 'Container');
    return QueueView;

});

define(
    'tetris/views/status_view',['easel', '../constants', './state_listener'],
    function(createjs, constants, StateListener){
    'use strict';

    var TEXT = 'SCORE: 0000  TIME: 00:00  SPEED: 00.1';

    function StatusView(store) {
        this.Container_constructor();
        this.text = new createjs.Text(TEXT, '18px ' + constants.FONT, constants.COLOR_FG);
        this.addChild(this.text);

        let sl = new StateListener(store, ['score', 'time', 'speed'], this.onUpdate.bind(this));
    };

    let p = createjs.extend(StatusView, createjs.Container);
    p.onUpdate = function(state){
        let sp = (1 / state.speed).toPrecision(3);
        let s = Math.floor(state.time / 1000);
        let m = Math.floor(s / 60);
        s = Math.floor(s - m * 60);
        this.text.text = TEXT
            .replace('0000', ('0000' + state.score).slice(-4))
            .replace('00:',  ('00' + m).slice(-2) + ':')
            .replace(':00',  ':' + ('00' + s).slice(-2))
            .replace('00.1',  '' + sp);
    };


    StatusView = createjs.promote(StatusView, 'Container');
    return StatusView;

});

define(
    'tetris/views/lives_view',['ramda', 'easel', '../constants', '../store/history', './state_listener'],
    function(R, createjs, constants, history, StateListener){
    'use strict';

    var TEXT = '*';

    function LivesView(store, history) {
        this.Container_constructor();

        var title = new createjs.Text('LIVES', '22px ' + constants.FONT, constants.COLOR_FG);
        title.x = constants.PIXEL_WIDTH * 0.70;
        title.textAlign = 'center';

        this.text = new createjs.Text(TEXT, '50px ' + constants.FONT, constants.COLOR_FG);
        this.text.y = 30;

        this.addChild(title);
        this.addChild(this.text);

        let sl = new StateListener(store, ['game',], this.onUpdate.bind(this));
    };

    let p = createjs.extend(LivesView, createjs.Container);
    p.onUpdate = function(state){
        this.text.text = R.join('\n')(R.repeat(TEXT, history.length()));
    };

    LivesView = createjs.promote(LivesView, 'Container');
    return LivesView;

});

define(
    'tetris/views/game_page',['easel', '../constants', './gamefield_view', './queue_view', './status_view', './lives_view'],
    function(createjs, constants, GamefieldView, QueueView, StatusView, LivesView){
    'use strict';

    function GamePage(store, history) {
        this.Container_constructor();

        let gf = new GamefieldView(store);
        gf.y = -10;

        let gq = new QueueView(store);
        gq.y = 40;
        gq.x = constants.GAME_WIDTH - gq.width - 10;

        let gl = new LivesView(store, history);
        gl.y = 190;
        gl.x = constants.GAME_WIDTH - 72;


        let gs = new StatusView(store);
        gs.y = 8;
        gs.x = 8;

        this.addChild(gf);
        this.addChild(gq);
        this.addChild(gl);
        this.addChild(gs);
    };

    let p = createjs.extend(GamePage, createjs.Container);
    GamePage = createjs.promote(GamePage, 'Container');
    return GamePage;

});

define(
    'tetris/views/final_page',['easel', '../constants', './uis', './state_listener'],
    function(createjs, constants, uis, StateListener){
    'use strict';

    function FinalPage(store) {
        this.Container_constructor();

        let greet = new createjs.Text('My greetings.\nYour score is:', '24px ' + constants.FONT, constants.COLOR_FG);
        greet.textAlign = 'center';
        greet.lineHeight = 26;
        greet.x = constants.GAME_WIDTH / 2;
        greet.y = constants.GAME_HEIGHT / 2 - 130;
        this.addChild(greet);

        let more = new createjs.Text('Try again.', '24px ' + constants.FONT, constants.COLOR_FG);
        more.textAlign = 'center';
        more.x = constants.GAME_WIDTH / 2;
        more.y = constants.GAME_HEIGHT - 140;
        this.addChild(more);

        this.score = new createjs.Text('', '72px ' + constants.FONT, constants.COLOR_FG);
        this.score.textAlign = 'center';
        this.score.x = constants.GAME_WIDTH / 2;
        this.score.y = constants.GAME_HEIGHT / 2 - 70;
        this.addChild(this.score);

        let buttonEnter = uis.buttonEnter();
        buttonEnter.x = constants.GAME_WIDTH/2 - 40;
        buttonEnter.y = constants.GAME_HEIGHT - 100;
        buttonEnter.addEventListener('click', () => this.dispatchEvent('complete'));

        this.addChild(buttonEnter);

        let sl = new StateListener(store, ['score'], this.onUpdate.bind(this));
    }

    let p = createjs.extend(FinalPage, createjs.Container);
    p.onUpdate = function(state){
        this.score.text = state.score;
    };


    FinalPage = createjs.promote(FinalPage, 'Container');
    return FinalPage;

});

define(
    'tetris/main',['easel', './constants', './store/gamestore', './store/history', './store/actions', './controller',
     './views/intro_page', './views/game_page', './views/final_page'],
    function(createjs, constants, store, history, actions, Controller, IntroPage, GamePage, FinalPage){
    'use strict';

    let introPage = new IntroPage();
    introPage.on('complete', function(){
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let finalPage = new FinalPage(store);
    finalPage.on('complete', function(){
        store.dispatch(actions.gameRestart());
        store.dispatch(actions.switchPage(constants.PAGE_GAME));
    });

    let gamePage = new GamePage(store, history);
    let gameController = new Controller();

    let pages = {
        [constants.PAGE_INTRO]: introPage,
        [constants.PAGE_GAME]: gamePage,
        [constants.PAGE_FINAL]: finalPage,
    };

    let App = {
        stage: null,
        currentPage: null,
        init: function(node){
            let canvas = document.createElement('canvas');
            canvas.width = constants.GAME_WIDTH;
            canvas.height = constants.GAME_HEIGHT;
            node.appendChild(canvas);
            this.stage = new createjs.Stage(canvas);
            store.dispatch(actions.switchPage(constants.PAGE_INTRO));

            createjs.Ticker.addEventListener('tick', ()=> this.stage.update());

        },
        update: function(){
            //switch screens of the game
            let page = store.getState().page;
            if(this.currentPage !== page && pages[page]){
                this.stage.removeChild(pages[this.currentPage]);
                this.currentPage = page;
                this.stage.addChild(pages[this.currentPage]);

                if(page === constants.PAGE_GAME){
                    gameController.start();
                }
                if(page === constants.PAGE_FINAL){
                    gameController.stop();
                }

                // there is no need to track mouse when in game
                //this.stage.enableMouseOver((page === constants.PAGE_GAME) ? 0 : 10);

                if(page === constants.PAGE_GAME){
                    createjs.Ticker.removeEventListener('tick');
                    this.stage.enableMouseOver(0);
                }else{
                    createjs.Ticker.addEventListener('tick', ()=> this.stage.update());
                    this.stage.enableMouseOver(10);
                }
            }
            this.stage.update();
        },
    };

    let app = function(node){
        store.subscribe(this.update.bind(this));
        this.init(node);
    };
    app.prototype = App;

    return app;
});

require(['tetris/main'], function (App) {
    'use strict';
    /* Just an entrance point */
    var app = new App(document.getElementById('app'));
});

define("main_built.js", function(){});


define("topath", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The number of different varNames that will be cached.
     * If a varName is cached, the actual parsing algorithm will not be called
     * which significantly improves performance.
     * However, this cache is size-limited to prevent degrading the user's software
     * over a period of time.
     * If the cache is full, we start removing older varNames one at a time.
     */
    var cacheSize = 100;
    var quoteChars = '\'"`';
    /**
     * @ignore
     */
    var Cache = /** @class */ (function () {
        function Cache(size) {
            this.size = size;
            this.reset();
        }
        Cache.prototype.reset = function () {
            this.oldestIndex = 0;
            this.map = {};
            this.cachedKeys = new Array(this.size);
        };
        Cache.prototype.get = function (key) {
            return this.map[key];
        };
        Cache.prototype.set = function (key, value) {
            this.map[key] = value;
            var oldestKey = this.cachedKeys[this.oldestIndex];
            if (oldestKey !== undefined) {
                delete this.map[oldestKey];
            }
            this.cachedKeys[this.oldestIndex] = key;
            this.oldestIndex++;
            this.oldestIndex %= this.size;
        };
        return Cache;
    }());
    exports.Cache = Cache;
    var cache = new Cache(cacheSize);
    /**
     * Removes the quotes from a string and returns it.
     * @param propName an string with quotations
     * @throws `SyntaxError` if the quotation symbols don't match or one is missing
     * @returns the input with its quotes removed
     */
    function propBetweenBrackets(propName) {
        // in our algorithms key is always a string and never only a string of spaces
        var firstChar = propName.charAt(0);
        var lastChar = propName.substr(-1);
        if (quoteChars.includes(firstChar) || quoteChars.includes(lastChar)) {
            if (propName.length < 2 || firstChar !== lastChar) {
                throw new SyntaxError('Mismatching string quotation: ' + propName);
            }
            return propName.substring(1, propName.length - 1);
        }
        if (propName.includes('[')) {
            throw new SyntaxError('Missing ] in varName ' + propName);
        }
        // Normalize leading plus from numerical indices
        if (firstChar === '+') {
            return propName.substr(1);
        }
        return propName;
    }
    function pushPropName(propNames, propName, preDot) {
        var pName = propName.trim();
        if (pName === '') {
            return propNames;
        }
        if (pName.startsWith('.')) {
            if (preDot) {
                pName = pName.substr(1).trim();
                if (pName === '') {
                    return propNames;
                }
            }
            else {
                throw new SyntaxError('Unexpected . at the start of "' + propName + '"');
            }
        }
        else if (preDot) {
            throw new SyntaxError('Missing . at the start of "' + propName + '"');
        }
        if (pName.endsWith('.')) {
            throw new SyntaxError('Unexpected "." at the end of "' + propName + '"');
        }
        var propNameParts = pName.split('.');
        for (var _i = 0, propNameParts_1 = propNameParts; _i < propNameParts_1.length; _i++) {
            var propNamePart = propNameParts_1[_i];
            var trimmedPropName = propNamePart.trim();
            if (trimmedPropName === '') {
                throw new SyntaxError('Empty prop name when parsing "' + propName + '"');
            }
            propNames.push(trimmedPropName);
        }
        return propNames;
    }
    /**
     * Breaks a variable name to an array of strings that can be used to get a
     * particular value from an object
     * @param varName - the variable name as it occurs in the template.
     * For example `a["b"].c`
     * @throws `TypeError` if the varName is not a string
     * @throws `SyntaxError` if the varName syntax has a problem
     * @returns - an array of property names that can be used to get a particular
     * value.
     * For example `['a', 'b', 'c']`
     */
    function toPath(varName) {
        if (typeof varName !== 'string') {
            throw new TypeError('Expected string but Got ' + varName);
        }
        var openBracketIndex;
        var closeBracketIndex = 0;
        var beforeBracket;
        var propName;
        var preDot = false;
        var propNames = [];
        for (var currentIndex = 0; currentIndex < varName.length; currentIndex = closeBracketIndex) {
            openBracketIndex = varName.indexOf('[', currentIndex);
            if (openBracketIndex === -1) {
                break;
            }
            closeBracketIndex = varName.indexOf(']', openBracketIndex);
            if (closeBracketIndex === -1) {
                throw new SyntaxError('Missing ] in varName ' + varName);
            }
            propName = varName.substring(openBracketIndex + 1, closeBracketIndex).trim();
            if (propName.length === 0) {
                throw new SyntaxError('Unexpected token ]');
            }
            closeBracketIndex++;
            beforeBracket = varName.substring(currentIndex, openBracketIndex);
            pushPropName(propNames, beforeBracket, preDot);
            propNames.push(propBetweenBrackets(propName));
            preDot = true;
        }
        var rest = varName.substring(closeBracketIndex);
        return pushPropName(propNames, rest, preDot);
    }
    exports.toPath = toPath;
    /**
     * This is just a faster version of `toPath()`
     */
    function toPathCached(varName) {
        var result = cache.get(varName);
        if (result === undefined) {
            result = toPath(varName);
            cache.set(varName, result);
        }
        return result;
    }
    toPath.cached = toPathCached;
});
define("get", ["require", "exports", "topath"], function (require, exports, topath_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Checks if the provided value can be used as a scope, that is a non-null
     * object or a function.
     * @param val the value that is supposed to be tested
     */
    function isValidScope(val) {
        if (val) {
            // At this point `null` is filtered out
            var type = typeof val;
            return type === 'object' || type === 'function';
        }
        return false;
    }
    /**
     * Similar to lodash `_.get()`
     *
     * Differences with JavaScript:
     * No support for keys that include `[` or `]`.
     * No support for keys that include `'` or `"` or `.
     * `foo[bar]` is allowed while JavaScript treats `bar` as a variable and tries
     * to lookup its value or throws a `ReferenceError` if there is no variable
     * called `bar`.
     * If it cannot find a value in the specified path, it may return undefined or
     * throw an error depending on the value of the `propExists` param.
     * @param scope an object to resolve value from
     * @param varNameOrPropNames the variable name string or an array of property
     * names (as returned by `toPath()`)
     * @param propExists claiming that the varName is exists in the scope.
     * It defaults to false which means we don't throw an error (like Mustachejs).
     * @throws `SyntaxError` if the varName string cannot be parsed
     * @throws `ReferenceError` if the scope does not contain the requested key
     * but the `propExists` is set to a truthy value
     * @returns the value or undefined. If path or scope are undefined or scope is
     * null the result is always undefined.
     */
    function get(scope, varNameOrPropNames, propExists) {
        var propNames = Array.isArray(varNameOrPropNames)
            ? varNameOrPropNames
            : topath_1.toPath.cached(varNameOrPropNames);
        var currentScope = scope;
        for (var _i = 0, propNames_1 = propNames; _i < propNames_1.length; _i++) {
            var propName = propNames_1[_i];
            if (isValidScope(currentScope)) {
                // @ts-ignore
                currentScope = currentScope[propName];
            }
            else if (propExists) {
                throw new ReferenceError(propName +
                    ' is not defined in the scope (' +
                    scope +
                    '). Parsed path: ' +
                    propNames);
            }
            else {
                return;
            }
        }
        return currentScope;
    }
    exports.get = get;
});
define("tokenize", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultTokenizeOptions = ['{{', '}}'];
    /**
     * Parse a template and returns the tokens in an object.
     *
     * @throws `TypeError` if there's an issue with its inputs
     * @throws `SyntaxError` if there's an issue with the template
     *
     * @param template the template
     * @param openSym the string that marks the start of a variable name
     * @param closeSym the string that marks the start of a variable name
     * @returns the resulting tokens as an object that has strings and variable names
     */
    function tokenize(template, options) {
        if (options === void 0) { options = defaultTokenizeOptions; }
        if (!Array.isArray(options) || options.length !== 2) {
            throw Error('Tags should be an array with exactly two strings. Got ' + options);
        }
        var openSym = options[0], closeSym = options[1];
        if (typeof openSym !== 'string' ||
            typeof closeSym !== 'string' ||
            openSym.length === 0 ||
            closeSym.length === 0 ||
            openSym === closeSym) {
            throw new TypeError('The tags array should have two distinct non-empty strings. Got ' +
                options.join(', '));
        }
        var openSymLen = openSym.length;
        var closeSymLen = closeSym.length;
        var openIndex;
        var closeIndex = 0;
        var varName;
        var strings = [];
        var varNames = [];
        var currentIndex = 0;
        while (currentIndex < template.length) {
            openIndex = template.indexOf(openSym, currentIndex);
            if (openIndex === -1) {
                break;
            }
            closeIndex = template.indexOf(closeSym, openIndex);
            if (closeIndex === -1) {
                throw new SyntaxError('Missing ' + closeSym + ' in the template expression ' + template);
            }
            varName = template.substring(openIndex + openSymLen, closeIndex).trim();
            if (varName.length === 0) {
                throw new SyntaxError('Unexpected token ' + closeSym);
            }
            if (varName.includes(openSym)) {
                throw new SyntaxError('Variable names cannot have ' + openSym + ' ' + varName);
            }
            varNames.push(varName);
            closeIndex += closeSymLen;
            strings.push(template.substring(currentIndex, openIndex));
            currentIndex = closeIndex;
        }
        strings.push(template.substring(closeIndex));
        return { strings: strings, varNames: varNames };
    }
    exports.tokenize = tokenize;
});
define("renderer", ["require", "exports", "get", "topath"], function (require, exports, get_1, topath_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultRendererOptions = {};
    /**
     * This class does the heavy lifting of interpolation (putting the actual values
     * in the template).
     * This is created by the `.compile()` method and is used under the hood by
     * `.render()`, `renderFn()` and `renderFnAsync()` functions.
     */
    var Renderer = /** @class */ (function () {
        /**
         * Creates a new Renderer instance. This is called internally by the compiler.
         * @param tokens - the result of the `.tokenize()` function
         * @param options - some options for customizing the rendering process
         * @throws `TypeError` if the token is invalid
         */
        function Renderer(tokens, options) {
            var _this = this;
            if (options === void 0) { options = defaultRendererOptions; }
            this.tokens = tokens;
            this.options = options;
            /**
             * Replaces every {{varName}} inside the template with values from the scope
             * parameter.
             *
             * @param template The template containing one or more {{varName}} as
             * placeholders for values from the `scope` parameter.
             * @param scope An object containing values for variable names from the the
             * template. If it's omitted, we default to an empty object.
             */
            this.render = function (scope) {
                if (scope === void 0) { scope = {}; }
                var varNames = _this.tokens.varNames;
                var length = varNames.length;
                _this.cacheParsedPaths();
                var values = new Array(length);
                for (var i = 0; i < length; i++) {
                    values[i] = get_1.get(scope, _this.toPathCache[i], _this.options.propsExist);
                }
                return _this.stringify(values);
            };
            /**
             * Same as [[render]] but accepts a resolver function which will be
             * responsible for returning a value for every varName.
             */
            this.renderFn = function (resolveFn, scope) {
                if (scope === void 0) { scope = {}; }
                var values = _this.resolveVarNames(resolveFn, scope);
                return _this.stringify(values);
            };
            /**
             * Same as [[render]] but accepts a resolver function which will be responsible
             * for returning promise that resolves to a value for every varName.
             */
            this.renderFnAsync = function (resolveFnAsync, scope) {
                if (scope === void 0) { scope = {}; }
                return Promise.all(_this.resolveVarNames(resolveFnAsync, scope)).then(function (values) { return _this.stringify(values); });
            };
            if (tokens === null ||
                typeof tokens !== 'object' ||
                !Array.isArray(tokens.strings) ||
                !Array.isArray(tokens.varNames) ||
                tokens.strings.length !== tokens.varNames.length + 1) {
                throw new TypeError('Invalid tokens object ' + tokens);
            }
            if (options.validateVarNames) {
                // trying to initialize toPathCache parses them which is also validation
                this.cacheParsedPaths();
            }
        }
        /**
         * This function is called internally for filling in the `toPathCache` cache.
         * If the `validateVarNames` option for the constructor is set to a truthy
         * value, this function is called immediately which leads to a validation as
         * well because it throws an error if it cannot parse variable names.
         */
        Renderer.prototype.cacheParsedPaths = function () {
            var varNames = this.tokens.varNames;
            if (this.toPathCache === undefined) {
                this.toPathCache = new Array(varNames.length);
                for (var i = 0; i < varNames.length; i++) {
                    this.toPathCache[i] = topath_2.toPath.cached(varNames[i]);
                }
            }
        };
        Renderer.prototype.resolveVarNames = function (resolveFn, scope) {
            if (scope === void 0) { scope = {}; }
            var varNames = this.tokens.varNames;
            if (typeof resolveFn !== 'function') {
                throw new TypeError('Expected a resolver function but got ' + resolveFn);
            }
            var length = varNames.length;
            var values = new Array(length);
            for (var i = 0; i < length; i++) {
                values[i] = resolveFn(varNames[i], scope);
            }
            return values;
        };
        /**
         * Puts the resolved `values` into the rest of the template (`strings`) and
         * returns the final result that'll be returned from `render()`, `renderFn()`
         * and `renderFnAsync()` functions.
         */
        Renderer.prototype.stringify = function (values) {
            var strings = this.tokens.strings;
            var explicit = this.options.explicit;
            var ret = '';
            var length = values.length;
            for (var i = 0; i < length; i++) {
                ret += strings[i];
                var value = values[i];
                if (explicit || (value !== null && value !== undefined)) {
                    ret += value;
                }
            }
            ret += strings[length];
            return ret;
        };
        return Renderer;
    }());
    exports.Renderer = Renderer;
});
define("compile", ["require", "exports", "renderer", "tokenize"], function (require, exports, renderer_1, tokenize_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var defaultCompileOptions = {};
    /**
     * Compiles a template and returns an object with functions that render it.
     * Compilation makes repeated render calls more optimized by parsing the
     * template only once and reusing the results.
     * As a result, rendering gets 3-5x faster.
     * Caching is stored in the resulting object, so if you free up all the
     * references to that object, the caches will be garbage collected.
     *
     * @param template same as the template parameter to .render()
     * @param options some options for customizing the compilation
     * @throws `TypeError` if the template is not a string
     * @throws `TypeError` if the options is set but is not an object
     * @throws any error that [[tokenize]] or [[Renderer.constructor]] may throw
     * @returns an object with some methods that can do the actual rendering
     */
    function compile(template, options) {
        if (options === void 0) { options = defaultCompileOptions; }
        if (typeof template !== 'string') {
            throw new TypeError('The template parameter must be a string. Got ' + template);
        }
        if (options === null || typeof options !== 'object') {
            throw new TypeError('The compiler options should be an object. Got ' + options);
        }
        var tokens = tokenize_1.tokenize(template, options.tags);
        return new renderer_1.Renderer(tokens, options);
    }
    exports.compile = compile;
});
define("render", ["require", "exports", "compile"], function (require, exports, compile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Replaces every {{varName}} inside the template with values from the scope
     * parameter.
     *
     * @param template The template containing one or more {{varName}} as
     * placeholders for values from the `scope` parameter.
     * @param scope An object containing values for variable names from the the
     * template. If it's omitted, we default to an empty object.
     * Since functions are objects in javascript, the `scope` can technically be a
     * function too but it won't be called. It'll be treated as an object and its
     * properties will be used for the lookup.
     * @param options same options as the [[compile]] function
     * @throws any error that [[compile]] or [[Renderer.render]] may throw
     * @returns Template where its variable names replaced with
     * corresponding values.
     */
    function render(template, scope, options) {
        var renderer = compile_1.compile(template, options);
        return renderer.render(scope);
    }
    exports.render = render;
    /**
     * Same as [[render]] but accepts a resolver function which will be responsible
     * for returning a value for every varName.
     * @throws any error that [[compile]] or [[Renderer.renderFn]] may throw
     */
    function renderFn(template, resolveFn, scope, options) {
        var renderer = compile_1.compile(template, options);
        return renderer.renderFn(resolveFn, scope);
    }
    exports.renderFn = renderFn;
    /**
     * Same as [[renderFn]] but only works with asynchronous resolver functions
     * (a function that returns a promise instead of the value).
     * @throws any error that [[compile]] or [[Renderer.renderFnAsync]] may throw
     */
    function renderFnAsync(template, resolveFnAsync, scope, options) {
        var renderer = compile_1.compile(template, options);
        return renderer.renderFnAsync(resolveFnAsync, scope);
    }
    exports.renderFnAsync = renderFnAsync;
});
define("index", ["require", "exports", "get", "renderer", "tokenize", "compile", "render"], function (require, exports, get_2, renderer_2, tokenize_2, compile_2, render_1) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(get_2);
    __export(renderer_2);
    __export(tokenize_2);
    __export(compile_2);
    __export(render_1);
});
//# sourceMappingURL=micromustache.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_1 = require("./get");
const topath_1 = require("./topath");
const defaultRendererOptions = {};
/**
 * This class does the heavy lifting of interpolation (putting the actual values
 * in the template).
 * This is created by the `.compile()` method and is used under the hood by
 * `.render()`, `renderFn()` and `renderFnAsync()` functions.
 */
class Renderer {
    /**
     * Creates a new Renderer instance. This is called internally by the compiler.
     * @param tokens - the result of the `.tokenize()` function
     * @param options - some options for customizing the rendering process
     * @throws `TypeError` if the token is invalid
     */
    constructor(tokens, options = defaultRendererOptions) {
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
        this.render = (scope = {}) => {
            const { varNames } = this.tokens;
            const { length } = varNames;
            this.cacheParsedPaths();
            const values = new Array(length);
            for (let i = 0; i < length; i++) {
                values[i] = get_1.get(scope, this.toPathCache[i], this.options.propsExist);
            }
            return this.stringify(values);
        };
        /**
         * Same as [[render]] but accepts a resolver function which will be
         * responsible for returning a value for every varName.
         */
        this.renderFn = (resolveFn, scope = {}) => {
            const values = this.resolveVarNames(resolveFn, scope);
            return this.stringify(values);
        };
        /**
         * Same as [[render]] but accepts a resolver function which will be responsible
         * for returning promise that resolves to a value for every varName.
         */
        this.renderFnAsync = (resolveFnAsync, scope = {}) => {
            return Promise.all(this.resolveVarNames(resolveFnAsync, scope)).then(values => this.stringify(values));
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
    cacheParsedPaths() {
        const { varNames } = this.tokens;
        if (this.toPathCache === undefined) {
            this.toPathCache = new Array(varNames.length);
            for (let i = 0; i < varNames.length; i++) {
                this.toPathCache[i] = topath_1.toPath.cached(varNames[i]);
            }
        }
    }
    resolveVarNames(resolveFn, scope = {}) {
        const { varNames } = this.tokens;
        if (typeof resolveFn !== 'function') {
            throw new TypeError('Expected a resolver function but got ' + resolveFn);
        }
        const { length } = varNames;
        const values = new Array(length);
        for (let i = 0; i < length; i++) {
            values[i] = resolveFn(varNames[i], scope);
        }
        return values;
    }
    /**
     * Puts the resolved `values` into the rest of the template (`strings`) and
     * returns the final result that'll be returned from `render()`, `renderFn()`
     * and `renderFnAsync()` functions.
     */
    stringify(values) {
        const { strings } = this.tokens;
        const { explicit } = this.options;
        let ret = '';
        const { length } = values;
        for (let i = 0; i < length; i++) {
            ret += strings[i];
            const value = values[i];
            if (explicit || (value !== null && value !== undefined)) {
                ret += value;
            }
        }
        ret += strings[length];
        return ret;
    }
}
exports.Renderer = Renderer;
//# sourceMappingURL=renderer.js.map
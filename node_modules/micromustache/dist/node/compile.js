"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const renderer_1 = require("./renderer");
const tokenize_1 = require("./tokenize");
const defaultCompileOptions = {};
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
function compile(template, options = defaultCompileOptions) {
    if (typeof template !== 'string') {
        throw new TypeError('The template parameter must be a string. Got ' + template);
    }
    if (options === null || typeof options !== 'object') {
        throw new TypeError('The compiler options should be an object. Got ' + options);
    }
    const tokens = tokenize_1.tokenize(template, options.tags);
    return new renderer_1.Renderer(tokens, options);
}
exports.compile = compile;
//# sourceMappingURL=compile.js.map
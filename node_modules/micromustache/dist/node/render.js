"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compile_1 = require("./compile");
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
    const renderer = compile_1.compile(template, options);
    return renderer.render(scope);
}
exports.render = render;
/**
 * Same as [[render]] but accepts a resolver function which will be responsible
 * for returning a value for every varName.
 * @throws any error that [[compile]] or [[Renderer.renderFn]] may throw
 */
function renderFn(template, resolveFn, scope, options) {
    const renderer = compile_1.compile(template, options);
    return renderer.renderFn(resolveFn, scope);
}
exports.renderFn = renderFn;
/**
 * Same as [[renderFn]] but only works with asynchronous resolver functions
 * (a function that returns a promise instead of the value).
 * @throws any error that [[compile]] or [[Renderer.renderFnAsync]] may throw
 */
function renderFnAsync(template, resolveFnAsync, scope, options) {
    const renderer = compile_1.compile(template, options);
    return renderer.renderFnAsync(resolveFnAsync, scope);
}
exports.renderFnAsync = renderFnAsync;
//# sourceMappingURL=render.js.map
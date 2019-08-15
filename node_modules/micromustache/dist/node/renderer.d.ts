import { Scope } from './get';
import { ITokens } from './tokenize';
/**
 * The options passed to Renderer's constructor
 */
export interface IRendererOptions {
    /**
     * When set to a truthy value, rendering literally puts a 'null' or
     * 'undefined' for values that are `null` or `undefined`.
     * By default it swallows those values to be compatible with Mustache.
     */
    readonly explicit?: boolean;
    /**
     * When set to a truthy value, we throw a ReferenceError for invalid varNames.
     * Invalid varNames are the ones that do not exist in the scope.
     * In that case the value for the varNames will be assumed an empty string.
     * By default we throw a ReferenceError to be compatible with how JavaScript
     * threats such invalid reference.
     * If a value does not exist in the scope, two things can happen:
     * - if `propsExist` is truthy, the value will be assumed empty string
     * - if `propsExist` is falsy, a ReferenceError will be thrown
     */
    readonly propsExist?: boolean;
    /** when set to a truthy value, validates the variable names */
    readonly validateVarNames?: boolean;
}
/**
 * The callback for resolving a value (synchronous)
 * @param scope the scope object that was passed to .render() function
 * @param path variable name before being parsed.
 * @example a template that is `Hi {{a.b.c}}!` leads to `'a.b.c'` as path
 * @returns the value to be interpolated.
 */
export declare type ResolveFn = (varName: string, scope?: Scope) => any;
/**
 * Same as `ResolveFn` but for asynchronous functions
 */
export declare type ResolveFnAsync = (varName: string, scope?: Scope) => Promise<any>;
/**
 * This class does the heavy lifting of interpolation (putting the actual values
 * in the template).
 * This is created by the `.compile()` method and is used under the hood by
 * `.render()`, `renderFn()` and `renderFnAsync()` functions.
 */
export declare class Renderer {
    private readonly tokens;
    private readonly options;
    /**
     * Another cache that holds the parsed values for `toPath()` one per varName
     */
    private toPathCache;
    /**
     * Creates a new Renderer instance. This is called internally by the compiler.
     * @param tokens - the result of the `.tokenize()` function
     * @param options - some options for customizing the rendering process
     * @throws `TypeError` if the token is invalid
     */
    constructor(tokens: ITokens, options?: IRendererOptions);
    /**
     * This function is called internally for filling in the `toPathCache` cache.
     * If the `validateVarNames` option for the constructor is set to a truthy
     * value, this function is called immediately which leads to a validation as
     * well because it throws an error if it cannot parse variable names.
     */
    private cacheParsedPaths;
    /**
     * Replaces every {{varName}} inside the template with values from the scope
     * parameter.
     *
     * @param template The template containing one or more {{varName}} as
     * placeholders for values from the `scope` parameter.
     * @param scope An object containing values for variable names from the the
     * template. If it's omitted, we default to an empty object.
     */
    render: (scope?: Scope) => string;
    /**
     * Same as [[render]] but accepts a resolver function which will be
     * responsible for returning a value for every varName.
     */
    renderFn: (resolveFn: ResolveFn, scope?: Scope) => string;
    /**
     * Same as [[render]] but accepts a resolver function which will be responsible
     * for returning promise that resolves to a value for every varName.
     */
    renderFnAsync: (resolveFnAsync: ResolveFnAsync, scope?: Scope) => Promise<string>;
    private resolveVarNames;
    /**
     * Puts the resolved `values` into the rest of the template (`strings`) and
     * returns the final result that'll be returned from `render()`, `renderFn()`
     * and `renderFnAsync()` functions.
     */
    private stringify;
}

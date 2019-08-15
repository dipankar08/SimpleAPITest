import { PropNames } from './topath';
export declare type Scope = {} | Function;
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
export declare function get(scope: Scope, varNameOrPropNames: PropNames | string, propExists?: boolean): any;

export interface ITokens {
    /** An array of constant strings */
    readonly strings: string[];
    /** An array of variable names */
    readonly varNames: string[];
}
/**
 * An array of two strings specifying the opening and closing tags that mark
 * the start and end of a variable name in the template.
 * It defaults to `['{{', '}}']`
 */
export declare type TokenizeOptions = [string, string];
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
export declare function tokenize(template: string, options?: TokenizeOptions): ITokens;

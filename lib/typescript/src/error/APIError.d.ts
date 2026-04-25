/**
 * Custom error type for API errors.
 * Used to throw exceptions with an error code at the API layer and can be caught via try/catch.
 */
export declare class APIError extends Error {
    code: number;
    /**
     * Creates an APIError.
     * @param code Error code.
     * @param message Error message.
     * @param cause Optional cause for error chaining/diagnostics.
     */
    constructor(code: number, message: string, cause?: unknown);
    /**
     * Serializes the error into a transferable object.
     * @returns An object containing code and message.
     */
    toJSON(): {
        code: number;
        message: string;
    };
    /**
     * Type guard: checks whether the given value is an APIError.
     * @param err Any value.
     * @returns Whether the value is an APIError.
     */
    static isAPIError(err: unknown): err is APIError;
}
export default APIError;
//# sourceMappingURL=APIError.d.ts.map
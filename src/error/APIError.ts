/**
 * Custom error type for API errors.
 * Used to throw exceptions with an error code at the API layer and can be caught via try/catch.
 */
export class APIError extends Error {
  public code: number;

  /**
   * Creates an APIError.
   * @param code Error code.
   * @param message Error message.
   * @param cause Optional cause for error chaining/diagnostics.
   */
  constructor(code: number, message: string, cause?: unknown) {
    super(message);
    this.name = 'APIError';
    this.code = code;

    // Assign cause explicitly for compatibility.
    (this as any).cause = cause;

    // Fix the prototype chain so instanceof works correctly.
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (in supported runtimes).
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, APIError);
    }
  }

  /**
   * Serializes the error into a transferable object.
   * @returns An object containing code and message.
   */
  toJSON(): { code: number; message: string } {
    return { code: this.code, message: this.message };
  }

  /**
   * Type guard: checks whether the given value is an APIError.
   * @param err Any value.
   * @returns Whether the value is an APIError.
   */
  static isAPIError(err: unknown): err is APIError {
    return (
      err instanceof APIError ||
      (typeof err === 'object' && err !== null && 'code' in (err as any) && 'message' in (err as any))
    );
  }
}

export default APIError;

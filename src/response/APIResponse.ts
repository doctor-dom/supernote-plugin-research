export interface APIResponseError {
  // Error code
  code: number;
  // Error message
  message: string;
}

export class APIResponse<T = any> {
  // Whether the API call succeeded
  public success: boolean = true;
  // API result. Present only when success is true; otherwise result is null and error is set.
  public result: T | null = null;
  // API error. Present only when success is false; otherwise error is null.
  public error: APIResponseError | null = null;

  constructor(result?: T | null, success: boolean = true) {
    this.result = result || null;
    this.success = success;
  }

  // Creates a successful response.
  static success<T>(result: T): APIResponse<T> {
    return new APIResponse<T>(result, true);
  }

  // Creates a failed response.
  static error<T>(error: APIResponseError): APIResponse<T> {
    const response = new APIResponse<T>(null, false);
    response.error = error;
    return response;
  }

  // Returns the result in a type-safe way.
  getResult(): T | null {
    return this.result;
  }

  // Checks whether the response succeeded and has a non-null result.
  hasResult(): this is APIResponse<T> & { result: T } {
    return this.success && this.result !== null;
  }
}

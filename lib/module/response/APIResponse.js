"use strict";

export class APIResponse {
  // Whether the API call succeeded
  success = true;
  // API result. Present only when success is true; otherwise result is null and error is set.
  result = null;
  // API error. Present only when success is false; otherwise error is null.
  error = null;
  constructor(result, success = true) {
    this.result = result || null;
    this.success = success;
  }

  // Creates a successful response.
  static success(result) {
    return new APIResponse(result, true);
  }

  // Creates a failed response.
  static error(error) {
    const response = new APIResponse(null, false);
    response.error = error;
    return response;
  }

  // Returns the result in a type-safe way.
  getResult() {
    return this.result;
  }

  // Checks whether the response succeeded and has a non-null result.
  hasResult() {
    return this.success && this.result !== null;
  }
}
//# sourceMappingURL=APIResponse.js.map
export interface APIResponseError {
    code: number;
    message: string;
}
export declare class APIResponse<T = any> {
    success: boolean;
    result: T | null;
    error: APIResponseError | null;
    constructor(result?: T | null, success?: boolean);
    static success<T>(result: T): APIResponse<T>;
    static error<T>(error: APIResponseError): APIResponse<T>;
    getResult(): T | null;
    hasResult(): this is APIResponse<T> & {
        result: T;
    };
}
//# sourceMappingURL=APIResponse.d.ts.map
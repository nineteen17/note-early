export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        // Ensure the prototype chain is correct for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

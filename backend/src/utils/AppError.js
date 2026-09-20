'use strict';

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {object} [properties]
   */
  constructor(message, statusCode = 500, properties = {}) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;

    this.code = properties.code || null;
    this.details = properties.details || null;
    this.field = properties.field || null;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        field: this.field,
        details: this.details,
      },
    };
  }
}

module.exports = AppError;

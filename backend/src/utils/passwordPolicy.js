'use strict';

const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH) || 8;
const MAX_LENGTH = Number(process.env.PASSWORD_MAX_LENGTH) || 128;
const REQUIRE_UPPERCASE = process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false';
const REQUIRE_LOWERCASE = process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false';
const REQUIRE_DIGIT = process.env.PASSWORD_REQUIRE_DIGIT !== 'false';
const REQUIRE_SPECIAL = process.env.PASSWORD_REQUIRE_SPECIAL !== 'false';
const NO_WHITESPACE = process.env.PASSWORD_NO_WHITESPACE !== 'false';

const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /[0-9]/;
const SPECIAL = /[^A-Za-z0-9]/;
const SPACE = /\s/;

function validate(password) {
  if (typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password must be a string'],
    };
  }

  const errors = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be at most ${MAX_LENGTH} characters`);
  }

  if (REQUIRE_UPPERCASE && !UPPER.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (REQUIRE_LOWERCASE && !LOWER.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (REQUIRE_DIGIT && !DIGIT.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (REQUIRE_SPECIAL && !SPECIAL.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (NO_WHITESPACE && SPACE.test(password)) {
    errors.push('Password must not contain whitespace');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function strength(password) {
  const result = validate(password);
  if (!result.valid) {
    return 'weak';
  }

  let score = 0;

  if (password.length >= 12) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  if (UPPER.test(password) && LOWER.test(password)) {
    score += 1;
  }

  if (DIGIT.test(password) && SPECIAL.test(password)) {
    score += 1;
  }

  if (score >= 3) {
    return 'strong';
  }

  if (score >= 1) {
    return 'moderate';
  }

  return 'weak';
}

module.exports = {
  validate,
  strength,
  MIN_LENGTH,
  MAX_LENGTH,
  REQUIRE_UPPERCASE,
  REQUIRE_LOWERCASE,
  REQUIRE_DIGIT,
  REQUIRE_SPECIAL,
  NO_WHITESPACE,
};

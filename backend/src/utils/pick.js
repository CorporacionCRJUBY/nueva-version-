'use strict';

/**
 * Pick enumerable own properties from `obj` by key list.
 *
 * This is a small compatibility helper so internal services can share a single
 * pick implementation. If the project later depends on lodash, this module can
 * be replaced with it.
 */

function pick(obj, keys) {
  if (obj == null) {
    return {};
  }

  const result = {};
  const safeKeys = Array.isArray(keys) ? keys : [];

  safeKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  });

  return result;
}

function omit(obj, keys) {
  if (obj == null) {
    return {};
  }

  const result = {};
  const omitSet = new Set(Array.isArray(keys) ? keys : []);

  Object.keys(obj).forEach((key) => {
    if (!omitSet.has(key)) {
      result[key] = obj[key];
    }
  });

  return result;
}

module.exports = {
  pick,
  omit,
};

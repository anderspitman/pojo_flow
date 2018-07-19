function objectDiff(a, b, path) {

  if (a === b) {
    return null;
  }

  let diffs = [];

  const typeA = typeof a;
  const typeB = typeof b;

  if (isPrimitiveType(typeA) && isPrimitiveType(typeB)) {
    diffs.push({
      type: 'change',
      path,
      value: b,
    });
  }

  for (let key in a) {

    const newPath = path.concat(key);

    if (b[key] !== undefined) {
      const subDiffs = objectDiff(a[key], b[key], newPath);

      if (subDiffs !== null) {
        diffs = diffs.concat(subDiffs);
      }
    }
    else {
      diffs.push({
        type: 'delete',
        path: newPath,
      });
    }
  }

  // TODO: this can be much more efficient by calculated the intersection and
  // union of the sets of keys between a and b
  for (let key in b) {
    const newPath = path.concat(key);

    if (a[key] === undefined) {
      diffs.push({
        type: 'add',
        path: newPath,
        value: b[key],
      });
    }
  }

  return diffs;
}

function isPrimitiveType(valueType) {
  return valueType === 'number' ||
    valueType === 'string' ||
    valueType === 'boolean';
}


module.exports = {
  objectDiff,
};

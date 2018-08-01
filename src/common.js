(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.common = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  function applyUpdate(update, obj, parent, parentKey) {

    for (let key in update) {
      if (obj[key] === '$D') {
        obj[key] = update[key];
      }
      // TODO: wat: typeof null === 'object'??
      else if (typeof update[key] !== 'object' || update[key] === null) {

        if (update[key] === '$D') {
          if (obj instanceof Array) {
            // mark element for deletion. Can't delete it here because it
            // might shift other elements that need to be modified/deleted.
            obj[key] = '$D';
          }
          else {
            delete obj[key];
            //obj[key] = '$D';
          }

          // TODO: re-enable parent removal
          // if this object is now empty from the previous removal, remove it
          // from its parent
          //if (parent !== undefined && parentKey !== undefined) {
          //  if (Object.keys(obj).length === 0) {
          //    //if (parent instanceof Array) {
          //    //  throw "I think this is needed but currently untested";
          //    //  parent.splice(parentKey, 1);
          //    //}
          //    //else {
          //      delete parent[parentKey];
          //    //}
          //  }
          //}
        }
        else {
          obj[key] = update[key];
        }
      }
      else {
        if (obj[key] === undefined || obj[key] === null) {
          if (update[key] instanceof Array) {
            obj[key] = [];
          }
          else {
            obj[key] = {};
          }
        }
        applyUpdate(update[key], obj[key], obj, key);
      }
    }

    // if obj is an array, remove all elements that were marked for deletion
    // above. Go in reverse order because we're modifying it in-place and
    // don't want to shift anything as we go through.
    if (obj instanceof Array) {
      for (let i = obj.length - 1; i >= 0; i--) {
        if (obj[i] === '$D') {
          obj.splice(i, 1);
        }
      }
    }

    return obj;
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  return {
    applyUpdate,
    deepCopy,
  };

}));

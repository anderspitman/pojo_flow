function applyUpdate(update, obj, parent, parentKey) {
  //console.log(update, obj);

  for (let key in update) {
    // TODO: wat: typeof null === 'object'??
    if (typeof update[key] !== 'object' || update[key] === null) {

      if (update[key] === null) {
        if (obj instanceof Array) {
          obj.splice(key, 1);
        }
        else {
          delete obj[key];
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
      if (obj[key] === undefined) {
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

  return obj;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  applyUpdate,
  deepCopy,
};

const WebSocket = require('ws');

const deepDiff = require('deep-diff');

let i = 0;

class PojoFlowServer {
  constructor() {
    this._wss = new WebSocket.Server({
      port: 10000,
    });

    this._wss.on('connection', this._onNewClient.bind(this));

    this._prevData = {};
    this._clients = {};
  }

  onNewClient(callback) {
    this._onNewClientCallback = callback;
  }

  onMessage(callback) {
    this._onMessageCallback = callback;
  }

  update(newData) {

    const diff = deepDiff(this._prevData, newData, []);
    const updateList = buildUpdateList(diff);
    const update = buildUpdate(diff);
    const updateSchema = buildUpdateSchema(this._prevData, newData);
    
    if (i % 10 === 0) {
      printObj(update);
      printObj(updateSchema);
      console.log(
        JSON.stringify(newData).length,
        JSON.stringify(diff).length,
        JSON.stringify(updateList).length,
        JSON.stringify(update).length,
        JSON.stringify(updateSchema).length,
      );
    }
    i++;

    this._wss.clients.forEach(function(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newData));
      }
    });

    this._prevData = deepCopy(newData);
  }

  _onNewClient(ws) {

    if (this._onNewClientCallback) {
      this._onNewClientCallback();
    }
  }
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildUpdateList(diff) {

  const updateList = [];

  for (let change of diff) {
    switch(change.kind) {
      case 'E':
        updateList.push({
          t: 'E',
          p: change.path,
          v: change.rhs,
        });
        break;
      case 'D':
        updateList.push({
          t: 'D',
          p: change.path,
        });
        break;
      case 'A':
        updateList.push({
          t: 'A',
          p: change.path,
          i: change.index,
          // TODO: account for nested rhs
          v: change.item,
        });
        break;
      case 'N':
        updateList.push({
          t: 'N',
          p: change.path,
          v: change.rhs,
        });
        break;
      default:
        throw "Invalid change kind " + change.kind;
        break;
    }
  }

  return updateList;
}

function buildDiffUpdate(a, b) {
  const diff = deepDiff(a, b);
  return buildUpdate(diff);
}

function buildUpdate(diff, parentPath) {
  const update = {};

  for (let change of diff) {

    let path;
    if (change.path !== undefined) {
      path = change.path;
    }
    else if (parentPath !== undefined ) {
      path = parentPath;
    }
    else {
      throw "Invalid path";
    }

    switch(change.kind) {
      case 'E':
        setValue(update, path, change.rhs);
        break;
      case 'D':
        setValue(update, path, null);
        break;
      case 'A':
        const subChange = buildUpdate([change.item], [change.index]);

        //printObj(subChange);
        setValue(update, path, subChange);
        break;
      case 'N':
        setValue(update, path, change.rhs);
        break;
      default:
        throw "Invalid change kind " + change.kind;
        break;
    }
  }

  return update;
}

function buildUpdateSchema(a, b) {

  const path = [];
  const update = {};

  return buildUpdateSchemaIter(a, b, update, path);
}

function buildUpdateSchemaIter(a, b, update, path) {

  //console.log(a, b, update, path);

  for (let key in b) {

    const newPath = path.concat(key);

    if (a[key] === undefined) {
      update[key] = b[key];
    }
    else {
      if (b[key] instanceof Array || b[key] instanceof Object) {
        const subUpdate = buildUpdateSchema(a[key], b[key], update, newPath);

        // check if empty
        if (Object.keys(subUpdate).length > 0) {
          update[key] = subUpdate;
        }
      }
      else {
        if (b[key] !== a[key]) {
          update[key] = b[key];
        }
      }
    }
  }

  // TODO: this can maybe be more efficient by calculating the intersection
  // and union of the sets of keys between a and b
  for (let key in a) {
    const newPath = path.concat(key);

    if (b[key] === undefined) {
      update[key] = null;
    }
  }

  return update;
}

function isPrimitiveType(valueType) {
  return valueType === 'number' ||
    valueType === 'string' ||
    valueType === 'boolean';
}

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

function setValue(obj, path, value) {
  const key = path[0];

  if (path.length === 1) {
    obj[key] = value;
    return;
  }

  if (obj[key] === undefined) {
    obj[key] = {};
  }

  setValue(obj[key], path.slice(1), value);
}

function setArrayValue(obj, path, value) {
}

function printObj(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

module.exports = {
  PojoFlowServer,
  buildUpdate,
  buildDiffUpdate,
  applyUpdate,
  buildUpdateSchema,
};

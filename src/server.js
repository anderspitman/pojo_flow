const WebSocket = require('ws');

const { applyUpdate, deepCopy } = require('./common');
const { compressToUint8Array } = require('lz-string');
const fs = require('fs');
const stringify = require('json-stable-stringify');

class PojoFlowServer {
  constructor() {
    this._wss = new WebSocket.Server({
      port: 10000,
    });

    this._wss.on('connection', this._onNewClient.bind(this));

    this._prevData = {};
    this._clients = {};
    this._nextClientId = 0;
  }

  onNewClient(callback) {
    this._onNewClientCallback = callback;
  }

  onMessage(callback) {
    this._onMessageCallback = callback;
  }

  update(newData) {

    const updateSchema = buildUpdateSchema(this._prevData, newData);
    const oldCopy = deepCopy(this._prevData);
    const newCopy = deepCopy(newData);
    const verifyUpdate = applyUpdate(updateSchema, oldCopy);
    const diff = deepDiff(newCopy, verifyUpdate);

    const fullLen = JSON.stringify(newData).length;
    const deltaLen = JSON.stringify(updateSchema).length;
    console.log(`Full: ${fullLen}, Delta: ${deltaLen}`);

    if (diff) {
      dumpObj(this._prevData, 'prevData.json');
      dumpObj(newData, 'newData.json');
      dumpObj(updateSchema, 'updateSchema.json');
      dumpObj(verifyUpdate, 'verifyUpdate.json');
      dumpObj(diff, 'diff.json');
      throw "Update failed to construct same state";
    }

    this._wss.clients.forEach((client) => {

      if (client.readyState === WebSocket.OPEN) {

        let data;
        if (this._clients[client._pjfClientId].needsFullState) {
          data = newData;
          this._clients[client._pjfClientId].needsFullState = false;
        }
        else {
          data = updateSchema;
        }

        const message = JSON.stringify(data);
        const compressed = compressToUint8Array(message);
        client.send(compressed);
        //client.send(message);
      }
    });

    this._prevData = deepCopy(newData);
  }

  _onNewClient(ws) {

    ws._pjfClientId = this._nextClientId;
    this._nextClientId++;

    this._clients[ws._pjfClientId] = {
      websocket: ws,
      needsFullState: true,
    };

    ws.onclose = () => {
      delete this._clients[ws._pjfClientId];
    };

    if (this._onNewClientCallback) {
      this._onNewClientCallback();
    }
  }
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

    if (a[key] === undefined || a[key] === null) {
      update[key] = b[key];
    }
    else {
      if (b[key] instanceof Array || b[key] instanceof Object) {
        // TODO: shouldn't this be buildUpdateSchemaIter?
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
      //update[key] = null;
      // TODO: is this correct?
      update[key] = '$D';
    }
  }

  return update;
}

function dumpObj(obj, filepath) {
  const str = JSON.stringify(obj, null, 2);
  fs.writeFileSync(filepath, str);  
}

function printObj(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function verifyDiff(diff) {
  if (diff !== undefined) {
    for (let d of diff) {
      if (d.kind === 'A') {
        if (d.item.rhs !== '$D') {
          return false;
        }
      }
      else {
        return false;
      }
    }
  }
  return true;
}

function deepDiff(a, b) {
  return !(stringify(a) === stringify(b));
}

module.exports = {
  PojoFlowServer,
  buildUpdateSchema,
};

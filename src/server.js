const WebSocket = require('ws');

const { deepCopy } = require('./common');
const { compressToUint8Array } = require('lz-string');


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
    
    this._wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        let data;
        if (this._clients[client._pjfClientId].needsFullState) {
          data = newData;
          this._clients[client._pjfClientId].needsFullState = false;
        }
        else {
          const updateSchema = buildUpdateSchema(this._prevData, newData);
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

function printObj(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

module.exports = {
  PojoFlowServer,
  buildUpdateSchema,
};

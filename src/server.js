const WebSocket = require('ws');

const deepDiff = require('deep-diff');

//let i = 0;

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

    
    //if (i % 100 === 0) {
    //  console.log(JSON.stringify(update, null, 2));
    //  console.log(
    //    JSON.stringify(newData).length,
    //    JSON.stringify(diff).length,
    //    JSON.stringify(updateList).length,
    //    JSON.stringify(update).length,
    //  );
    //}
    //i++;

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
          p: change.path,
          v: change.rhs,
        });
        break;
      case 'D':
        break;
      case 'A':
        updateList.push({
          p: change.path,
          i: change.index,
          // TODO: account for nested rhs
          v: change.item,
        });
        break;
      default:
        throw "Invalid change kind " + change.kind;
        break;
    }
  }

  return updateList;
}

function buildUpdate(diff) {
  const update = {};

  for (let change of diff) {
    //console.log(change);
    switch(change.kind) {
      case 'E':
        if (change.path) {
          setValue(update, change.path, change.rhs);
        }
        break;
      case 'D':
        //console.log(JSON.stringify(change, null, 2));
        break;
      case 'A':
        //console.log(JSON.stringify(change, null, 2));
        setValue(update, change.path, buildUpdate([change.item]));
        break;
      case 'N':
        break;
      default:
        throw "Invalid change kind " + change.kind;
        break;
    }
  }

  return update;
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

module.exports = {
  PojoFlowServer,
};

const { applyUpdate } = require('./common');
const { deepCopy } = require('./common');
const { decompressFromUint8Array } = require('lz-string');

class PojoFlowClient {
  constructor(options = {}) {

    let hostname;
    if (options.host !== undefined) {
      hostname = options.host;
    }
    else {
      hostname = window.location.hostname;
    }

    let websocketPort;
    if (options.port !== undefined) {
      websocketPort = options.port;
    }
    else {
      websocketPort = 10000;
    }
    const websocketString = "ws://" + hostname + ":" + websocketPort;

    this._ws = new WebSocket(websocketString);
    this._ws.binaryType = 'arraybuffer';
    this._ws.onmessage = this._onMessage.bind(this);

    this._prevData = {};
  }

  waitForFirstUpdate() {

    const self = this;

    return new Promise(function(resolve, reject) {
      self._ws.onopen = function() {
        self._ws.onmessage = function(message) {
          self._onMessage(message);

          self._ws.onmessage = self._onMessage.bind(self);
          resolve();
        }
      };
    });
  }

  onUpdate(callback) {
    this._onUpdateCallback = callback;
  }

  _onMessage(message) {
    if (this._onUpdateCallback !== undefined) {
      const data = new Uint8Array(message.data);
      const decompressed = decompressFromUint8Array(data);
      const update = JSON.parse(decompressed);
      //const update = JSON.parse(message.data);
      const newData = applyUpdate(update, this._prevData);
      this._onUpdateCallback(newData);

      this._prevData = deepCopy(newData);
    }
  }
}

module.exports = {
  PojoFlowClient,
};

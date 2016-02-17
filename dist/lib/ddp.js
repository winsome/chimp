'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = require('./log'),
    URL = require('url'),
    DDPClient = require('xolvio-ddp'),
    booleanHelper = require('./boolean-helper'),
    wrapAsyncObject = require('xolvio-sync-webdriverio').wrapAsyncObject;

/**
 * DDP Constructor
 *
 * @api public
 */
function DDP(options) {
  this.options = _lodash2.default.defaults({}, options, {
    ddp: null,
    sync: true
  });
  log.debug('[chimp][ddp] creating DDP wrapper');
  this.url = this._getUrl(this.options.ddp);
}

DDP.prototype.connect = function () {
  var options = this._getOptions();
  log.debug('[chimp][ddp] Connecting to DDP server', options);
  return wrapAsyncObject(new DDPClient(options), ['connect', 'call', 'apply', 'callWithRandomSeed', 'subscribe'], { syncByDefault: booleanHelper.isTruthy(this.options.sync) });
};

DDP.prototype._getUrl = function (ddpHost) {
  if (ddpHost.indexOf('http://') === -1 && ddpHost.indexOf('https://') === -1) {
    throw new Error('[chimp][ddp] DDP url must contain the protocol');
  }
  return URL.parse(ddpHost);
};

DDP.prototype._getOptions = function () {
  return {
    host: this.url.hostname,
    port: this.url.port,
    ssl: this.url.protocol === 'https:',
    // TODO extract all options
    autoReconnect: true,
    autoReconnectTimer: 500,
    maintainCollections: true,
    ddpVersion: '1',
    useSockJs: true
    //path: "websocket"
  };
};

module.exports = DDP;
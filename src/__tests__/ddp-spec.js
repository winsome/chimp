jest.dontMock('../lib/ddp.js');

describe('DDP Wrapper', function () {
  var DDP = require('../lib/ddp');
  describe('constructor', function () {
    it('throws an error if http or https are not passed', function () {
      var thrower = function () {
        new DDP({ddp: 'blah.com'});
      };
      expect(thrower).toThrowError('[chimp][ddp] DDP url must contain the protocol');
    });
    it('parses the DDP host', function () {
      var ddp = new DDP({ddp: 'http://here.com:3000'});
      expect(ddp.url.host).toEqual('here.com:3000');
    });
  });
  describe('connect', function () {
    it('returns an async-wrapped DDPClient', function () {
      // TODO check that the DDPClient return value is passed to wrapAsyncObject
      // and that the connect', 'call', 'apply', 'callWithRandomSeed', 'subscribe' methods are passed in
    });
    it('does not set sync-by-default when chimp.sync is false', function () {
      // TODO
    });
  });
  describe('_getOptions', function () {
    it('sets the port and hostname using the instance url object', function () {
      var ddp = new DDP({ddp: 'http://the.host:3130'});
      var options = ddp._getOptions();
      expect(options.host).toEqual('the.host');
      expect(options.port).toEqual('3130');
    });
    it('sets the ssl to false when the protocol is http', function () {
      var ddp = new DDP({ddp: 'http://the.host:3130'});
      var options = ddp._getOptions();
      expect(options.ssl).toEqual(false);
    });
    it('sets the ssl to true when the protocol is https', function () {
      var ddp = new DDP({ddp: 'https://the.host:3130'});
      var options = ddp._getOptions();
      expect(options.ssl).toEqual(true);
    });
  });
});

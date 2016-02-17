var chimpHelper = require('../chimp-helper');
var exit = require('exit');
var log = require('../log');

before(function () {
  const chimp = global.chimp;
  chimp.options.chai = true;
  process.env['chimp.chai'] = true;
  chimpHelper.loadAssertionLibrary(chimp);
  chimpHelper.init(chimp);
  chimpHelper.setupBrowserAndDDP(chimp);
});

after(function () {
  if (process.env['chimp.browser'] !== 'phantomjs') {
    log.debug('[chimp][mocha-helper] Ending browser session');
    wrapAsync(global.sessionManager.killCurrentSession, global.sessionManager)();
    log.debug('[chimp][mocha-helper] Ended browser sessions');
  }
});

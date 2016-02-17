'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    log = require('./log'),
    DDP = require('./ddp'),
    request = require('request'),
    Promise = require('bluebird'),
    _ = require('underscore'),
    wrapAsync = require('xolvio-sync-webdriverio').wrapAsync,
    wrapAsyncObject = require('xolvio-sync-webdriverio').wrapAsyncObject,
    SessionFactory = require('./session-factory'),
    widgets = require('chimp-widgets'),
    path = require('path'),
    colors = require('colors'),
    fs = require('fs-extra'),
    exit = require('exit'),
    booleanHelper = require('./boolean-helper');

var chimpHelper = {
  loadAssertionLibrary: function loadAssertionLibrary(chimp) {
    var options = chimp.options;
    if (booleanHelper.isTruthy(options.chai)) {
      log.debug('[chimp][helper] Using the chai-expect assertion library');
      chai.use(chaiAsPromised);
      chai.should();
      // give users access to the chai instance
      global.chai = chai;
      global.expect = chai.expect;
      global.assert = chai.assert;
    } else {
      log.debug('[chimp][helper] Using the jasmine-expect assertion library');
      global.expect = require('xolvio-jasmine-expect').expect;
    }
  },
  setupGlobals: function setupGlobals(chimp) {
    global.wrapAsync = wrapAsync;
    global.wrapAsyncObject = wrapAsyncObject;

    // give users access the request module
    global.request = request;
    _.extend(global, wrapAsyncObject(global, ['request'], {
      syncByDefault: booleanHelper.isTruthy(chimp.sync)
    }));

    // Give the user access to Promise functions. E.g. Promise.all.
    global.Promise = Promise;

    if (booleanHelper.isTruthy(chimp.ddp)) {
      global.ddp = new DDP(_.pick(chimp.options, 'ddp', 'sync')).connect();
      if (!process.env.ROOT_URL) {
        process.env.ROOT_URL = chimp.options.ddp;
      }
    }
  },
  configureWidgets: function configureWidgets() {
    // CHIMP WIDGETS
    global.chimpWidgets = widgets;
  },
  createGlobalAliases: function createGlobalAliases() {
    global.driver = global.browser;
    global.client = global.browser;
    global.mirror = global.ddp;
    global.server = global.ddp;
  },
  setupBrowserAndDDP: function setupBrowserAndDDP(chimp) {
    var options = chimp.options;
    var setupBrowser = function setupBrowser() {
      log.debug('[chimp][helper] getting browser');
      var customChimpConfigPath = path.resolve(process.cwd(), options.path, 'chimp.js');

      var _translateLogLevel = function _translateLogLevel() {
        if (booleanHelper.isTruthy(options.webdriverLogLevel)) {
          return options.webdriverLogLevel;
        } else if (options.log === 'info' || options.log === 'warn' || options.log === 'error') {
          return 'silent';
        } else {
          return options.log;
        }
      };

      global.sessionManager = new SessionFactory(_.pick(options, 'host', 'port', 'user', 'key', 'browser', 'deviceName'));

      if (fs.existsSync(customChimpConfigPath)) {
        var customChimpConfigurator = wrapAsync(require(customChimpConfigPath));
        global.browser = customChimpConfigurator(global.sessionManager);
      } else {
        log.debug('[chimp][helper] custom chimp.js not found, loading defaults');
        var webdriverOptions = {
          waitforTimeout: parseInt(options.waitForTimeout, 10),
          timeoutsImplicitWait: parseInt(options.timeoutsImplicitWait, 10),
          desiredCapabilities: {
            browserName: options.browser,
            platform: options.platform,
            name: options.name,
            version: options.version
          },
          user: options.user || process.env.SAUCE_USERNAME,
          key: options.key || process.env.SAUCE_ACCESS_KEY,
          host: options.host,
          port: options.port,
          logLevel: _translateLogLevel(),
          screenshotPath: options.screenshotPath,
          sync: booleanHelper.isTruthy(options.sync)
        };

        webdriverOptions.desiredCapabilities.chromeOptions = webdriverOptions.desiredCapabilities.chromeOptions || {};
        if (booleanHelper.isTruthy(options.chromeBin)) {
          webdriverOptions.desiredCapabilities.chromeOptions.binary = options.chromeBin;
        }
        if (booleanHelper.isTruthy(options.chromeArgs)) {
          webdriverOptions.desiredCapabilities.chromeOptions.args = options.chromeArgs.split(',');
        } else if (booleanHelper.isTruthy(options.chromeNoSandbox)) {
          webdriverOptions.desiredCapabilities.chromeOptions.args = ['no-sandbox'];
        }

        if (booleanHelper.isTruthy(options.baseUrl)) {
          webdriverOptions.baseUrl = options.baseUrl;
        }
        if (options.watch) {
          webdriverOptions.desiredCapabilities.applicationCacheEnabled = false;
        }
        webdriverOptions.desiredCapabilities['tunnelIdentifier'] = options.tunnelIdentifier;
        webdriverOptions.desiredCapabilities['browserstack.local'] = options.browserstackLocal;

        log.debug('[chimp][helper] webdriverOptions are ', (0, _stringify2.default)(webdriverOptions));

        var remoteSession = wrapAsync(global.sessionManager.remote, global.sessionManager);
        global.browser = remoteSession(webdriverOptions);
      }

      chaiAsPromised.transferPromiseness = global.browser.transferPromiseness;
    };

    var initBrowser = function initBrowser() {
      log.debug('[chimp][helper] init browser');
      var browser = global.browser;
      browser.initSync();
      log.debug('[chimp][helper] init browser callback');

      browser.screenshotsCount = 0;
      browser.addCommand('capture', function (name) {
        name = name.replace(/[ \\~#%&*{}/:<>?|"-]/g, '_');
        var location = browser.screenshotsCount++ + '_' + name + '.png';
        fs.mkdirsSync(options.screenshotsPath);
        var ssPath = path.join(options.screenshotsPath, location);
        log.debug('[chimp][helper] saving screenshot to', ssPath);
        this.saveScreenshot(ssPath, false);
        log.debug('[chimp][helper] saved screenshot to', ssPath);
      });

      browser.timeoutsAsyncScriptSync(parseInt(options.timeoutsAsyncScript));
      log.debug('[chimp][helper] set timeoutsAsyncScript');

      if (options.browser === 'phantomjs') {
        browser.setViewportSizeSync({
          width: options.phantom_w ? parseInt(options.phantom_w, 10) : 1280,
          height: options.phantom_h ? parseInt(options.phantom_h, 10) : 1024
        });
      }
    };

    var addServerExecute = function addServerExecute() {
      global.ddp.execute = function (func) {
        var args = Array.prototype.slice.call(arguments, 1);
        var result;
        try {
          result = server.call('xolvio/backdoor', func.toString(), args);
        } catch (exception) {
          if (exception.error === 404) {
            throw new Error('[chimp] You need to install xolvio:backdoor in your meteor app before you can use server.execute()');
          } else {
            throw exception;
          }
        }
        if (result.error) {
          var error = new Error('Error in server.execute' + result.error.message);
          error.stack += '\n' + result.error.stack.replace(/ {4}at/g, '  @');
          throw error;
        } else {
          return result.value;
        }
      };
    };

    var setupDdp = function setupDdp() {
      log.debug('[chimp][helper] setup DDP');
      if (options.ddp) {
        log.debug('[chimp][helper] connecting via DDP to', options.ddp);
        try {
          global.ddp.connectSync();
          addServerExecute();
          log.debug('[chimp][helper] connecting via DDP had no error');
        } catch (error) {
          log.error('[chimp][helper] connecting via DDP error', error);
        }
      } else {
        var noDdp = function noDdp() {
          expect('DDP Not Connected').to.equal('', 'You tried to use a DDP connection but it' + ' has not been configured. Be sure to pass --ddp=<host>');
        };
        global.ddp = {
          call: noDdp,
          apply: noDdp,
          execute: noDdp
        };
        log.debug('[chimp][helper] DDP not required');
      }
    };

    var configureChimpWidgetsDriver = function configureChimpWidgetsDriver() {
      widgets.driver.api = global.browser;
    };

    try {
      setupBrowser();
      initBrowser();
      if (booleanHelper.isTruthy(options.ddp)) {
        setupDdp();
      }
      configureChimpWidgetsDriver();
    } catch (error) {
      log.error('[chimp][helper] setupBrowserAndDDP had error');
      log.error(error);
      log.error(error.stack);
      exit(2);
    }
  },
  init: function init(chimp) {
    this.configureWidgets(chimp);
    this.setupGlobals(chimp);
    this.createGlobalAliases(chimp);
  }
};

global.chimpHelper = chimpHelper;
module.exports = chimpHelper;
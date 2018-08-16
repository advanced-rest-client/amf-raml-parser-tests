const fs = require('fs-extra');
const {AmfJsParserTestRunner} = require('./lib/runner');
const colors = require('colors/safe');
const path = require('path');
// const apis = [
//   ['test/raml-example-api/api.raml', 'RAML 1.0'],
//   ['test/exchange-experience-api/exchange-experience-api.raml', 'RAML 0.8']
// ];

const blacklist = [
  // APIS causing RAML JS parser to fail
  'digital-clinician-services---practitioner-management-api-1.0.0-fat-raml.zip',
  'experience-mobile-api-2.0.0-fat-raml.zip',
  'digital-clinician-services---pathology-processing-api-1.0.0-fat-raml.zip',
  'da_fernandez-omni-channel-experienc-1.0.0-fat-raml.zip',
  'digital-clinician-services---pathology-catalogues-api-2.0.0-fat-raml.zip',
  'omani-api-1.0.0-fat-raml.zip',
  'digital-clinician-services---pathology-orders-api-1.0.0-fat-raml.zip',
  'omnichannel-experience-api-1.0.0-fat-raml.zip',
  'sf-omni-channel-experience-api-1.0.0-fat-raml.zip',
  'ppandya-omni-channel-experience-api-1.0.0-fat-raml.zip',
  // APIS causing AMF parser to fail
  'zuora-api-1.0.0-fat-raml.zip',
  'twitter-demo-tuesday-1.0.0-fat-raml.zip',
  'ds-domainproxy-5.0.0-fat-raml.zip',
  '1182-1.0.0-fat-raml.zip'
];

process.on('uncaughtException', (err) => {
  console.error('uncaughtException,uncaughtException,uncaughtException');
  console.error(err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('unhandledRejection,unhandledRejection,unhandledRejection');
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

/**
 * APIs with AMF helper issues
 */
const amfHelperIssues = [
  'covea-customers-web-x-api-1.0.1-fat-raml.zip',
  'eventedapi_persistence-1.0.0-fat-raml.zip'
];


/**
 * Initializes and runs the tests in sequence.
 */
class RamlAmfParsersTest {
  /**
   * @constructor
   */
  constructor() {
    this.reports = [];
    /**
     * Size pf the samle in %.
     * @type {Number}
     */
    this.samleSize = 10;
    /**
     * A path to the floder where the apis are
     * @type {String}
     */
    this.apisDir = 'apis';
    /**
     * It will ask questions if cannot find entry point to the api if this
     * is true.
     * @type {Boolean}
     */
    this.interactive = true;
    this.reportFile = 'report.json';
    this.processedFile = 'processed.json';
    this._parseArguments();
  }
  /**
   * Parses command arguments
   */
  _parseArguments() {
    const args = process.argv.slice(2);
    for (let i = 0, len = args.length; i < len; i++) {
      switch (args[i]) {
        case '--ci': this.interactive = false; break;
        case '--dir':
          this.apisDir = args[i + 1];
          i++;
          break;
        case '--sample':
          const s = Number(args[i + 1]);
          i++;
          if (!isNaN(s)) {
            this.samleSize = s;
          }
          break;
      }
    }
  }
  /**
   * Reads `apisDir` and generate a sample of projects to process based on
   * `samleSize` property.
   * @return {Promise}
   */
  _pickSample() {
    const s = this.samleSize;
    console.log('Sample size setting: ', s);
    if (!s) {
      return Promise.resolve([]);
    }
    return fs.readdir(this.apisDir)
    .then((contents) => {
      return contents.filter((item) => {
        if (item.indexOf('.zip') === -1) {
          return false;
        }
        if (blacklist.indexOf(item) !== -1) {
          return false;
        }
        if (this.processed.indexOf(item) !== -1) {
          return false;
        }
        return true;
      });
    })
    .then((zips) => {
      console.log('All available APIs: ', zips.length);
      if (s >= 100 || !zips.length) {
        console.log('Will use %d files to process.', zips.length);
        return zips;
      }
      return this._pickApis(zips, s);
    });
  }
  /**
   * Generates sample from a list of options.
   * @param {Array} apis A list of options
   * @param {Number} sampleSize Sample size from 0 to 100.
   * @return {Array} Generated sample
   */
  _pickApis(apis, sampleSize) {
    const allSize = apis.length;
    if (!allSize) {
      return [];
    }
    const size = Math.floor(allSize * (sampleSize/100));
    console.log('Generating list of %d apis.', size);
    const result = [];
    while (result.length !== size) {
      const index = Math.floor(Math.random() * allSize);
      const item = apis[index];
      if (result.indexOf(item) !== -1) {
        continue;
      }
      result[result.length] = item;
    }
    return result;
  }

  /**
   * Runs the test
   * @return {Promise}
   */
  run() {
    return this._clearReport()
    .then(() => this._readProcessed())
    .then(() => this._pickSample())
    .then((sample) => {
      this.apis = sample;
      return this._processQueue();
    });
  }
  /**
   * Runs next queue item.
   * @return {Promise}
   */
  _processQueue() {
    const api = this.apis.shift();
    if (!api) {
      return this.printSummary();
    }
    const loc = path.join(this.apisDir, api);
    const ins = new AmfJsParserTestRunner(loc, {
      interactive: this.interactive
    });
    return ins.run()
    .then((report) => this._saveReport(api, report))
    .then(() => this._processQueue());
  }
  /**
   * Clears report file.
   * @return {Promise}
   */
  _clearReport() {
    return fs.outputJSON(this.reportFile, {});
  }
  /**
   * Saves test report in the file.
   * @param {String} apiPath
   * @param {Object} report
   * @return {Promise}
   */
  _saveReport(apiPath, report) {
    return fs.ensureFile(this.reportFile)
    .then(() => fs.readJson(this.reportFile, {throws: false}))
    .then((data) => {
      if (!data) {
        data = {};
      }
      data.lastApi = apiPath;
      if (!data.reports) {
        data.reports = [];
      }
      data.reports.push({
        api: apiPath,
        report
      });
      return fs.outputJSON(this.reportFile, data);
    })
    .then(() => fs.readJson(this.processedFile, {throws: false}))
    .then((data) => {
      if (!data && !(data instanceof Array)) {
        data = [];
      }
      data.push(apiPath);
      return fs.outputJSON(this.processedFile, data);
    });
  }
  /**
   * Reads the list of files that already has been processed
   * @return {Promise}
   */
  _readProcessed() {
    return fs.ensureFile(this.processedFile)
    .then(() => fs.readJson(this.processedFile, {throws: false}))
    .then((data) => {
      if (!data && !(data instanceof Array)) {
        data = [];
      }
      this.processed = data;
    });
  }
  /**
   * Prints the final report.
   * @return {Array<Object>} Test results for each API in order.
   */
  printSummary() {
    return fs.readJson(this.reportFile)
    .then((data) => {
      data.reports.forEach((item) => this.printReport(item.report));
    });
  }
  /**
   * Prints test result to the console
   * @param {Object} item
   */
  printReport(item) {
    if (!item) {
      return;
    }
    console.log();
    console.log('API:', item.api);
    if (item.success) {
      console.log(colors.green('  Test result: Success.'));
    } else {
      console.log(colors.red('  Test result: Error.'));
    }
    item.logs.forEach((log) => {
      if (!log.success) {
        console.error(colors.red('    '), colors.red(log.message));
      } else {
        console.log(colors.green('    '), colors.green(log.message));
      }
    });
  }
}

const apiTest = new RamlAmfParsersTest();
apiTest.run();

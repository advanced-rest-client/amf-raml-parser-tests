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
  // 'digital-clinician-services---practitioner-management-api-1.0.0-fat-raml.zip',
  // 'experience-mobile-api-2.0.0-fat-raml.zip', // AMF OK
  // 'digital-clinician-services---pathology-processing-api-1.0.0-fat-raml.zip',
  // 'da_fernandez-omni-channel-experienc-1.0.0-fat-raml.zip', // AMF OK
  // 'digital-clinician-services---pathology-catalogues-api-2.0.0-fat-raml.zip',
  // 'omani-api-1.0.0-fat-raml.zip', // AMF OK
  // 'digital-clinician-services---pathology-orders-api-1.0.0-fat-raml.zip',
  // 'omnichannel-experience-api-1.0.0-fat-raml.zip', // AMF OK
  // 'sf-omni-channel-experience-api-1.0.0-fat-raml.zip', // AMF OK
  // 'ppandya-omni-channel-experience-api-1.0.0-fat-raml.zip', // AMF OK
  // '00187409-1.0.1-fat-raml.zip',
  // '00189163-api-exchange-issue-1.0.0-fat-raml.zip', // AMF OK
  // 'amal-omni-channel-experience-api-1.0.0-fat-raml.zip', // AMF OK
  // 'arjenkoller-omni-channel-experience-1.0.0-fat-raml.zip', // AMF OK
  // 'bigdemo-omni-channel-experience-api-1.0.0-fat-raml.zip', // AMF OK
  // 'binut-omni-channel-experience-1.0.0-fat-raml.zip', // AMF OK
  // 'catalyst-retail-omnichannel-xp-api-1.0.0-fat-raml.zip',
  // 'digital-clinician-services---domain-api-1.0.0-fat-raml.zip',
  // 'digital-clinician-services---pathology-observations-api-1.0.0-fat-raml.zip',
  // 'digital-clinician-services---patient-management-api-1.0.0-fat-raml.zip',
  // 'drewg2-omni-channel-experience-api-1.0.0-fat-raml.zip', // RAML OK
  // '1182-1.0.0-fat-raml.zip',
  // '00173974-1.0.0-fat-raml.zip',
  // 'box-api-1.0.0-fat-raml.zip',
  // 'bmw-1.0.0-fat-raml.zip',
  // 'c4e-config-manager-api-2.0.2-fat-raml.zip',
  // 'ds-domainproxy-5.0.0-fat-raml.zip',
  // 'twitter-demo-tuesday-1.0.0-fat-raml.zip',
  // 'zuora-api-1.0.0-fat-raml.zip',
  // 'funds-1.0.2-fat-raml.zip',
  // 'funds-prof-1.0.2-fat-raml.zip',
  // 'gp-driver-process-1.0.3-fat-raml.zip',
  // 'gp-meta-1.0.9-fat-raml.zip',
  // 'gp-meta-process-1.0.3-fat-raml.zip',
  // 'kappana-omni-channel-experiance-api-1.0.0-fat-raml.zip',
  // 'kianping-omni-channel-experience-api-2.0.0-fat-raml.zip',
  // 'mhra-e-device-1.0.6-fat-raml.zip',
  // 'mhra-s-device-1.0.6-fat-raml.zip',
  // 'minhacomunidade-1.0.0-fat-raml.zip',
  // 'ds-domainproxy-510-dev-4.0.0-fat-raml.zip',
  // 'retail-omnichannel-experience-api2-1.0.0-fat-raml.zip',
  // 'portfolios-1.0.5-fat-raml.zip',
  // 'poc-proxied-api-1.0.0-fat-raml.zip',
  // 'patient-fhir-1.0.0-fat-raml.zip',
  // 'p-people-1.0.0-fat-raml.zip',
  // 'omnichannel_api-1.0.4-fat-raml.zip',
  // 'omni-channel-experience-api-myao-1.0.1-fat-raml.zip',
  // 'omni-channel-experience-api-1.0.0-fat-raml.zip',
  // 'nwisman-omni-channel-experience-api-1.0.0-fat-raml.zip',
  // 'northwellonfhir-1.0.0-fat-raml.zip',
  // 'neverfail-system-api-1.0.1-fat-raml.zip',
  // 'my-api-1.0.0-fat-raml.zip',
  // 'magento-api-1.0.1-fat-raml.zip',
  // 'kbs-csfdata-api-dev-1.0.0-fat-raml.zip',
  // 'i-soup-4.0.0-fat-raml.zip',
  // 'harward-case-1.0.0-fat-raml.zip',
  // 'harvard-short-1.0.0-fat-raml.zip',
  // 'harvard-api-1.0.0-fat-raml.zip',
  // 'gpc-3.0.0-fat-raml.zip',
  // 'fhir-patient-1.0.0-fat-raml.zip',
  // 'eligibility-2.0.9-fat-raml.zip',
  // 'rm-1.0.0-fat-raml.zip',
  // 's-suez-routeman-ic-api-1.0.6-fat-raml.zip',
  // 's-suez-routeman-shredding-api-1.0.4-fat-raml.zip',
  // 's-suez-salesforce-api-1.0.0-fat-raml.zip',
  // 'sabre-api-proxy-1.0.0-fat-raml.zip',
  // 'sappan-omni-channel-experience-api-1.0.0-fat-raml.zip',
  // 'serviceorderitem-1.0.0-fat-raml.zip',
  // 'sri-omni-channel-experience-api-1.0.0-fat-raml.zip',
  // 'twitter-api-1.0.0-fat-raml.zip',
  // 'wi-loan-experience-1.0.3-fat-raml.zip',
  // 'ws-workshop-api-1.0.0-fat-raml.zip'
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

/*
 APIs with AMF helper issues

kbs-csfdata-api-dev-1.0.0-fat-raml.zip
*/

/*
Couldn't find main file


 */

/*
Can't find RAML version.


 */

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
    this.processed = [];
    // return this._clearReport()
    // .then(() => this._readProcessed())
    return this._readProcessed()
    .then(() => this._pickSample())
    .then((sample) => {
      this.apis = sample;
      return this._processQueue();
    });
  }

  runAmfParser() {
    this.processed = [];
    this.apisDir = 'test';
    return this._pickSample()
    .then((sample) => {
      this.apis = sample;
      console.log(sample);
      return this._processRamlQueue();
    });
  }

  _processRamlQueue() {
    const api = this.apis.shift();
    if (!api) {
      return;
    }
    const loc = path.join(this.apisDir, api);
    const ins = new AmfJsParserTestRunner(loc, {
      interactive: this.interactive
    });


    return ins._unzip(ins.apiLocation)
    .then((file) => {
      if (!file) {
        throw new Error('No api file');
      }
      ins._apiFile = file;
      return ins._readApiType(file);
    })
    .then((type) => {
      ins.apiType = type;
      console.log('API type is ', type);
    })
    .then(() => ins.parseAmfParser())
    .then(() => ins.cleanTempFiles())
    .then(() => {
      console.log(api + ' parsed correctly');
    })
    .catch((cause) => {
      console.log(api + ' parse error', cause);
      return ins.cleanTempFiles();
    })
    .then(() => this._processRamlQueue());
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

// const apiTest = new RamlAmfParsersTest();
// apiTest.run();
// apiTest.runAmfParser();

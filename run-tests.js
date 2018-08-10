const {AmfJsParserTestRunner} = require('./test/runner');
const colors = require('colors/safe');
const apis = [
  ['test/raml-example-api/api.raml', 'RAML 1.0'],
  ['test/exchange-experience-api/exchange-experience-api.raml', 'RAML 0.8']
];

/**
 * Initializes and runs the tests in sequence.
 */
class RamlAmfParsersTest {
  /**
   * @param {Array} apis List of list of api definition.
   * First item is the API location and the other is API type.
   */
  constructor(apis) {
    this.apis = apis;
    this.reports = [];
  }
  /**
   * Runs the queue
   * @return {Promise}
   */
  run() {
    const api = this.apis.shift();
    if (!api) {
      return this.printSummary();
    }
    const instance = new AmfJsParserTestRunner(api[0], api[1]);
    return instance.run()
    .then((report) => {
      this.reports.push(report);
      return this.run();
    });
  }
  /**
   * Prints the final report.
   * @return {Array<Object>} Test results for each API in order.
   */
  printSummary() {
    this.reports.forEach((item) => this.printReport(item));
    return this.reports;
  }
  /**
   * Prints test result to the console
   * @param {Object} item
   */
  printReport(item) {
    console.log();
    console.log('API:', item.api);
    if (item.success) {
      console.log(colors.green('  Test result: Success.'));
    } else {
      console.log(colors.red('  Test result: Error.'));
    }
    item.logs.forEach((log) => {
      if (log.isError) {
        console.error(colors.red('    '), colors.red(log.message));
      } else {
        console.log(colors.green('    '), colors.green(log.message));
      }
    });
  }
}

const apiTest = new RamlAmfParsersTest(apis);
apiTest.run();

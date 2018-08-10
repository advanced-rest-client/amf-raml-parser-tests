const ramlParser = require('./raml-parser');
const amfParser = require('./amf-parser');
const typesHelper = require('./types-helper');
const endpointsHelper = require('./endpoints-helper');
const amfHelper = require('./amf-helper');
const _ = require('lodash');
/**
 * Runs the test for a single API.
 */
class AmfJsParserTestRunner {
  /**
   * @param {String} api API location
   * @param {String} type API type
   */
  constructor(api, type) {
    this.apiLocation = api;
    this.apiType = type;
    this.apiTitle = '';
    this.report = {
      success: true,
      api: api,
      logs: []
    };
    this.abort = false;
  }
  /**
   * Adds an error to the report.
   * @param {Error} cause
   * @param {Boolean} isFatal Aborts the test when true.
   */
  reportError(cause, isFatal) {
    this.report.success = false;
    this.report.logs.push({
      message: cause.message,
      isError: true
    });
    if (isFatal) {
      this.abort = true;
    }
  }
  /**
   * Adds success message
   * @param {String} message
   */
  reportSuccess(message) {
    this.report.logs.push({
      message: message,
      isError: false
    });
  }
  /**
   * Tests if two values equals.
   * @param {String} title Test title
   * @param {any} value
   * @param {any} other
   */
  assertEqual(title, value, other) {
    if (_.isEqual(value, other)) {
      this.reportSuccess(title);
    } else {
      let m = `${title}: Expected ${value} to equal ${other}`;
      this.reportError(new Error(m));
    }
  }

  /**
   * Runs the test.
   * @return {Promise<Object>} Promise resolved to generated report.
   */
  run() {
    return this.parseRamlParser()
    .then(() => this.parseAmfParser())
    .then(() => {
      if (this.abort) {
        return this.report;
      } else {
        return this._runParserTests()
        .then(() => this.report);
      }
    });
  }
  /**
   * @return {Promise}
   */
  parseRamlParser() {
    return ramlParser(this.apiLocation)
    .then((data) => {
      this.ramlApi = data;
    })
    .catch((cause) => {
      let m = `RAML JS parser: Unable to parse the API ${this.apiLocation}.\n`;
      m += cause.message;
      this.reportError(new Error(m), true);
    });
  }
  /**
   * @return {Promise}
   */
  parseAmfParser() {
    return amfParser(this.apiLocation, this.apiType)
    .then((data) => {
      this.amfApi = data;
    })
    .catch((cause) => {
      let m = `AMF parser: Unable to parse the API ${this.apiLocation}.\n`;
      m += cause.s$1 || cause.message;
      this.reportError(new Error(m), true);
    });
  }
  /**
   * Runs parser tests.
   *
   * @return {Promise}
   */
  _runParserTests() {
    this._testTypes();
    this._testEndpoints();

    return Promise.resolve();
  }
  /**
   * Compares types of both APIs
   */
  _testTypes() {
    this._typesSizeTest();
    this._resourceTypesSizeTest();
  }
  /**
   * Cpmpares types size
   */
  _typesSizeTest() {
    let ramlTypesSize = 0;
    if (this.ramlApi.types) {
      ramlTypesSize = Object.keys(this.ramlApi.types).length;
    }
    const amfTypesSize = typesHelper.countAmfTypes(this.amfApi);
    const title = 'AMF has the same size of types';
    this.assertEqual(title, ramlTypesSize, amfTypesSize);
  }
  /**
   * Cpmpares resource types size
   */
  _resourceTypesSizeTest() {
    let ramlTypesSize = 0;
    if (this.ramlApi.resourceTypes) {
      ramlTypesSize = Object.keys(this.ramlApi.resourceTypes).length;
    }
    const amfTypesSize = typesHelper.countAmfResourceTypes(this.amfApi);
    const title = 'AMF has the same size of resource types';
    this.assertEqual(title, ramlTypesSize, amfTypesSize);
  }
  /**
   * Performs endpoint tests
   */
  _testEndpoints() {
    this._testEndpointSize();
    this._testEndpointMethodsSize();
    try {
      this._testMethodsContent();
    } catch (e) {
      console.error(e);
    }
  }
  /**
   * Tests for endpoint size
   */
  _testEndpointSize() {
    const ramlEndpoints = endpointsHelper
      .countRamlEndpoints(this.ramlApi.resources);
    const amfEndpoints = endpointsHelper
      .countAmfEndpoints(this.amfApi);
    const title = 'AMF has the same size of endpoints';
    this.assertEqual(title, ramlEndpoints, amfEndpoints);
  }
  /**
   * Returns a list of paths for endpoints in the AMF model
   * @return {Array<String>}
   */
  __getAmfEndpointPaths() {
    if (this.__amfEndpointPaths) {
      return this.__amfEndpointPaths;
    }
    this.__amfEndpointPaths = endpointsHelper.amfPaths(this.amfApi);
    return this.__amfEndpointPaths;
  }
  /**
   * @param {String} path
   * @return {Array<Object>} Returns a list of methods for an endpoint.
   */
  __getAmfMethodForPath(path) {
    if (!this.__amfMethodsPathsCache) {
      this.__amfMethodsPathsCache = {};
    }
    if (this.__amfMethodsPathsCache[path]) {
      return this.__amfMethodsPathsCache[path];
    }
    const operations = endpointsHelper.amfOpsFromPath(this.amfApi, path);
    this.__amfMethodsPathsCache[path] = operations;
    return operations;
  }
  /**
   * @param {String} path
   * @return {Array<Object>} Returns a list of methods for an endpoint.
   */
  __getRamlMethodForPath(path) {
    if (!this.__ramlMethodsPathsCache) {
      this.__ramlMethodsPathsCache = {};
    }
    if (this.__ramlMethodsPathsCache[path]) {
      return this.__ramlMethodsPathsCache[path];
    }
    const operations = endpointsHelper
    .methodsFromPath(this.ramlApi.resources, path);
    this.__ramlMethodsPathsCache[path] = operations;
    return operations;
  }
  /**
   * Tests number of methods in each endpoint
   */
  _testEndpointMethodsSize() {
    const endpoints = this.__getAmfEndpointPaths();
    for (let i = 0; i < endpoints.length; i++) {
      const path = endpoints[i];
      const operations = this.__getAmfMethodForPath(path);
      const methods = this.__getRamlMethodForPath(path);
      const title = `${path} has the same number of methods`;
      if (!operations && !methods) {
        this.assertEqual(title, 0, 0);
        continue;
      }
      try {
        this.assertEqual(title, operations.length, methods.length);
      } catch (e) {
        this.reportError(new Error(title + ': ' + e.message));
      }
    }
  }
  /**
   * Tests methods content: headers, bodies, responses.
   */
  _testMethodsContent() {
    const endpoints = this.__getAmfEndpointPaths();
    if (!endpoints || !endpoints.length) {
      return;
    }
    const ns = amfHelper.ns;
    for (let i = 0; i < endpoints.length; i++) {
      const path = endpoints[i];
      const operations = this.__getAmfMethodForPath(path);
      const methods = this.__getRamlMethodForPath(path);
      if (!operations && !methods) {
        continue;
      }
      if (!operations || !operations.length) {
        let msg = `RAML ${path} has methods but AMF `;
        msg += `operations are undefined`;
        this.reportError(new Error(msg));
        continue;
      }
      if (!methods || !methods.length) {
        let msg = `AMF ${path} has operations but RAML `;
        msg += `methods are undefined`;
        this.reportError(new Error(msg));
        continue;
      }
      for (let i = 0, len = operations.length; i < len; i++) {
        const operation = operations[i];
        const methodName = amfHelper.getValue(operation,
          ns.w3.hydra.core + 'method');
        const method = endpointsHelper.findMethodByName(methodName, methods);
        if (!method) {
          let msg = `AMF ${path} has method ${methodName} `;
          msg += `which is undefined in RAML model`;
          this.reportError(new Error(msg));
          continue;
        }
        this._compareMethods(path, operation, method);
      }
    }
  }
  /**
   * Performs method comparison tests
   * @param {String} path Current path
   * @param {Object} operation AMF operation
   * @param {Object} method RAML method
   */
  _compareMethods(path, operation, method) {
    const ns = amfHelper.ns;
    const methodName = amfHelper.getValue(operation,
      ns.w3.hydra.core + 'method');
    // What to expect...
    const expects = operation[ns.w3.hydra.core + 'expects'];
    if (expects && expects.length) {
      const expect = expects[0];
      const headers = expect[ns.raml.vocabularies.http + 'header'];
      this._compareMethodsHeaders(path, methodName, headers, method.headers);
      const payload = expect[ns.raml.vocabularies.http + 'payload'];
      this._compareMethodsBodies(path, methodName, payload, method.body);
    }
    const returns = operation[ns.w3.hydra.core + 'returns'];
    if (returns && returns[0]) {
      this._compareMethodsResponses(path, methodName, returns,
        method.responses);
    }
  }
  /**
   * Compares request headers in a method
   * @param {String} path Endpopint path
   * @param {String} method HTTP method
   * @param {Array<Object>} amfHeaders
   * @param {Array<Object>} ramlHeaders
   */
  _compareMethodsHeaders(path, method, amfHeaders, ramlHeaders) {
    if (!amfHeaders) {
      return;
    }
    if (!ramlHeaders || !ramlHeaders.length) {
      let msg = `${path}::${method} - Headers do not match. `;
      msg += 'AMF headers are present but RAML headers are not.';
      this.reportError(new Error(msg));
      return;
    }
    for (let j = 0, jLen = amfHeaders.length; j < jLen; j++) {
      const amfHeader = amfHelper.resolve(this.amfApi, amfHeaders[j]);
      const amfName = amfHelper.getValue(amfHeader,
        amfHelper.ns.schema.schemaName);
      let hasRamlHeader = false;
      for (let k = 0, kLen = ramlHeaders.length; k < kLen; k++) {
        if (ramlHeaders[k].name === amfName) {
          hasRamlHeader = true;
          break;
        }
      }
      // We only test for first error.
      if (!hasRamlHeader) {
        let msg = `${path}::${method} - Headers do not match. `;
        msg += `${amfName} header not defined in RAML set.`;
        this.reportError(new Error(msg));
        return;
      }
    }
    this.reportSuccess(`${path}::${method} - Headers match.`);
  }
  /**
   * @param {String} path Endpopint path
   * @param {String} method HTTP method
   * @param {Array<Object>} payloads
   * @param {Array<Object>} bodies
   */
  _compareMethodsBodies(path, method, payloads, bodies) {
    if (!payloads || !payloads.length) {
      return;
    }
    if (!bodies || !bodies.length) {
      let msg = `${path}::${method} - Body do not match. `;
      msg += 'AMF body is present but RAML body is not.';
      this.reportError(new Error(msg));
      return;
    }
    const ns = amfHelper.ns;
    for (let i = 0, iLen = payloads.length; i < iLen; i++) {
      const payload = amfHelper.resolve(this.amfApi, payloads[i]);
      const media = amfHelper.getValue(payload,
        ns.raml.vocabularies.http + 'mediaType');
      if (!media) {
        continue;
      }
      let hasBody = false;
      for (let j = 0, jLen = bodies.length; j < jLen; j++) {
        if (bodies[j].name === media) {
          hasBody = true;
          break;
        }
      }
      // We only test for first error.
      if (!hasBody) {
        let msg = `${path}::${method} - Body do not match. `;
        msg += `${media} media type not defined in RAML set.`;
        this.reportError(new Error(msg));
        return;
      }
    }
    this.reportSuccess(`${path}::${method} - Body match.`);
  }
  /**
   * Compares responses in a method
   * @param {String} path Endpopint path
   * @param {String} method HTTP method
   * @param {Array<Object>} returns
   * @param {Array<Object>} responses
   */
  _compareMethodsResponses(path, method, returns, responses) {
    if (!returns || !returns.length) {
      return;
    }
    if (!responses || !responses.length) {
      let msg = `${path}::${method} - Responses do not match. `;
      msg += 'AMF responses are present and RAML responses are not.';
      this.reportError(new Error(msg));
      return;
    }
    const ns = amfHelper.ns;
    for (let j = 0, jLen = returns.length; j < jLen; j++) {
      const amfReturn = amfHelper.resolve(this.amfApi, returns[j]);
      const amfCode = Number(amfHelper.getValue(
        amfReturn, ns.w3.hydra.core + 'statusCode'));
      let hasStatus = false;
      for (let k = 0, kLen = responses.length; k < kLen; k++) {
        if (Number(responses[k].code) === amfCode) {
          hasStatus = true;
          break;
        }
      }
      if (!hasStatus) {
        let msg = `${path}::${method} - Responses do not match. `;
        msg += `${amfCode} response not defined in RAML set.`;
        this.reportError(new Error(msg));
        return;
      }
    }
    this.reportSuccess(`${path}::${method} - Responses match.`);
  }
}

module.exports.AmfJsParserTestRunner = AmfJsParserTestRunner;

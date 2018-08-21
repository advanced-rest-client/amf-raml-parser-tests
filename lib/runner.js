const {fork} = require('child_process');
const typesHelper = require('./types-helper');
const endpointsHelper = require('./endpoints-helper');
const amfHelper = require('./amf-helper');
const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const Duplex = require('stream').Duplex;
const unzip = require('unzip');
const path = require('path');
const readline = require('readline');
/**
 * Runs the test for a single API.
 */
class AmfJsParserTestRunner {
  /**
   * @param {String} api API location
   * @param {?Object} opts
   */
  constructor(api, opts) {
    opts = opts || {};
    this.apiLocation = api;
    // this.apiType;
    this.apiTitle = '';
    this.report = {
      success: true,
      api: api,
      logs: []
    };
    this.abort = false;
    this.interactive = opts.interactive;
  }
  /**
   * Adds an error to the report.
   * @param {Error} cause
   * @param {Boolean} isFatal Aborts the test when true.
   */
  reportError(cause, isFatal) {
    this.report.success = false;
    this.report.logs.push({
      type: 'report',
      message: cause.message,
      success: false
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
      type: 'report',
      message,
      success: true
    });
  }
  /**
   * Adds an info message to the report.
   * @param {String} message A message to render
   * @param {String} type Message type. Default to `info`
   * @param {?any} args Additional arguments. Use it as
   * `this.reportInfo('a','b', arg1, arg2, ...)`
   */
  reportInfo(message, type, ...args) {
    type = type || 'info';
    this.report.logs.push({
      type,
      message,
      args
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
    console.log('Processing ', this.apiLocation);
    return this._unzip(this.apiLocation)
    .then((file) => {
      if (!file) {
        throw new Error('No api file');
      }
      this._apiFile = file;
      return this._readApiType(file);
    })
    .then((type) => {
      this.apiType = type;
      console.log('API type is ', type);
    })
    .then(() => this.parseRamlParser())
    .then(() => this.parseAmfParser())
    .then(() => this.cleanTempFiles())
    .then(() => {
      if (!this.abort) {
        return this._runParserTests();
      }
    })
    .then(() => {
      const status = this.report.success ? 'success' : 'fail';
      console.log('API test ended with', status);
      return this.report;
    })
    .catch((cause) => {
      this.cleanTempFiles();
      this.reportError(cause, true);
      console.log('TEST ENDED WITH ERROR', cause);
      // throw cause;
      return this.report;
    });
  }
  /**
   * Reads API type from the API main file.
   * @param {String} file File location
   * @return {Promise}
   */
  _readApiType(file) {
    const size = 30;
    const nlBuffer = Buffer.from([13, 10]);
    return fs.open(file, 'r')
    .then((fd) => {
      return fs.read(fd, Buffer.alloc(size), 0, size, 0)
      .then((r) => {
        return fs.close(fd).then(() => r);
      });
    })
    .then((result) => {
      const data = result.buffer;
      let index = data.indexOf(nlBuffer);
      if (index === -1) {
        index = data.indexOf(Buffer.from([10]));
      }
      if (index === -1) {
        throw new Error('Unable to determine RAML version');
      }
      const header = data.slice(2, index).toString().trim();
      if (!header || header.indexOf('RAML ') !== 0) {
        throw new Error('The API file header is unknown');
      }
      if (header.indexOf('RAML 1.0') === 0) {
        return 'RAML 1.0';
      }
      if (header.indexOf('RAML 0.8') === 0) {
        return 'RAML 0.8';
      }
      return header;
    });
  }
  /**
   * Unzips API folder and returns path to the folder in tmp location.
   * @param {String} file API file location
   * @return {Promise} [description]
   */
  _unzip(file) {
    this.tmpobj = tmp.dirSync();
    return new Promise((resolve, reject) => {
      let stream = new Duplex();
      stream.push(fs.readFileSync(file));
      stream.push(null);
      const extractor = unzip.Extract({
        path: this.tmpobj.name
      });
      extractor.on('close', () => {
        this._removeZipMainFolder(this.tmpobj.name)
        .then(() => this._findApiFile(this.tmpobj.name))
        .then((files) => this._decideMainFile(this.tmpobj.name, files))
        .then((file) => resolve(file))
        .catch((err) => reject(err));
      });
      extractor.on('error', (err) => {
        reject(err);
      });
      stream.pipe(extractor);
    });
  }
  /**
   * Removes temp folder.
   */
  cleanTempFiles() {
    if (this.tmpobj) {
      fs.emptyDir(this.tmpobj.name)
      .then(() => this.tmpobj.removeCallback());
    }
  }

  /**
   * The zip may have source files enclosed in a folder.
   * This will look for a folder in the root path and will copy sources from it.
   *
   * @param {String} destination A place where the zip sources has been
   * extracted.
   * @return {Promise}
   */
  _removeZipMainFolder(destination) {
    return fs.readdir(destination)
    .then((files) => {
      // Clears macos files
      files = files.filter((item) => item !== '__MACOSX');
      if (files.length > 1) {
        return Promise.resolve();
      }
      const dirPath = path.join(destination, files[0]);
      return fs.stat(dirPath)
      .then((stats) => {
        if (stats.isDirectory()) {
          return fs.copy(dirPath, destination);
        }
      });
    });
  }
  /**
   * Finds main API name.
   * If the `api.raml` is present then it always points to the file.
   * If not then, if any RAML file exists it points to first raml file.
   * If not then,it returns `api.raml`
   * @param {String} destination Path where to look for the files.
   * @return {Promise<String>}
   */
  _findApiFile(destination) {
    return fs.readdir(destination)
    .then((items) => {
      const def = 'api.raml';
      const _files = [];
      for (let i = 0; i < items.length; i++) {
        let lower = items[i].toLowerCase();
        if (lower === def) {
          return def;
        }
        if (path.extname(lower) === '.raml') {
          _files.push(items[i]);
        }
      }
      if (_files.length === 1) {
        return _files[0];
      }
      if (_files.length) {
        return _files;
      }
      return;
    });
  }
  /**
   * Decides which file to use as API main file.
   * @param {String} root A root path to add to the file name
   * @param {Array<String>|String} files A file or list of files.
   * @return {Promise<String>}
   */
  _decideMainFile(root, files) {
    if (typeof files === 'string') {
      return Promise.resolve(path.join(root, files));
    }
    if (!files || !files.length) {
      throw new Error('Couldn\'t find any RMAL files.');
    }
    const fullPathFiles = files.map((item) => path.join(root, item));
    return this._findWebApiFile(fullPathFiles)
    .then((file) => {
      if (!file) {
        if (!this.interactive) {
          throw new Error('Could not recognize main API file.');
        }
        return this._askApiFile(files)
        .then((f) => {
          if (f) {
            return path.join(root, f);
          }
        });
      }
      return file;
    });
  }
  /**
   * Reads all files and looks for 'RAML 0.8' or 'RAML 1.0' header which
   * is a WebApi.
   * @param {Array<String>} files List of candidates
   * @return {Promise<String>}
   */
  _findWebApiFile(files) {
    const f = files.shift();
    if (!f) {
      return Promise.resolve();
    }
    return this._readApiType(f)
    .catch((e) => {
      console.log('Unable to find file type', e);
    })
    .then((type) => {
      if (type && (type.indexOf('Extension') !== -1 ||
        type.indexOf('Overlay') !== -1)) {
        // RAML 1.0
        return f;
      }
      if (type && (type === 'RAML 0.8' || type === 'RAML 1.0')) {
        return f;
      }
      return this._findWebApiFile(files);
    });
  }

  /**
   * Asks the user to answer which API main file to choose.
   * @param {Array<String>} files List of possible file
   * @return {Promise<String>} User selection.
   */
  _askApiFile(files) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise((resolve) => {
      let q = '\nPlease select api main file:\n';
      files.forEach((file, index) => {
        q += `${(index + 1)}: ${file}\n`;
      });
      q += `Your answer (1 - ${files.length}):`;
      rl.question(q, (answer) => {
        rl.close();
        const parsedAnswer = Number(answer);
        if (isNaN(parsedAnswer)) {
          console.warn('Invalid argument', answer);
          resolve(this._askApiFile(files));
          return;
        }
        const index = parsedAnswer - 1;
        const file = files[index];
        if (!file) {
          console.warn('Invalid choice', answer);
          resolve(this._askApiFile(files));
          return;
        }
        resolve(file);
      });
    });
  }
  /**
   * @param {String} file
   * @return {Promise}
   */
  _forkParser(file) {
    return new Promise((resolve, reject) => {
      const proc = fork(`${__dirname}/${file}`);
      const start = Date.now();
      let resolved = false;
      let timeout = setTimeout(() => {
        if (resolved) {
          return;
        }
        resolved = true;
        proc.kill();
        reject(new Error('API pasing timeout'));
      }, 180000); // 3 minutes
      proc.on('message', (result) => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        if (resolved) {
          return;
        }
        proc.kill();
        if (result.error) {
          resolved = true;
          reject(new Error(result.error));
        } else {
          const time = Date.now() - start;
          resolved = true;
          resolve({
            api: result.api,
            time
          });
        }
      });
      proc.on('error', (error) => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        if (resolved) {
          return;
        }
        proc.kill();
        resolved = true;
        reject(new Error(error.message || 'Unknown error'));
      });
      proc.send({
        source: this._apiFile,
        from: this.apiType
      });
    });
  }

  /**
   * @return {Promise}
   */
  parseRamlParser() {
    if (this.abort) {
      return Promise.resolve();
    }
    console.log('Parsing using RAML js parser');
    return this._forkParser('raml-parser.js')
    .catch((cause) => {
      const m = `RAML JS parser: ` + cause.message;
      const e = new Error(m);
      this.reportError(e, true);
      throw cause;
    })
    .then((data) => {
      this.reportInfo('RAML parsing time', 'raml-parse-time', data.time);
      this.ramlApi = data.api;
    });
  }
  /**
   * @return {Promise}
   */
  parseAmfParser() {
    if (this.abort) {
      return Promise.resolve();
    }
    console.log('Parsing using AMF js parser');
    return this._forkParser('amf-parser.js')
    .catch((cause) => {
      const m = `AMF parser: ` + cause.message;
      const e = new Error(m);
      this.reportError(e, true);
      throw cause;
    })
    .then((data) => {
      this.reportInfo('Amf parsing time', 'amf-parse-time', data.time);
      this.amfApi = data.api;
    });
  }
  /**
   * Runs parser tests.
   *
   * @return {Promise}
   */
  _runParserTests() {
    if (this.abort) {
      return Promise.resolve();
    }
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

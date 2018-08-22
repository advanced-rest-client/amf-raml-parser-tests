const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');
const Duplex = require('stream').Duplex;
const unzip = require('unzip');
const amf = require('amf-client-js');

const raml10 = amf.Core.parser('RAML 1.0', 'application/raml');
const raml08 = amf.Core.parser('RAML 0.8', 'application/raml');
const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
/**
 * AMF demo parser for API console.
 */
class ParserService {
  /**
   * @param {String} apiUrl
   * @param {Object} res
   */
  parseApi(apiUrl, res) {
    const file = apiUrl.substr(apiUrl.indexOf('apis/'));
    const buffer = fs.readFileSync(file);
    this.getFileLocation(buffer)
    .then((file) => {
      return this._readApiType(file)
      .then((type) => [file, type]);
    })
    .then((res) => {
      const file = `file://${res[0]}`;
      return this.processFile(file, res[1]);
    })
    .then((data) => {
      res.set('Content-Type', 'application/json');
      res.status(200).send(data);
      this.cleanTempFiles();
    })
    .catch((cause) => {
      console.error(cause);
      const body = JSON.stringify({
        error: true,
        message: cause.message
      }, null, 2);
      res.set('Content-Type', 'application/json');
      res.status(500).send(body);
      this.cleanTempFiles();
    });
    // const dataType = req.body.dataType;
    // const dataFormat = req.body.dataFormat;
    // const dataValue = req.body.dataValue;
    // let p;
    // switch (dataFormat) {
    //   case 'url':
    //     p = this.processFile(dataValue, dataType);
    //     break;
    //   case 'text':
    //     p = this.processData(dataValue, dataType);
    //     break;
    //   default:
    //     p = Promise.reject(new Error('Unknown data format'));
    // }
    // p.then((data) => {
    //   res.set('Content-Type', 'application/json');
    //   res.status(200).send(data);
    // })
    // .catch((cause) => {
    //   const m = cause.message || cause.s$1 || 'unknown error';
    //   const body = JSON.stringify({
    //     error: true,
    //     message: m
    //   }, null, 2);
    //   res.set('Content-Type', 'application/json');
    //   res.status(500).send(body);
    //   console.error(m);
    // });
  }

  /**
   * Processes locally oxternally stored file.
   *
   * @param {String} file File location
   * @param {Strnig} from `raml`, `oas` or `amf`
   * @return {Promise}
   */
  processFile(file, from) {
    let parser;
    switch (from) {
      case 'RAML 1.0': parser = raml10; break;
      case 'RAML 0.8': parser = raml08; break;
    }
    return parser.parseFileAsync(file)
    // .then((doc) => {
    //   parser.reportValidation(amf.ProfileNames.RAML, 'AMF')
    //   .then((result) => {
    //     console.log(result);
    //   });
    //   return doc;
    // })
    .then((doc) => this.generateModel(doc, from));
  }
  /**
   * Generates a model.
   *
   * @param {Object} doc Parsed document
   * @param {Strnig} from `raml`, `oas` or `amf`
   * @return {Promise}
   */
  generateModel(doc, from) {
    const resolver = amf.Core.resolver(from);
    if (resolver) {
      doc = resolver.resolve(doc, 'editing');
    }
    return generator.generateString(doc);
  }

  /**
   * Gets file contents
   *
   * @param {Buffer} buffer
   * @return {Promise}
   */
  getFileLocation(buffer) {
    this.tmpobj = tmp.dirSync();
    return new Promise((resolve, reject) => {
      let stream = new Duplex();
      stream.push(buffer);
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
      if (header === 'RAML 1.0' || header === 'RAML 0.8') {
        return header;
      }
      if (header.indexOf('RAML 1.0 Overlay') === 0 ||
        header.indexOf('RAML 1.0 Extension') === 0) {
        return 'RAML 1.0';
      }
      return header;
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
        throw new Error('Could not recognize main API file.');
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
}

module.exports.ParserService = ParserService;

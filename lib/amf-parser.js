const amf = require('amf-client-js');
const generator = amf.Core.generator('AMF Graph', 'application/ld+json');
amf.plugins.document.WebApi.register();
amf.plugins.document.Vocabularies.register();
amf.plugins.features.AMFValidation.register();

// module.exports = function(source, from) {
//   return amf.Core.init().then(() => {
//     if (source.indexOf('http') !== 0) {
//       source = `file://${source}`;
//     }
//     let contentType;
//     switch (from) {
//       case 'RAML 1.0':
//       case 'RAML 0.8':
//         contentType = 'application/raml';
//         break;
//       case 'OAS 1.0':
//       case 'OAS 2.0':
//       case 'OAS 3.0':
//         contentType = 'application/json';
//         break;
//     }
//     const parser = amf.Core.parser(from, contentType);
//     return parser.parseFileAsync(source);
//   })
//   .then((doc) => {
//     const resolver = amf.Core.resolver(from);
//     doc = resolver.resolve(doc, 'editing');
//     return generator.generateString(doc);
//   })
//   .then((str) => JSON.parse(str));
// };
process.on('message', (data) => {
  amf.Core.init().then(() => {
    if (data.source.indexOf('http') !== 0) {
      data.source = `file://${data.source}`;
    }
    let contentType;
    switch (data.from) {
      case 'RAML 1.0':
      case 'RAML 0.8':
        contentType = 'application/raml';
        break;
      case 'OAS 1.0':
      case 'OAS 2.0':
      case 'OAS 3.0':
        contentType = 'application/json';
        break;
    }
    const parser = amf.Core.parser(data.from, contentType);
    return parser.parseFileAsync(data.source);
  })
  .then((doc) => {
    const resolver = amf.Core.resolver(data.from);
    doc = resolver.resolve(doc, 'editing');
    return generator.generateString(doc);
  })
  .then((result) => {
    process.send({api: JSON.parse(result)});
  })
  .catch((cause) => {
    let m = `AMF parser: Unable to parse the API ${this._apiFile}.\n`;
    m += cause.s$1 || cause.message;
    process.send({error: m});
  });
});

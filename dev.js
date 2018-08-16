// const parser = require('./test/raml-parser');
// // const parser = require('./test/amf-parser');
// const fs = require('fs');
//
// return parser('test/raml-example-api/api.raml', 'RAML 1.0')
// .then((data) => {
//   fs.writeFileSync('raml-out.json', JSON.stringify(data, null, 2), 'utf8');
// })
// .catch((cause) => console.error(cause));
console.log(process.argv.slice(2));

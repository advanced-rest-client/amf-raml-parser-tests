A node module to test differences between RAML JS parser and AMF parser.

Any difference exposed by this tester may potentially break the experience as
both models should have the same mount of information.

## Running tests

Step 1:

```
$ npm i
```

Step 2:

Edit `run-test.js` file and update `const apis = [...];` array.
The array contains a list of APIs to parse. Each array element contains an
array where index 0 contains the path to the RAML / OAS file and index 1
has API type name (RAML 1.0, RAML 0.8, OAS 1.0 end so on).

Step 3:

```
$ node run-test
```

## Alternative implementation

```
const {AmfJsParserTestRunner} = require('amf-raml-parser-tests');
const testInstance = new AmfJsParserTestRunner('path/to/api.raml', 'RAML 1.0');
return testInstance.run()
.then((report) => {
  console.log(report);
});
```

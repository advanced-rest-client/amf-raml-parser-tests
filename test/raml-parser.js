const raml = require('raml-1-parser');
const {RamlJsonEnhancer} = require('raml-json-enhance-node');

module.exports = function(source) {
  return raml
  .loadApi(source, {
    rejectOnErrors: false
  })
  .then((result) => {
    return result.expand(true).toJSON({
      serializeMetadata: false
    });
  })
  .then((json) => {
    const enhancer = new RamlJsonEnhancer();
    return enhancer.enhance(json);
  });
};

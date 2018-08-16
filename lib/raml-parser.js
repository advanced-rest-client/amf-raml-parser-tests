const raml = require('raml-1-parser');
const {RamlJsonEnhancer} = require('raml-json-enhance-node');

process.on('message', (data) => {
  return raml
  .loadApi(data.source, {
    rejectOnErrors: false
  })
  .then((result) => {
    console.log('Expanding the API');
    return result.expand(true).toJSON({
      serializeMetadata: false
    });
  })
  .then((json) => {
    console.log('Enhancing the API');
    const enhancer = new RamlJsonEnhancer();
    return enhancer.enhance(json);
  })
  .then((result) => {
    process.send({api: result});
  })
  .catch((cause) => {
    process.send({error: cause.message});
  });
});

const amfHelper = require('./amf-helper');
/**
 * Counts types definition in the AMF model.
 * @param {Array} amfModel
 * @return {Number}
 */
function countAmfTypes(amfModel) {
  const declares = amfHelper.computeDeclares(amfModel);
  let result = 0;
  const ids = [];
  const testItem = (item) => {
    if (amfHelper.hasType(item, amfHelper.ns.w3.shacl.shape)) {
      let name = amfHelper.getValue(item, amfHelper.ns.schema.schemaName);
      if (!name) {
        name = amfHelper.getValue(item, amfHelper.ns.w3.shacl.name + 'name');
      }
      if (!name) {
        return;
      }
      if (name.indexOf('amf_inline_type') === 0 || name === 'default') {
        // https://www.mulesoft.org/jira/browse/APIMF-972
        return;
      }
      const id = item['@id'];
      if (ids.indexOf(id) === -1) {
        result++;
        ids[ids.length] = id;
      }
    }
  };
  if (declares) {
    declares.forEach((item) => testItem(item));
  }
  const refs = amfHelper.computeReferences(amfModel);
  if (refs) {
    refs.forEach((item) => {
      const declares = amfHelper.computeDeclares(item);
      if (declares) {
        declares.forEach((item) => testItem(item));
      }
    });
  }
  return result;
}
/**
 * Counts resource types definition in the AMF model.
 * @param {Array} amfModel
 * @return {Number}
 */
function countAmfResourceTypes(amfModel) {
  const declares = amfHelper.computeDeclares(amfModel);
  let result = 0;
  const ids = [];
  const testItem = (item) => {
    if (amfHelper.hasType(item, amfHelper.ns.raml.vocabularies.document +
      'ResourceType')) {
      const id = item['@id'];
      if (ids.indexOf(id) === -1) {
        result++;
        ids[ids.length] = id;
      }
    }
  };
  if (declares) {
    declares.forEach((item) => testItem(item));
  }
  const refs = amfHelper.computeReferences(amfModel);
  if (refs) {
    refs.forEach((item) => {
      const declares = amfHelper.computeDeclares(item);
      if (declares) {
        declares.forEach((item) => testItem(item));
      }
    });
  }
  return result;
}

// "http://a.ml/vocabularies/document#ResourceType",
module.exports = {
  countAmfTypes,
  countAmfResourceTypes
};

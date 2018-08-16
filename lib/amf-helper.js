const ns = {};
// RAML namespace
ns.raml = {};
ns.raml.name = 'http://a.ml/';
ns.raml.vocabularies = {};
ns.raml.vocabularies.name = ns.raml.name + 'vocabularies/';
ns.raml.vocabularies.document = ns.raml.vocabularies.name + 'document#';
ns.raml.vocabularies.http = ns.raml.vocabularies.name + 'http#';
ns.raml.vocabularies.security = ns.raml.vocabularies.name + 'security#';
ns.raml.vocabularies.shapes = ns.raml.vocabularies.name + 'shapes#';
ns.raml.vocabularies.data = ns.raml.vocabularies.name + 'data#';
// W3 namespace
ns.w3 = {};
ns.w3.name = 'http://www.w3.org/';
ns.w3.hydra = {};
ns.w3.hydra.name = ns.w3.name + 'ns/hydra/';
ns.w3.hydra.core = ns.w3.hydra.name + 'core#';
ns.w3.xmlSchema = ns.w3.name + '2001/XMLSchema#';
// w3 types
ns.w3.shacl = {};
ns.w3.shacl.name = ns.w3.name + 'ns/shacl#';
ns.w3.shacl.in = ns.w3.shacl.name + 'in';
ns.w3.shacl.defaultValueStr = ns.w3.shacl.name + 'defaultValueStr';
ns.w3.shacl.pattern = ns.w3.shacl.name + 'pattern';
ns.w3.shacl.minInclusive = ns.w3.shacl.name + 'minInclusive';
ns.w3.shacl.maxInclusive = ns.w3.shacl.name + 'maxInclusive';
ns.w3.shacl.multipleOf = ns.w3.shacl.name + 'multipleOf';
ns.w3.shacl.minLength = ns.w3.shacl.name + 'minLength';
ns.w3.shacl.maxLength = ns.w3.shacl.name + 'maxLength';
ns.w3.shacl.fileType = ns.w3.shacl.name + 'fileType';
ns.w3.shacl.shape = ns.w3.shacl.name + 'Shape';
// Hydra shortcuts
ns.w3.hydra.supportedOperation = ns.w3.hydra.core + 'supportedOperation';
// Schema org namespace
ns.schema = {};
ns.schema.name = 'http://schema.org/';
ns.schema.schemaName = ns.schema.name + 'name';
ns.schema.desc = ns.schema.name + 'description';
ns.schema.doc = ns.schema.name + 'documentation';
ns.schema.webApi = ns.schema.name + 'WebAPI';
ns.schema.creativeWork = ns.schema.name + 'CreativeWork';
ns.schema.displayName = ns.schema.name + 'displayName';
ns.schema.title = ns.schema.name + 'title';
Object.freeze(ns.raml);
Object.freeze(ns.raml.vocabularies);
Object.freeze(ns.w3);
Object.freeze(ns.w3.hydra);
Object.freeze(ns.w3.shacl);
Object.freeze(ns.schema);
Object.freeze(ns);

/**
 * Computes list of declarations in the AMF api model.
 *
 * @param {Array|Object} model AMF json/ld model for an API
 * @return {Array<Object>} List of declarations
 */
function computeDeclares(model) {
  if (!model) {
    return;
  }
  if (model instanceof Array) {
    model = model[0];
  }
  if (!model) {
    return;
  }
  const data = model[ns.raml.vocabularies.document + 'declares'];
  return data instanceof Array ? data : undefined;
}
/**
 * Computes model's `encodes` property.
 *
 * @param {?Object} model AMF data model
 * @return {Array<Object>} List of encodes
 */
function computeEncodes(model) {
  if (!model) {
    return;
  }
  if (model instanceof Array) {
    model = model[0];
  }
  const data = model[ns.raml.vocabularies.document + 'encodes'];
  return data instanceof Array ? data : undefined;
}
/**
 * Computes list of references in the AMF api model.
 *
 * @param {Array|Object} model AMF json/ld model for an API
 * @return {Array<Object>} List of declarations
 */
function computeReferences(model) {
  if (!model) {
    return;
  }
  if (model instanceof Array) {
    model = model[0];
  }
  if (!model) {
    return;
  }
  const data = model[ns.raml.vocabularies.document + 'references'];
  return data instanceof Array ? data : undefined;
}
/**
 * Checks if a model has a type.
 * @param {Object} model Model to test
 * @param {String} type Type name
 * @return {Boolean} True if model has a type.
 */
function hasType(model, type) {
  let types = model && model['@type'] || [];
  for (let i = 0; i < types.length; i++) {
    if (types[i] === type) {
      return true;
    }
  }
  return false;
}
/**
 * Gets a signle scalar value from a model.
 * @param {Object} model Amf model to extract the value from.
 * @param {String} key Model key to search for the value
 * @return {any} Value for key
 */
function getValue(model, key) {
  let data = (model && model[key]);
  if (!data || !(data instanceof Array)) {
    return;
  }
  data = data[0];
  if (!data) {
    return;
  }
  return data['@value'];
}
/**
 * Computes AMF's `http://schema.org/WebAPI` model
 *
 * @param {Array|Object} model AMF json/ld model for an API
 * @return {Object} Web API declaration.
 */
function computeWebApi(model) {
  const enc = computeEncodes(model);
  if (!enc) {
    return;
  }
  return enc.find((item) => hasType(item, ns.schema.webApi));
}
/**
 * Computes model for an endpoint documentation.
 *
 * @param {Object} webApi Current value of `webApi` property
 * @param {String} selected Selected shape ID
 * @return {Object} An endponit definition
 */
function computeEndpointModel(webApi, selected) {
  if (!webApi || !selected) {
    return;
  }
  const endpoints = webApi[ns.raml.vocabularies.http + 'endpoint'];
  return endpoints.find((item) => item['@id'] === selected);
}
/**
 * @param {Array|Object} amf
 * @param {String} id
 * @return {Object|undefined}
 */
function _getLinkTarget(amf, id) {
  if (!amf || !id) {
    return;
  }
  const declares = computeDeclares(amf);
  if (!declares) {
    return;
  }
  let target;
  for (let i = 0; i < declares.length; i++) {
    const _ref = declares[i];
    if (_ref && _ref['@id'] === id) {
      target = _ref;
      break;
    }
  }
  if (!target) {
    return;
  }
  // Declaration may contain references
  target = resolve(amf, target);
  return target;
}
/**
 * @param {Array|Object} amf
 * @param {String} id
 * @return {Object|undefined}
 */
function getReferenceId(amf, id) {
  if (!amf || !id) {
    return;
  }
  const refs = computeReferences(amf);
  if (!refs) {
    return;
  }
  const referenceId = id.substr(0, id.lastIndexOf('#/'));
  let target;
  for (let i = 0; i < refs.length; i++) {
    const _ref = refs[i];
    if (_ref && _ref['@id'] === referenceId) {
      const enc = computeEncodes(_ref);
      if (enc) {
        for (let j = 0, encLen = enc.length; j < encLen; j++) {
          if (enc[j] && enc[j]['@id'] === id) {
            target = enc[j];
            break;
          }
        }
      }
      break;
    }
  }
  return target;
}
/**
 * @param {Array|Object} amf
 * @param {Object} shape
 */
function resolveRecursive(amf, shape) {
  Object.keys(shape).forEach((key) => {
    const currentShape = shape[key];
    if (currentShape instanceof Array) {
      for (let i = 0, len = currentShape.length; i < len; i++) {
        currentShape[i] = resolve(amf, currentShape[i]);
      }
    } else if (typeof currentShape === 'object') {
      shape[key] = resolve(amf, currentShape);
    }
  });
}

/**
 * Resolves a reference to an external fragment.
 *
 * @param {Array} amf The AMF model for the API.
 * @param {Object} shape A shape to resolve
 * @return {Object} Resolved shape.
 */
function resolve(amf, shape) {
  if (typeof shape !== 'object' || shape instanceof Array || !amf ||
    shape.__apicResolved) {
    return shape;
  }
  let refKey = ns.raml.vocabularies.document + 'link-target';
  let refValue = shape[refKey];
  let refData;
  if (refValue) {
    refData = _getLinkTarget(amf, refValue[0]['@id']);
  } else {
    refKey = ns.raml.vocabularies.document + 'reference-id';
    refValue = shape[refKey];
    if (refValue) {
      refData = getReferenceId(amf, refValue[0]['@id']);
    }
  }
  if (!refData) {
    resolveRecursive(amf, shape);
    shape.__apicResolved = true;
    return shape;
  }
  const copy = Object.assign({}, refData);
  delete copy['@id'];
  const types = copy['@type'];
  if (types) {
    if (shape['@type']) {
      shape['@type'] = shape['@type'].concat(types);
    } else {
      shape['@type'] = types;
    }
    delete copy['@type'];
  }
  Object.assign(shape, copy);
  shape.__apicResolved = true;
  resolveRecursive(amf, shape);
  return shape;
}

module.exports = {
  ns,
  computeDeclares,
  computeEncodes,
  hasType,
  getValue,
  computeWebApi,
  computeReferences,
  computeEndpointModel,
  resolve
};

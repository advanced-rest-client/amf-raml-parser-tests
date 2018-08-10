const amfHelper = require('./amf-helper');
/**
 * Counts the number of endpoints in RAML structure.
 * @param {Array} endpoints
 * @return {Number}
 */
function countRamlEndpoints(endpoints) {
  let result = 0;
  if (!endpoints || !endpoints.length) {
    return result;
  }
  for (let i = 0, len = endpoints.length; i < len; i++) {
    result++;
    if (endpoints[i].resources) {
      result += countRamlEndpoints(endpoints[i].resources);
    }
  }
  return result;
}
/**
 * Counts the number of endpoints in RAML structure.
 * @param {Array} amfModel
 * @return {Number}
 */
function countAmfEndpoints(amfModel) {
  const webApi = amfHelper.computeWebApi(amfModel);
  if (!webApi) {
    return 0;
  }
  const endpoints = webApi[amfHelper.ns.raml.vocabularies.http + 'endpoint'];
  return endpoints ? endpoints.length : 0;
}
/**
 * Computes a list of endpoints paths in AMF model
 * @param {Array} amfModel
 * @return {Array<String>}
 */
function amfPaths(amfModel) {
  const result = [];
  const webApi = amfHelper.computeWebApi(amfModel);
  if (!webApi) {
    return result;
  }
  const endpoints = webApi[amfHelper.ns.raml.vocabularies.http + 'endpoint'];
  if (!endpoints || !endpoints.length) {
    return result;
  }
  for (let i = 0, len = endpoints.length; i < len; i++) {
    const endpoint = endpoints[i];
    const path = amfHelper.getValue(endpoint,
      amfHelper.ns.raml.vocabularies.http + 'path');
    if (path) {
      result[result.length] = path;
    }
  }
  return result;
}
/**
 * Returns a list of operations for a path.
 * @param {Array} amfModel AMF model
 * @param {String} path Endpoint path
 * @return {Array<Object>}
 */
function amfOpsFromPath(amfModel, path) {
  const result = [];
  const webApi = amfHelper.computeWebApi(amfModel);
  if (!webApi) {
    return result;
  }
  const endpoints = webApi[amfHelper.ns.raml.vocabularies.http + 'endpoint'];
  if (!endpoints || !endpoints.length) {
    return result;
  }
  for (let i = 0, len = endpoints.length; i < len; i++) {
    const endpoint = endpoints[i];
    const _path = amfHelper.getValue(endpoint,
      amfHelper.ns.raml.vocabularies.http + 'path');
    if (_path !== path) {
      continue;
    }
    return endpoint[amfHelper.ns.w3.hydra.supportedOperation];
  }
  return result;
}
/**
 * Finds an endpoint definition in RAML JS struvture.
 * @param {Array<Object>|Object} endpoints
 * @param {String} path
 * @return {Object|undefined}
 */
function findEndpoint(endpoints, path) {
  if (!endpoints) {
    return;
  }
  if (!(endpoints instanceof Array)) {
    endpoints = [endpoints];
  }
  for (let i = 0, len = endpoints.length; i < len; i++) {
    const item = endpoints[i];
    let itemPath = '';
    if (item.parentUrl) {
      itemPath = item.parentUrl;
    }
    itemPath += item.relativeUri;
    if (itemPath === path) {
      return item;
    }
    if (item.resources && item.resources.length) {
      const _searchResult = findEndpoint(item.resources, path);
      if (_searchResult) {
        return _searchResult;
      }
    }
  }
}

/**
 * Returns a list of methods from a path.
 * @param {Array<Object>} endpoints
 * @param {String} path
 * @return {Array<Object>}
 */
function methodsFromPath(endpoints, path) {
  if (!endpoints) {
    return;
  }
  const endpoint = findEndpoint(endpoints, path);
  if (!endpoint) {
    return;
  }
  return endpoint.methods;
}
/**
 * Finds RAML method by it's name in the list of methods.
 * @param {String} methodName HTRTP verb
 * @param {Array<Object>} methods
 * @return {Object|undefined}
 */
function findMethodByName(methodName, methods) {
  if (!methodName || !methods || !methods.length) {
    return;
  }
  methodName = methodName.toLowerCase();
  for (let i = 0, len = methods.length; i < len; i++) {
    const method = methods[i];
    if (method.method.toLowerCase() === methodName) {
      return method;
    }
  }
}

module.exports = {
  countRamlEndpoints,
  countAmfEndpoints,
  amfPaths,
  amfOpsFromPath,
  methodsFromPath,
  findMethodByName
};

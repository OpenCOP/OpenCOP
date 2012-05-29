"use strict"

/**
 * If you need to talk to geoserver, try coming here first.
 */
var AjaxUtils = function() {

  /**
   * Return url to query opencop database for table name. If the need
   * strikes you, you can throw a CQL_FILTER on the end.
   */
  function jsonUrl(tableName) {
    var url = "/geoserver/wfs"
    url += "?request=GetFeature"
    url += "&version=1.1.0"
    url += "&outputFormat=JSON"
    url += "&typeName=opencop:"
    url += tableName
    return url
  }

  function logout() {
    Ext.Ajax.request({
      url : "/geoserver/j_spring_security_logout"
    })
  }

  /**
   * Get data from a geoserver table. These tables are slightly weird in
   * the way that you have to parse the JSON afterwards.
   */
  function getGeoserverTable(url, success, failure) {
    Ext.Ajax.request({
      url : url,
      success : _.compose(success, parseGeoserverJson),
      failure : failure
    })
  }

  /**
   * Call callback with list of all icon-join-table objects that exist
   * in the namespace_name
   */
  function getIconInfo(namespace_name, success) {
    var filter = "&CQL_FILTER=layer='" + namespace_name + "'"
    var url = jsonUrl("iconmaster") + filter
    getGeoserverTable(url, success)
  }

  /**
   * Load layers that are not part of the GetCapabilities
   */
  function getAdditionalLayers(layerGroupId, success, failure) {
    var filter = "&CQL_FILTER=layergroup='" + layerGroupId + "'"
    var url = jsonUrl("layer") + filter
    getGeoserverTable(url, success, failure)
  }

  function getDefaultLayers(success) {
    var url = jsonUrl("default_layer")
    getGeoserverTable(url, success)
  }

  function getBaseLayers(success) {
    var url = jsonUrl("baselayer")
    getGeoserverTable(url, success)
  }

  /**
   * Take a geoserver ajax response object and convert it into what
   * you'd expect: a list of javascript objects. Pulls the response out
   * of the FeatureCollection
   */
  function parseGeoserverJson(response) {
    function parseId(idStr) {
      return idStr.match(/\d*$/)[0]  // ex: "layergroup.24" -> "24"
    }

    var features = Ext.util.JSON.decode(response.responseText).features
    return _(features).map(function(feature) {
      return _(feature.properties).defaults({
        id : parseId(feature.id)
      })
    })
  }

  /**
   * Get a value from the opencop:config table. Success function is
   * called with the option value.
   *
   * This is a memotized function.
   */
  var getConfigOpt = function() {

    var opts

    function extractSetting(opts, component, name, success, failure) {
      var opt = _(opts).filter(function(item) {
        return item.component == component && item.name == name
      })[0]
      if(opt) {
        success(opt.value)
      } else {
        failure()
      }
    }

    function getDynamically(component, name, success, failure) {
      var url = jsonUrl("config")
      getGeoserverTable(url, function(options) {
        opts = options
        extractSetting(opts, component, name, success, failure)
      }, failure)
    }

    return function(component, name, success, failure) {
      if(opts) {
        extractSetting(opts, component, name, success, failure)
      } else {
        getDynamically(component, name, success, failure)
      }
    }
  }()

  return {
    getConfigOpt: getConfigOpt,
    jsonUrl: jsonUrl,
    getIconInfo: getIconInfo,
    parseGeoserverJson: parseGeoserverJson,
    getAdditionalLayers: getAdditionalLayers,
    getDefaultLayers: getDefaultLayers,
    getBaseLayers: getBaseLayers,
    logout: logout
  }
}()

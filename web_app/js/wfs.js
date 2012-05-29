"use strict"

/**
 * If is has to do with making WFS-T requests, or with the
 * confusing-ness that is the feature grid, it landed in this file.
 */
var WFS = function() {

  var rawAttributeData
  var selectedIconUrl

  function init() {
    // necessary to populate south panel attributes
    var read = OpenLayers.Format.WFSDescribeFeatureType.prototype.read
    OpenLayers.Format.WFSDescribeFeatureType.prototype.read = function() {
      rawAttributeData = read.apply(this, arguments)
      return rawAttributeData
    }
  }

  /**
   * Save the feature in the scratch vector layer through the power
   * of WFS-T, and refresh everything on the screen that touches that
   * vector layer.
   */
  function saveFeature(feature) {

    function echoResult(response) {
      if(response.error) {
        // warning: fragile array-indexing code. Fix later.
        var e = response.error.exceptionReport.exceptions[0]
        Growl.err("Save Failed", H.b(e.code) + H.p(H.code(e.texts[0])))
      } else {
        Growl.info("Save Successful", "Vector features saved.")
      }
    }

    function hasKey(obj, key) {
      return _(obj).chain().keys().include(key).value()
    }

    // Take two objects, a before and an after. Return an object that
    // represents the diff.  (Complex, nully truth table.)
    function objDiff(a, b) {
      var n = {}
      _(b).chain().keys().each(function(k) {

        // Nulls make everything more complicated.  Here's a truth table.
        //
        // null + ""  = no
        // ""   + ""  = no
        // "a"  + "a" = no
        // "a"  + ""  = include
        // null + "a" = include
        // ""   + "a" = include
        // null + "b" = include
        // ""   + "b" = include
        // "a"  + "b" = include

        var nullA = !hasKey(a, k)
        var emptyA = a[k] == ""
        var emptyB = b[k] == ""
        var equal = a[k] == b[k]

        if(!(nullA && emptyB) && !(emptyA && emptyB) && !equal) {
          n[k] = b[k]
        }
      })
      return n
    }

    // detect feature change and set state
    if(!feature.state && featureChanged(feature)) {
      feature.state = "Update"
    }

    // don't save empty attributes
    if(feature.state == "Insert" || feature.state == "Update") {
      feature.attributes = objDiff(feature.data, feature.attributes)
    }

    // commit vector layer via WFS-T
    Cop.getApp().center_south_and_east_panel.feature_table.store.proxy.protocol.commit([feature], {
      callback : function(response) {
        echoResult(response)
        Layer.refreshAllLayers()
      }
    })
  }

  function featureChanged(feature) {
    return !Utils.equalAttributes(feature.data, feature.attributes)
  }

  /**
   * Select an icon for a feature while in edit mode
   */
  function selectIcon(obj) {

    function createFeature(obj) {
      Layer.getVectorLayer().styleMap.styles["temporary"].setDefaultStyle({
        externalGraphic : selectedIconUrl,
        pointRadius : "12",
        graphicOpacity : "1"
      })
      Control.activateDrawControl()
    }

    function updateFeature(obj) {
      var popupPropertyGrid = Popup.GeoExtPopup.currentPopup().items.items[0]
      popupPropertyGrid.setProperty("default_graphic", obj.src)
      Growl.info("Default_graphic changed", H.img(obj.src) + H.br() + H.code(obj.src))
    }

    selectedIconUrl = obj.src
    if(Popup.GeoExtPopup.anyOpen()) {
      updateFeature(obj)
    } else {
      createFeature(obj)
    }
  }

  /**
   * featuregrid (south panel) to support variable fields
   * (whatever field/types the given featuretype currently has)
   */
  function makeWfsGridHeadersDynamic(store, url) {
    var fields = [], columns = [], geometryName, geometryType
    // regular expression to detect the geometry column
    var geomRegex = /gml:(Multi)?(Point|Line|Polygon|Surface|Geometry).*/
    // mapping of xml schema data types to Ext JS data types
    var types = {
      "xsd:int" : "int",
      "xsd:short" : "int",
      "xsd:long" : "int",
      "xsd:string" : "string",
      "xsd:dateTime" : "string",
      "xsd:double" : "float",
      "xsd:decimal" : "float",
      "Line" : "Path",
      "Surface" : "Polygon"
    }
    store.each(function(rec) {
      var type = rec.get("type")
      var name = rec.get("name")
      var match = geomRegex.exec(type)
      if(match) {
        // we found the geometry column
        geometryName = name
        // Geometry type for the sketch handler:
        // match[2] is "Point", "Line", "Polygon", "Surface" or "Geometry"
        geometryType = types[match[2]] || match[2]
      } else {
        // we have an attribute column
        fields.push({
          name : name,
          type : types[type]
        })
        columns.push({
          xtype : types[type] == "string" ? "gridcolumn" : "numbercolumn",
          dataIndex : name,
          header : name,
          sortable : true,
          // textfield editor for strings, numberfield for others
          editor : {
            xtype : types[type] == "string" ? "textfield" : "numberfield"
          }
        })
      }
    })
    Cop.getApp().center_south_and_east_panel.feature_table.reconfigure(new GeoExt.data.FeatureStore({
      autoLoad : true,
      proxy : new GeoExt.data.ProtocolProxy({
        protocol : new OpenLayers.Protocol.WFS({
          url : url,
          version : "1.1.0",
          featureType : rawAttributeData.featureTypes[0].typeName,
          featureNS : rawAttributeData.targetNamespace,
          srsName : "EPSG:900913",
          geometryName : geometryName,
          maxFeatures : 250
        })
      }),
      fields : fields
    }), new Ext.grid.ColumnModel(columns))
    Cop.getApp().center_south_and_east_panel.feature_table.store.bind(Layer.getVectorLayer())
    Cop.getApp().center_south_and_east_panel.feature_table.getSelectionModel().bind(Layer.getVectorLayer())
    if(Layer.getVectorLayer().strategies == null) {
      Layer.getVectorLayer().strategies = [new OpenLayers.Strategy.BBOX({
        resFactor : 1
      })];
    }
    // Set the correct sketch handler according to the geometryType
    Control.setDrawControlHandler(geometryType)
  }

  function populateWfsGrid(layer) {
    if(!layer.url) {
      // basically, not really a WFS layer -- probably KML
      return
    }
    LoadingIndicator.start("populateWfsGrid")
    // the base url without params
    var baseUrl = layer.url.split("?")[0]
    //baseUrl = baseUrl.replace(/wms/, "wfs")
    new GeoExt.data.AttributeStore({
      url : baseUrl,
      // request specific params
      baseParams : {
        "SERVICE" : "WFS",
        "REQUEST" : "DescribeFeatureType",
        "VERSION" : "1.1.0",
        "TYPENAME" : layer.params.LAYERS
      },
      autoLoad : true,
      listeners : {
        "load" : function(store) {
          // make DescribeFeatureType results available to vectorLayer
          Layer.getVectorLayer().store = store
          Cop.getApp().center_south_and_east_panel.feature_table.setTitle(layer.name)
          WFS.makeWfsGridHeadersDynamic(store, baseUrl)
        }
      }
    })
    LoadingIndicator.stop("populateWfsGrid")
  }

  function getSelectedIconUrl() {
    return selectedIconUrl
  }

  return {
    init: init,
    saveFeature: saveFeature,
    selectIcon: selectIcon,
    getSelectedIconUrl: getSelectedIconUrl,
    featureChanged: featureChanged,
    makeWfsGridHeadersDynamic: makeWfsGridHeadersDynamic,
    populateWfsGrid: populateWfsGrid
  }
}()
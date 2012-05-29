"use strict"

var Layer = function() {

  var refreshInterval = 30000  // ms
  var vectorLayer

  function getUrl(opts) {// relies on global "username"
    var url = "/geoserver/rest/proxy?url=" + opts.url
    if(Popup.getUsername()) {
      url += "?username=" + Popup.getUsername()
    }
    return url
  }

  function buildKmlLayer(opts) {
    var kmlLayer = new OpenLayers.Layer.Vector(opts.name, {
      projection : new OpenLayers.Projection("EPSG:4326"),
      strategies : [new OpenLayers.Strategy.Fixed()],
      protocol : new OpenLayers.Protocol.HTTP({
        url : getUrl(opts),
        format : new OpenLayers.Format.KML({
          extractStyles : true,
          extractAttributes : true,
          maxDepth : 2
        })
      })
    })
    kmlLayer.style = Style.getNext()
    kmlLayer.fullUrl = opts.url
    return kmlLayer
  }

  function buildWmsLayer(opts) {
    var wms = new OpenLayers.Layer.WMS(opts.name, opts.url, {
      layers : opts.layers,
      transparent : "true",
      'random' : Math.random(),
      format : "image/png"
    }, {
      isBaseLayer : false
    })
    wms.events.on({
      "loadstart" : function() {
        LoadingIndicator.start("loadwms")
      },
      "loadend" : function() {
        LoadingIndicator.stop("loadwms")
      }
    })
    return wms
  }

  function buildOlLayer(opts) {

    if(opts.type == "KML") {
      return buildKmlLayer(opts)
    } else if(opts.type == "WMS") {
      return buildWmsLayer(opts)
    }

    throw "Unrecognized type: " + opts.type + "."
  }

  function initScratchLayer() {
    vectorLayer = new OpenLayers.Layer.Vector('Editable features', {
      'styleMap' : new OpenLayers.StyleMap({
        "default" : new OpenLayers.Style({
          pointRadius : 16, // sized according to type attribute
          fillColor : "66CCFF",
          strokeColor : "blue",
          strokeWidth : 3,
          fillOpacity : 0.25
        }),
        "select" : new OpenLayers.Style({
          graphicName : "cross",
          pointRadius : "16",
          fillColor : "66CCFF",
          strokeColor : "blue",
          strokeWidth : 3
        })
      }),
      'displayInLayerSwitcher' : false
    })
  }

  function refreshAllLayers() {
    var layers = Cop.getApp().center_south_and_east_panel.map_panel.map.layers
    for(var i = layers.length - 1; i >= 0; --i) {
      refreshLayer(layers[i])
    }
    if(Panel.editFeaturesActive()) {
      Cop.getApp().center_south_and_east_panel.feature_table.store.reload()
    }
  }

  function refreshLayer(layer) {
    if(layer.CLASS_NAME == "OpenLayers.Layer.WMS") {
      layer.mergeNewParams({
        'random' : Math.random()
      })
    } else if(layer.CLASS_NAME == "OpenLayers.Layer.Vector" && layer.name != "Editable features") {
      layer.refresh({
        force : true,
        params : {
          'random' : Math.random()
        }
      })
    }
  }

  function autoRefreshLayers() {
    refreshAllLayers()
    setTimeout(autoRefreshLayers, refreshInterval)
  }

  /**
   * Grab the refresh interval from the server, and start
   * auto-layer-refresh going.
   */
  function startAutoRefreshLayersSystem() {
    AjaxUtils.getConfigOpt("map", "refreshInterval", function(interval) {
      refreshInterval = parseInt(interval)
      autoRefreshLayers()
    }, autoRefreshLayers)
  }

  function getVectorLayer() {
    return vectorLayer
  }

  /**
   * Add any kind of layer to the map
   *   - base layer
   *   - record
   *   - olLayer
   */
  function addLayer(obj) {

    // In the following, the record id MUST be set to the layer id by hand.
    // The automatic value is incorrect.  If this isn't done:
    // 1.  Bring up the layer info box
    // 2.  Delete the layer from the layer tree

    function layer_to_record(olLayer) {
      var record = new GeoExt.data.LayerRecord()
      record.setLayer(olLayer)
      record.id = olLayer.id
      return record
    }

    function isWmsLayer(obj) {
      return obj.CLASS_NAME == "OpenLayers.Layer.WMS"
    }

    function isKmlLayer(obj) {
      return obj.CLASS_NAME == "OpenLayers.Layer.Vector"
    }

    function forceToRecord(obj) {
      if(obj.isBaseLayer || isWmsLayer(obj) || isKmlLayer(obj)) {
        return layer_to_record(obj)
      }
      if(obj.getLayer) {
        obj.id = obj.data.layer.id
        return obj
      }
      return layer_to_record(obj.data.layer)
    }

    function isKml(obj) {
      return obj && obj.data && obj.data.type == "KML"
    }

    if(isKml(obj)) {
      Control.KML.addLayer(obj.data.layer)
    }

    Cop.getApp().center_south_and_east_panel.map_panel.layers.add([forceToRecord(obj)])
  }

  function loadBaseLayers() {

    function addBaseLayer(opts) {
      switch(opts.brand.toLowerCase().trim()) {
        case "google" :
          addGoogleBaseLayer(opts);
          break
        case "yahoo"  :
          addYahooBaseLayer(opts);
          break
        case "osm"    :
          addOSMBaseLayer(opts);
          break
      }
    }

    function addGoogleBaseLayer(opts) {
      var type
      switch(opts.type.toLowerCase().trim()) {
        case "streets"   :
          type = google.maps.MapTypeId.STREETS;
          break
        case "hybrid"    :
          type = google.maps.MapTypeId.HYBRID;
          break
        case "satellite" :
          type = google.maps.MapTypeId.SATELLITE;
          break
        case "physical"  :
          type = google.maps.MapTypeId.TERRAIN;
          break
      }
      addLayer(new OpenLayers.Layer.Google(opts.name, {
        sphericalMercator : true,
        transitionEffect : 'resize',
        type : type,
        isBaseLayer : true,
        baselayer : true, // change to 'group'
        // numZoomLevels: opts.numzoomlevels,  // see issue 46
        visible : opts.isdefault
      }))
    }

    function addYahooBaseLayer(opts) {
      addLayer(new OpenLayers.Layer.Yahoo(opts.name, {
        sphericalMercator : true,
        isBaseLayer : true,
        baselayer : true
      }))
    }

    function addOSMBaseLayer(opts) {
      var urls = ["http://a.tile.openstreetmap.org/${z}/${x}/${y}.png", "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png", "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png"];

      if(null != opts.type && "mapquest" == opts.type.toLowerCase().trim()) {
        urls = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png", "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png", "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png", "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"];
      }

      addLayer(new OpenLayers.Layer.OSM(opts.name, urls, {
        isBaseLayer : true,
        baselayer : true
      }));
    }

    AjaxUtils.getBaseLayers(function(layersOpts) {

      _(layersOpts).each(addBaseLayer)

      // the default base layer must be set in the layer box by hand
      _(layersOpts).chain().filter(function(opts) {
        return opts.isdefault
      }).each(function(opts) {
        Panel.checkBaseLayer(opts.name)
      })
    })
  }

  function refreshVectorLayerAndFeatureGrid() {

    if(!Cop.getApp()) {
      return
    }

    Popup.GeoExtPopup.closeAll()
    LoadingIndicator.start("refreshVectorLayerAndFeatureGrid")
    var grid = Cop.getApp().center_south_and_east_panel.feature_table
    if(Panel.queryFeaturesActive() || Panel.editFeaturesActive()) {
      var node = Panel.currentlySelectedLayerNode()
      if(node && node.layer) {
        WFS.populateWfsGrid(node.layer)
        Layer.getVectorLayer().parentLayer = node.layer
      }
    }
    grid[Panel.queryFeaturesActive() ? "expand" : "collapse"]()// isn't this cute?
    Layer.getVectorLayer().removeAllFeatures()// needed for query tab
    LoadingIndicator.stop("refreshVectorLayerAndFeatureGrid")
  }

  var DefaultLayers = function() {

    /**
       * Get all user layers, return as OpenLayers objects.
       *
       * By user layers we mean
       * - not base layers
       * - not the scratch vector layer
       * - not other layers that may be created for the benefit of obscure controls
       */
    function getAllUserLayers () {
      var layers = Cop.getApp().center_south_and_east_panel.map_panel.map.layers
      return _(layers).filter(function(layer) {
        // If a controller makes a layer, it has a 'layers' param.
        // The scratch layer has 'displayInLayerSwitcher = false'.
        return !layer.baselayer && !layer.layers && layer.displayInLayerSwitcher
      })
    }

    function serializeActiveLayers() {
      return _(getAllUserLayers()).map(function(layer) {
        return serializeLayer(layer)
      })
    }

    function serializeLayer(layer) {
      if(isKml(layer)) {
        return {
          type: "KML",
          name: layer.name,
          url: layer.fullUrl
        }
      } else if(isWms(layer)) {
        return {
          type: "WMS",
          name: layer.name,
          layers: layer.params.LAYERS,
          url: layer.url
        }
      } else {
        throw "Unrecognized layer type"
      }
    }

    function isKml(layer) {
      return layer.features
    }

    function isWms(layer) {
      return layer.params.SERVICE == "WMS"
    }

    function loadLayers() {
      AjaxUtils.getDefaultLayers(function(layers) {
        _(layers).each(function(layerOpts) {
          Layer.addLayer(Layer.buildOlLayer(layerOpts))
        })
      })
    }

    return {
      serializeActiveLayers: serializeActiveLayers,
      loadLayers: loadLayers
    }
  }()

  function configureMapEvents() {

    Cop.getApp().center_south_and_east_panel.map_panel.map.events.on({
      //      "loadstart" : function() {
      //       LoadingIndicator.start()
      //      },
      //      "loadend" : function() {
      //        LoadingIndicator.stop()
      //      },
      "movestart" : function() {
        LoadingIndicator.start("move")
      },
      "moveend" : function() {
        LoadingIndicator.stop("move")
      },
      "preaddlayer" : function(e) {
        LoadingIndicator.start("(pre/post)addlayer")
      },
      "postaddlayer" : function(e) {
        LoadingIndicator.stop("(pre/post)addlayer")
      },
      "addlayer" : function(e) {
        LoadingIndicator.stop("(pre/post)addlayer")
      }
    })
  }

  return {
    buildOlLayer: buildOlLayer,
    initScratchLayer: initScratchLayer,
    autoRefreshLayers: autoRefreshLayers,
    refreshAllLayers: refreshAllLayers,
    refreshLayer: refreshLayer,
    startAutoRefreshLayersSystem: startAutoRefreshLayersSystem,
    getVectorLayer: getVectorLayer,
    loadBaseLayers: loadBaseLayers,
    DefaultLayers: DefaultLayers,
    refreshVectorLayerAndFeatureGrid: refreshVectorLayerAndFeatureGrid,
    configureMapEvents: configureMapEvents,
    addLayer: addLayer
  }
}()

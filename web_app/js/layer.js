var Layer = function() {

  function getUrl(opts) {// relies on global "username"
    var url = "/geoserver/rest/proxy?url=" + opts.url
    if(cop.username) {
      url += "?username=" + cop.username
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

  return {
    buildOlLayer: buildOlLayer
  }
}()
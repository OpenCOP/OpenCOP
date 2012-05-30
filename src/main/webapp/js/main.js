"use strict";

var Cop = function() {

  var app

  var init = function() {
    Popup.optionallyDisplayLoginPopup()

    OpenLayers.ProxyHost = "/geoserver/rest/proxy?url="
    Ext.BLANK_IMAGE_URL = "/opencop/lib/ext-3.4.0/resources/images/default/s.gif"
    Ext.state.Manager.setProvider(new Ext.state.CookieProvider())

    Layer.initScratchLayer()

    // init app
    app = new Ext.Viewport({
      layout : 'border',
      items : BuildPanels.buildAll()
    })

    Layer.configureMapEvents()
    WFS.init()
    Panel.configureLayerTreeEvents()
    Control.configFeatureTableSelectionModel()
    Layer.loadBaseLayers()
    Layer.DefaultLayers.loadLayers()
    Layer.startAutoRefreshLayersSystem()
  }

  function getApp() {
    return app
  }

  return {
    init : init,
    getApp: getApp
  }
}()

Ext.onReady(function() {
  if(devMode) {
    refresh.init()
  }
  Cop.init()
  if(devMode) {
    test.run()
    Log.enable()
  }
})

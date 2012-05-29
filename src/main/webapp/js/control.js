"use strict"

/**
 * OpenLayers controls are weird.
 */
var Control = function() {

  var modifyControl
  var wmsGetFeatureInfoControl
  var selectFeatureControl
  var drawControl

  /**
   * When a KML layer is selected, we wanted to be able to select
   * from any KML layer. To do that, we have to create a Select
   * Feature with a list of KML layers. When we want to change that
   * list, we rebuild the Select Feature control.
   *
   * This class/singleton wraps the Select Feature control, and
   * manages the list of KML layers.
   */
  var KML = function() {

    var layers = []
    var control = null

    function rebuildControl() {
      var map = Cop.getApp().center_south_and_east_panel.map_panel.map

      if(control) {
        map.removeControl(control)
      }

      if(layers.length == 0) {
        return
      }
      control = new OpenLayers.Control.SelectFeature(layers, {
        onSelect : createKmlPopup,
        onUnselect : function(feature) {
          feature.popup.close()
        }
      })
      map.addControl(control)
    }

    function createKmlPopup(feature) {
      var popup = Popup.GeoExtPopup.create({
        title : "View KML Feature",
        height : 300,
        width : 300,
        layout : "fit",
        map : Cop.getApp().center_south_and_east_panel.map_panel,
        location : feature,
        maximizable : true,
        collapsible : true,
        items : [new Ext.grid.PropertyGrid({
          listeners : {
            "beforeedit" : function(e) {
              e.cancel = true
            }
          }, // prevent editing
          title : feature.fid,
          customRenderers : Utils.fmap(feature.attributes, function() {
            return wrapInPopupDiv
          }), // allow rendering html
          source : feature.attributes
        })],
        buttons : [{
          text : 'Close',
          iconCls : 'silk_cross',
          handler : function() {
            popup.close()
          }
        }]
      })
      feature.popup = popup// so we can close the popup on unselect
      popup.show()
    }

    function wrapInPopupDiv(text) {
      return _("<div class='in-popup'><%=s%></div>").template({
        s : text
      })
    }

    function activate() {
      if(control) {
        control.activate()
      }
    }

    function deactivate() {
      if(control) {
        control.deactivate()
      }
    }

    function addLayer(kmlLayer) {
      layers.push(kmlLayer)
      rebuildControl()
    }

    function removeLayer(kmlLayer) {
      layers = _(layers).reject(function(layer) {
        return layer.name == kmlLayer.name
      })
      rebuildControl()
    }

    function refresh() {
      deactivate();
      activate()
    }

    return {
      addLayer : addLayer,
      removeLayer : removeLayer,
      activate : activate,
      deactivate : deactivate,
      refresh : refresh
    }
  }()

  /**
   * Sometimes which controls are activated gets pretty messed up.
   * This function attempts to set everything back to something
   * stable.
   *
   * This function could equally be called "hammer time".
   *
   * Called whenever:
   * - a layer is added, deleted, or selected
   * - any of the three panels are selected
   */
  function refreshControls() {

    if(!Cop.getApp()) {
      return
    }

    function currentLayerType() {
      var layerRecord = Panel.currentlySelectedLayerRecord()
      if(!layerRecord) {
        return null
      }
      if(layerRecord.id.match("WMS")) {
        return "WMS"
      }
      if(layerRecord.id.match("Google")) {
        return "Google"
      }
      if(layerRecord.id.match("Yahoo")) {
        return "Yahoo"
      }
      return "KML"
    }

    function isBaseLayer(type) {
      return type == "Google" || type == "Yahoo"
    }

    function wms_on() {
      wmsGetFeatureInfoControl.activate()
    }

    function vec_on() {
      selectFeatureControl.activate()
    }

    function kml_on() {
      Control.KML.refresh()
    }

    // drw_on() doesn't exist because drawControl is *only* activated when
    // the user selects an icon on the edit tab

    function wms_off() {
      wmsGetFeatureInfoControl.deactivate()
    }

    function vec_off() {
      selectFeatureControl.deactivate()
    }

    function kml_off() {
      Control.KML.deactivate()
    }

    function drw_off() {
      drawControl.deactivate()
    }

    function all_off() {
      wms_off()
      vec_off()
      kml_off()
      drw_off()
    }

    var legendPanel = Cop.getApp().west.selected_layer_panel.tabs.legend_panel
    var editPanel = Cop.getApp().west.selected_layer_panel.tabs.edit_features

    var mode = Panel.currentModePanel()
    var type = currentLayerType()

    if(isBaseLayer(type)) {
      Panel.moveToDetailsTab()
      legendPanel.disable()
      editPanel.disable()
    } else {
      legendPanel.enable()
      editPanel.enable()
    }

    if(mode == "edit_features" && type == "WMS") {
      wms_off()
      vec_on()
      kml_off()
    } else {
      wms_on()
      vec_off()
      kml_on()
    }

    drw_off()
  }

  function cancelEditWfs(feature) {

    if(WFS.featureChanged(feature)) {
      Growl.info("Changes cancelled", "Changes to vector have been cancelled.")
    }

    feature.popup.close()
    if(feature.state == "Insert") {
      Layer.getVectorLayer().removeFeatures([feature])
    } else {
      // reset attributes and position
      //
      // All that really needs to happen here is resetting the
      // attributes and geometry.  Attributes can be reset with
      // "feature.data = feature.attributes".  If we knew how to reset
      // the geom, this could be more efficient.
      Layer.refreshAllLayers()
    }
  }

  function buildControls() {

    var controls = [new OpenLayers.Control.Navigation(), new OpenLayers.Control.Attribution(), new OpenLayers.Control.PanPanel(), new OpenLayers.Control.ZoomPanel(), new OpenLayers.Control.MousePosition()]

    modifyControl = new OpenLayers.Control.ModifyFeature(Layer.getVectorLayer(), {
      autoActivate : true
    })
    controls.push(modifyControl)

    drawControl = new OpenLayers.Control.DrawFeature(Layer.getVectorLayer(), OpenLayers.Handler.Point, {
      featureAdded : Popup.createWfsPopup
    })
    controls.push(drawControl)

    selectFeatureControl = new OpenLayers.Control.SelectFeature(Layer.getVectorLayer(), {
      onSelect : Popup.createWfsPopup,
      onUnselect : cancelEditWfs
    })
    controls.push(selectFeatureControl)

    // get feature info (popup)
    wmsGetFeatureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
      autoActivate : true,
      infoFormat : "text/html",
      vendorParams : {
        buffer : 10
      }, //geoserver param, don't have to click dead center, I believe ESRI
      // ignores it
      maxFeatures : 5, // Zach says this is a reasonable number [t06dec'11]ish
      queryVisible : true, //only send the request for visible layers
      eventListeners : {
        "getfeatureinfo" : function(e) {
          var bodyIsEmpty = /<body>\s*<\/body>/.test(e.text)
          if(!bodyIsEmpty)
            Popup.GeoExtPopup.create({
              title : "Feature Info",
              width : 300,
              height : 300,
              layout : "fit",
              map : Cop.getApp().center_south_and_east_panel.map_panel,
              location : e.xy,
              items : [{
                xtype : 'box',
                autoScroll : true,
                autoEl : {
                  html : e.text
                }
              }]
            }).show()
        }
      }
    })
    controls.push(wmsGetFeatureInfoControl)
    return controls
  }

  function getModifyControl() {
    return modifyControl
  }

  function activateDrawControl() {
    drawControl.activate()
  }

  function deactivateDrawControl() {
    drawControl.deactivate()
  }

  function setDrawControlHandler(geometryType) {
    drawControl.handler = new OpenLayers.Handler[geometryType](drawControl, drawControl.callbacks, drawControl.handlerOptions)
  }

  function configFeatureTableSelectionModel() {
    var sm = Cop.getApp().center_south_and_east_panel.feature_table.getSelectionModel()
    sm.unbind()
    sm.bind(getModifyControl().selectControl)
    sm.on("beforerowselect", function() {
      sm.clearSelections()
    })
  }

  return {
    KML: KML,
    refreshControls: refreshControls,
    buildControls: buildControls,
    cancelEditWfs: cancelEditWfs,
    getModifyControl: getModifyControl,
    activateDrawControl: activateDrawControl,
    deactivateDrawControl: deactivateDrawControl,
    setDrawControlHandler: setDrawControlHandler,
    configFeatureTableSelectionModel: configFeatureTableSelectionModel
  }
}()
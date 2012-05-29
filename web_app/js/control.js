/**
 * OpenLayers controls are weird.
 */
var Control = function() {

  var app

  function init(extApp) {
    app = extApp
  }

  /**
   * When a KML layer is selected, we wanted to be able to select
   * from any KML layer. To do that, we have to create a Select
   * Feature with a list of KML layers. When we want to change that
   * list, we rebuild the Select Feature control.
   *
   * This class/singleton wraps the Select Feature control, and
   * manages the list of KML layers.
   */
  KML = function() {

    var layers = []
    var control = null

    function rebuildControl() {
      var map = app.center_south_and_east_panel.map_panel.map

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
        map : app.center_south_and_east_panel.map_panel,
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

  return {
    init: init,
    KML: KML
  }
}()
var app

Ext.onReady(function() {
  app = new Ext.Viewport({
    layout : "border",
    defaults : {
      autoscroll : true,
    },
    items: [
      getToolbar(), 
      getMapPanel(), 
      getLayerTree(), 
      getFeatureTable(),
      getLegend()
    ]
  })
})

// main components

function getToolbar() {
  return new Ext.Toolbar({
    region : "north",
    height : 28,
    items : [{
      width : 90,
      iconCls : 'opencop_logo',
      disabled : true
    }]
  })
}

function getMapPanel() {
  var vectorLayer = new OpenLayers.Layer.Vector(
      'Editable features',
      {'displayInLayerSwitcher' : false})
  var controls = [
    new OpenLayers.Control.Navigation(),
    new OpenLayers.Control.Attribution(),
    new OpenLayers.Control.PanPanel(),
    new OpenLayers.Control.ZoomPanel()
  ]
  var modifyControl = new OpenLayers.Control.ModifyFeature(
        vectorLayer,
        { autoActivate: true })
  controls.push(modifyControl)
  var drawControl = new OpenLayers.Control.DrawFeature(
        vectorLayer,
        OpenLayers.Handler.Point)
  controls.push(drawControl)
  var selectFeatureControl = new OpenLayers.Control.SelectFeature(
        vectorLayer,
        { onSelect: createWfsPopup,
          onUnselect: GeoExtPopup.closeAll })
  controls.push(selectFeatureControl)
  var WMSGetFeatureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
    autoActivate: true,
    infoFormat: "application/vnd.ogc.gml",
    vendorParams: { buffer: 10 },  //geoserver param, don't have to click dead center, I believe ESRI ignores it
    maxFeatures: 3,  // zach?  Is 3 a good number?  Is this unhardcodeable?  Seems reasonable enough
    eventListeners: {
      "getfeatureinfo": function(e) {
        var items = []
        Ext.each(e.features, function(feature) {
          items.push({
            xtype: "propertygrid",
            title: feature.fid,
            listeners: { "beforeedit": function(e) { e.cancel = true }}, // prevent editing
            source: feature.attributes
          })
        })
        GeoExtPopup.create({
          title: "Feature Info",
          width: 300,
          height: 300,
          layout: "accordion",
          map: app.center_south_and_east_panel.map_panel,
          location: e.xy,
          items: items
        }).show()
      }
    }
  })
  controls.push(WMSGetFeatureInfoControl)
  var map = {
    xtype: "gx_mappanel",
    ref: "map_panel",
    id: "map_panel",
    region: "center",
    map: {
      numZoomLevels: 19,
      projection        : new OpenLayers.Projection("EPSG:900913" ),
      displayProjection : new OpenLayers.Projection("EPSG:4326"   ),
      units             : "m",
      numZoomLevels     : 21,
      maxResolution     : 156543.0339,
      tileSize          : new OpenLayers.Size(512,512),
      maxExtent : new OpenLayers.Bounds(-20037508, -20037508,
                                         20037508,  20037508.34),
      controls: controls
    },
    extent : new OpenLayers.Bounds(-10918469.080342, 2472890.3987378,
                                   -9525887.0459675, 6856095.3481128),
    layers: [
      new OpenLayers.Layer.Google("Google Streets", {
        sphericalMercator: true,
        transitionEffect: 'resize',
        baselayer: true
      })
      // new OpenLayers.Layer.Google("Google Hybrid", {
      //   sphericalMercator: true,
      //   transitionEffect: 'resize',
      //   type: G_HYBRID_MAP,
      //   baselayer: true
      // })
      // new OpenLayers.Layer.Google("Google Physical", {
      //   type: G_PHYSICAL_MAP,
      //   baselayer: true
      // }),
      // new OpenLayers.Layer.Google("Google Satellite", {
      //   type: G_SATELLITE_MAP,
      //   baselayer: true
      // })
    ],
  }
  return map
}

function getLayerTree() {
  var layerTree = new Ext.tree.TreeNode({ 
    text: "All Layers", 
    expanded: true 
  })
  layerTree.appendChild(new GeoExt.tree.OverlayLayerContainer({
    text: "Overlays",
    expanded: true,
    allowDrag: false,
    iconCls: "geosilk_folder_layer"
  }))
  layerTree.appendChild(new GeoExt.tree.BaseLayerContainer({
    text: "Base Layers",
    expanded: true,
    allowDrag: false,
    allowDrop: false,
    iconCls: "geosilk_folder_map"
  }))
  var tree_panel = {
    xtype: "treepanel",
    ref: "tree_panel",
    width : 200,
    region : "west",
    autoScroll: true,
    containerScroll: true,
    animate: true,
    enableDD: true,
    split: true,
    root: layerTree,
    rootVisible: false,
    tbar: [
      {
        text : 'Add',
        iconCls : 'silk_add',
        disabled : true
        //handler: displayAvailableLayers
      }, '-', {
        text: "Delete",
        iconCls: 'silk_delete',
        disabled: true
      }]
  }
  return tree_panel
}

function getFeatureTable() {
  var feature_table = {
    xtype: "editorgrid",
    ref: "feature_table",
    iconCls: 'silk_table_find',
    split: true,
    region: "south",
    height: 200,
    sm: new GeoExt.grid.FeatureSelectionModel(),
    store: new GeoExt.data.FeatureStore({
      fields: [],
      proxy: new GeoExt.data.ProtocolProxy({
        protocol: new OpenLayers.Protocol.WFS({
          url: "/geoserver/ows",
          version: "1.1.0"
        })
      })
    }),
    columns: [],
  }
  return feature_table
}

function getLegend() {
  legend = new GeoExt.LegendPanel({
    region: 'east',
    split: true,
    defaults: {
      labelCls: 'mylabel',
      style: 'padding:5px'
    },
    bodyStyle: 'padding:5px',
    width: 200,
  });
  return legend
}

// popups

function createWfsPopup(feature) {
  if (queryFeaturesActive()) {
    // Our current thinking says that the query panel shouldn't be opening
    // its own popups.
    //    createQueryWfsPopup(feature)
  } else if (editFeaturesActive()) {
    createEditWfsPopup(feature)
  }
}

// "classes"

// This "class" ensures that only a single GeoExt popup will be
// available at a time.
var GeoExtPopup = function() {
  var singletonPopup = null

  function close() {
    if (singletonPopup) singletonPopup.close()
  }

  return {

    // Static factory method.  Opts is the massive options hash
    // that GeoExt.popup takes.
    create: function(opts) {
      close()
      singletonPopup = new GeoExt.Popup(opts)
      return singletonPopup
    },

    // Close all GeoExt.popups on the map.
    closeAll: function() {
      close()
      singletonPopup = null
    }
  }
}()

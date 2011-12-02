// vim shortcut
//   nmap R :call Send_to_Tmux("./silent_local_deploy\n")<CR>

var app

Ext.onReady(function() {

  //  displayAvailableLayers()
  displayLoginPopup()

  // Construct all the stuff:

  Ext.BLANK_IMAGE_URL = "/opencop/lib/ext-3.4.0/resources/images/default/s.gif"
  Ext.state.Manager.setProvider(new Ext.state.CookieProvider())

  var vectorLayer = new OpenLayers.Layer.Vector(
      'Editable features',
      {'displayInLayerSwitcher' : false})

  function createWfsPopup(feature) {
    if (queryFeaturesActive()) {
      // Our current thinking says that the query panel shouldn't be opening
      // its own popups.
      //    createQueryWfsPopup(feature)
    } else if (editFeaturesActive()) {
      createEditWfsPopup(feature)
    }
  }

  function createEditWfsPopup(feature) {

    var propertyGrid = new Ext.grid.PropertyGrid({
      title: feature.fid,
      source: feature.attributes
    })

    var popup = GeoExtPopup.create({
      title: "Edit WFS-T Feature",
      height: 300,
      width: 300,
      layout: "fit",
      map: app.center_south_and_east_panel.map_panel,
      location: feature,
      maximizable: true,
      collapsible: true,
      items: [propertyGrid],
      buttons: [{
        text: 'Cancel',
        iconCls: 'silk_cross',
        handler: function() {
          popup.close()
        }
      }, {
        text: 'Save',
        iconCls: 'silk_tick',
        handler: function() {
          propertyGrid.stopEditing()  // prevent having to click off field to save in IE
          saveVectorLayer()
          popup.close()
        }
      }]
    })
    popup.show()
  }

  function vectorLayerContainsFeature(vectorLayer, feature) {
    return OpenLayers.Util.indexOf(vectorLayer.selectedFeatures, feature) > -1
  }

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

  // get feature info (popup)
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

  var map_panel = {
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
    ]
  }

  var menu_bar = new Ext.Toolbar({
    region: 'north',
    height: 28,
    items: [{
      width: 90,
      iconCls: 'opencop_logo',
      handler: displayAppInfo
    }, '-', {
      text: 'Load View',
        iconCls: 'silk_map_go',
      disabled: true
    }, {
      text: 'Save View',
      iconCls: 'geosilk_map_save',
      disabled: true
    }, '-', {
      text: 'Zoom In',
      iconCls: 'silk_zoom_in',
      handler: function() {
        app.center_south_and_east_panel.map_panel.map.zoomIn()
      }
    }, {
      text: 'Zoom Out',
      iconCls: 'silk_zoom_out',
      handler: function() {
        app.center_south_and_east_panel.map_panel.map.zoomOut()
      }
    }, {
      text: 'Zoom to Me',
      iconCls: 'silk_zoom_to_me',
      handler: function() {
        // IE doesn't support geolocation (at least the IE that I have)
        // so just return out.
        if( navigator == null || navigator.geolocation == null ) { return }

        var handler = function(location) {
          var zoom = 14  // zoom level (higher number is closer in to the ground)

          // Get an OpenLayers LonLat from the location passed in from the browser.
          var lonlat = new OpenLayers.LonLat(
            location.coords.longitude,
            location.coords.latitude
          )

          // Convert the LonLat to the map's projection
          lonlat.transform(
            app.center_south_and_east_panel.map_panel.map.displayProjection,
            app.center_south_and_east_panel.map_panel.map.getProjectionObject()
          )

          // Set the center and zoom level of the map object
          app.center_south_and_east_panel.map_panel.map.setCenter(
            lonlat,
            zoom
          )
        }

        // call to the browser's geolocation utility
        navigator.geolocation.getCurrentPosition( handler )
      }
    }, '-', {
      text: 'Hide Side Panel(s)',
      iconCls: 'silk_arrow_out',
      toggle: true,
      handler: function() {
        app.west.collapse(true)
        this.setText("Show Side Panel(s)")
      }
    }, '->', {
      text: 'Help',
      iconCls: 'silk_help',
      handler: displayHelp
    }, '-', {
      text: 'Print',
      iconCls: 'silk_printer',
      disabled: true
    }, '-', {
      text: 'Application Settings',
      iconCls: 'silk_cog_edit',
      handler: displayApplicationSettings
    }, '-', {
      text: 'My Settings',
      iconCls: 'silk_user_edit',
      handler: displayMySettings
    }, '-', {
      text: 'Log In',
      iconCls: 'silk_user_go',
      disabled: true
    }, ' ']
  })

  function addSelectedAvailableLayerToLayerTree() {  // apologies for long name
    app.center_south_and_east_panel.east_panel.available_layers.getSelectionModel().each(function(record) {
      var clone = record.clone()
      clone.getLayer().mergeNewParams({
        format: "image/png",
        transparent: true
      })
      app.center_south_and_east_panel.map_panel.layers.add(clone)
    })
  }

  var layerTree = new Ext.tree.TreeNode({ text: "All Layers", expanded: true })
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
    autoScroll: true,
    animate: true,
    containerScroll: true,
    enableDD: true,
    margins: '0 0 0 5',
    ref: "tree_panel",
    region: 'center',
    split: true,
    xtype: "treepanel",
    root: layerTree,
    rootVisible: false,
    tbar: [
      {
        text: 'Add',
        iconCls: 'silk_add',
        handler: displayAvailableLayers
      }, '-', {
        text: "Delete",
        iconCls: 'silk_delete',
        disabled: true
// this was working functionality but broke at some point
//        handler: function() {
//          var node = currentlySelectedLayerNode()
//          if (node && node.layer instanceof OpenLayers.Layer.WMS) {
//            app.center_south_and_east_panel.map_panel.map.removeLayer(node.layer)
//          }
//        }
      }]
  }

  var layerDetail = {
    ref: "layer_detail",
    title: 'Details',
    cls: 'layer_detail',
    autoScroll: true,
    iconCls: "silk_information",
    frame: true,
    padding: '10 10 10 10',
    listeners: {
      "activate": function() {
        WMSGetFeatureInfoControl.activate()
        selectFeatureControl.deactivate()
        refreshVectorLayerAndFeatureGrid()
      }},
    items: [{
      xtype: 'box',
      autoEl: {
        tag: 'h1',
        id: 'layer-description-title',
        html: '-- No layer selected --'
      }
    }, {
      xtype: 'box',
      autoEl: {
        tag: 'h2',
        html: 'Opacity'
      }
    }, {
      xtype: "gx_opacityslider",
      ref: "opacity_slider",
      aggressive: true,
      changevisibility: true,
      value: 100
    }, {
      xtype: 'box',
      autoEl: {
        tag: 'h2',
        html: 'Layer Description'
      }
    }, {
      xtype: 'box',
      autoEl: {
        tag: 'p',
        id: 'layer_description',
        html: "N/A"
      }
    }]
  }

  var editFeaturesPanel = {
    ref: "edit_features",
    title: 'Edit',
    autoScroll: true,
    iconCls: "silk_pencil",
    padding: '10 10 10 10',
    frame: 'true',
    listeners: {
      "activate": function() {
        WMSGetFeatureInfoControl.deactivate()
        selectFeatureControl.activate()
        refreshVectorLayerAndFeatureGrid() }},
    items: [{
      xtype: 'box',
      autoEl: {
        tag: 'h1',
        html: 'Future Home of the Edit Features Panel'
      }
    }, {
      xtype: 'box',
      autoEl: {
        tag: 'p',
        html: "It'll <em>also</em> be awesome. Really, trust us <em>again</em>. Awesome!"
      }
    }]
  }

  var selected_layer_panel = {
    title: "Selected Layer",
    region: "south",
    ref: 'selected_layer_panel',
    iconCls: "silk_selected_layer",
    layout: "fit",
    height: 300,
    collapsible: true,
    collapsed: true,
    split: true,
    items: [{
      xtype: 'tabpanel',
      ref: "tabs",
      activeTab: 0,
      items: [layerDetail, editFeaturesPanel]
    }]
  }

  var west_panel = {
    ref: "west",
    region: 'west',
    autoScroll: true,
    collapsible: true,
    id: 'west-panel',
    iconCls: 'silk_layers',
    margins: '0 0 0 5',
    split: true,
    layout: 'border',
    title: 'Active Layers',
    items: [tree_panel, selected_layer_panel],
    width: 225
  }

  var feature_table = {
    xtype: "editorgrid",
    ref: "feature_table",
    title: "Features",
    collapsed: true,
    collapsible: true,
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
    bbar: []
  }

  var center_south_and_east_panel = {
    autoScroll: true,
    ref: "center_south_and_east_panel",
    region: 'center',
    split: true,
    layout: 'border',
    items: [map_panel, feature_table]
  }

  // init app
  var app = new Ext.Viewport({
    layout: 'border',
    items: [menu_bar, west_panel, center_south_and_east_panel]
  })

  // build scratch, vector layer
  app.center_south_and_east_panel.map_panel.map.addLayer(vectorLayer)
  app.center_south_and_east_panel.feature_table.store.bind(vectorLayer)
  app.center_south_and_east_panel.feature_table.getSelectionModel().bind(vectorLayer)

  // necessary to populate south panel attributes
  var rawAttributeData
  var read = OpenLayers.Format.WFSDescribeFeatureType.prototype.read
  OpenLayers.Format.WFSDescribeFeatureType.prototype.read = function() {
    rawAttributeData = read.apply(this, arguments)
    return rawAttributeData
  }

  // featuregrid (south panel) to support variable fields
  // (whatever field/types the given featuretype currently has)
  function makeWfsGridHeadersDynamic(store, url) {
    var fields = [], columns = [], geometryName, geometryType
      // regular expression to detect the geometry column
      var geomRegex = /gml:(Multi)?(Point|Line|Polygon|Surface|Geometry).*/
      // mapping of xml schema data types to Ext JS data types
      var types = {
        "xsd:int": "int",
        "xsd:short": "int",
        "xsd:long": "int",
        "xsd:string": "string",
        "xsd:dateTime": "string",
        "xsd:double": "float",
        "xsd:decimal": "float",
        "Line": "Path",
        "Surface": "Polygon"
      }
    store.each(function(rec) {
      var type = rec.get("type")
      var name = rec.get("name")
      var match = geomRegex.exec(type)
      if (match) {
        // we found the geometry column
        geometryName = name
      // Geometry type for the sketch handler:
      // match[2] is "Point", "Line", "Polygon", "Surface" or "Geometry"
      geometryType = types[match[2]] || match[2]
      } else {
        // we have an attribute column
        fields.push({
          name: name,
        type: types[type]
        })
        columns.push({
          xtype: types[type] == "string" ?
          "gridcolumn" :
          "numbercolumn",
        dataIndex: name,
        header: name,
        sortable: true,
        // textfield editor for strings, numberfield for others
        editor: {
          xtype: types[type] == "string" ?
          "textfield" :
          "numberfield"
        }
        })
      }
    })
    app.center_south_and_east_panel.feature_table.reconfigure(new GeoExt.data.FeatureStore({
      autoLoad: true,
      proxy: new GeoExt.data.ProtocolProxy({
        protocol: new OpenLayers.Protocol.WFS({
          url: url,
          version: "1.1.0",
          featureType: rawAttributeData.featureTypes[0].typeName,
          featureNS: rawAttributeData.targetNamespace,
          srsName: "EPSG:900913",
          geometryName: geometryName,
          maxFeatures: 250
        })
      }),
      fields: fields
    }), new Ext.grid.ColumnModel(columns))
    app.center_south_and_east_panel.feature_table.store.bind(vectorLayer)
    app.center_south_and_east_panel.feature_table.getSelectionModel().bind(vectorLayer)

    // Set the correct sketch handler according to the geometryType
    drawControl.handler = new OpenLayers.Handler[geometryType](
      drawControl,
      drawControl.callbacks,
      drawControl.handlerOptions
    )
  }

  // fired on layer selection in the selection tree
  function setLayer() {
    refreshLayerDetailsPanel()
    refreshVectorLayerAndFeatureGrid()
  }

  function refreshLayerDetailsPanel() {
    var layerRecord = currentlySelectedLayerRecord()
    Ext.get('layer-description-title').update(layerRecord.data.title)
    Ext.get('layer_description').update(layerRecord.data.abstract)
    app.west.selected_layer_panel.tabs.layer_detail.opacity_slider.setLayer(layerRecord.getLayer())
    app.west.selected_layer_panel.expand()
  }

  function refreshVectorLayerAndFeatureGrid() {
    if(!app) return  // app isn't defined until later
    GeoExtPopup.closeAll()
    var grid = app.center_south_and_east_panel.feature_table
    if(queryFeaturesActive() || editFeaturesActive()) {
      var node = currentlySelectedLayerNode()
      if(node && node.layer) populateWfsGrid(node.layer)
    }
    grid[queryFeaturesActive() ? "expand" : "collapse"]()  // isn't this cute?
    vectorLayer.removeAllFeatures()  // needed for query tab
  }

  function currentlySelectedLayerNode() {
    return app.west.tree_panel.getSelectionModel().getSelectedNode()
  }

  function currentlySelectedLayerRecord() {
    var node = currentlySelectedLayerNode()
    return node.layerStore.getById(node.layer.id)
  }

  function populateWfsGrid(layer) {
    var url = layer.url.split("?")[0] // the base url without params
    var schema = new GeoExt.data.AttributeStore({
      url: url,
      // request specific params
      baseParams: {
        "SERVICE": "WFS",
        "REQUEST": "DescribeFeatureType",
        "VERSION": "1.1.0",
        "TYPENAME": layer.params.LAYERS
      },
      autoLoad: true,
      listeners: {
        "load": function(store) {
          app.center_south_and_east_panel.feature_table.setTitle(layer.name)
          makeWfsGridHeadersDynamic(store, url)
        }
      }
    })
  }

  app.west.tree_panel.getSelectionModel().on("selectionchange", setLayer)

  var bbar = app.center_south_and_east_panel.feature_table.getBottomToolbar()
  bbar.add([
    {
      text: "Delete",
      handler: function() {
        app.center_south_and_east_panel.feature_table.store.featureFilter = new OpenLayers.Filter({
          evaluate: function(feature) {
            return feature.state != OpenLayers.State.DELETE
          }
        })
        app.center_south_and_east_panel.feature_table.getSelectionModel().each(function(rec) {
          var feature = rec.getFeature()
          modifyControl.unselectFeature(feature)
          vectorLayer.removeFeatures([feature])
          if (feature.state != OpenLayers.State.INSERT) {
            feature.state = OpenLayers.State.DELETE
            vectorLayer.addFeatures([feature])
          }
        })
      }
    },
    new GeoExt.Action({
      control: drawControl,
      text: "Create",
      enableToggle: true
    }),
    {
      text: "Save",
      handler: saveVectorLayer
    }])
  bbar.doLayout()

  var sm = app.center_south_and_east_panel.feature_table.getSelectionModel()
  sm.unbind()
  sm.bind(modifyControl.selectControl)
  sm.on("beforerowselect", function() { sm.clearSelections() })

  // ---------------------------------------------------------------
  // UTILITY FUNCTIONS
  //
  // Utility functions that require onReady scope
  // (generally meaning "including app")
  //


  function add_SelectedAvailableLayers_To_ActiveLayers(available_layers_window) {
    available_layers_window.available_layers_grid.getSelectionModel().each(function(record) {
      var clone = record.clone()
      clone.getLayer().mergeNewParams({
        format: "image/png",
        transparent: true
      })
      app.center_south_and_east_panel.map_panel.layers.add(clone)
    })
  }

  // Save all features in the scratch vector layer through the power of WFS-T,
  // and refresh everything on the screen that touches that vector layer.
  function saveVectorLayer() {

    // if feature has changed (and not by update or delete), change its
    // state to reflect that
    Ext.each(vectorLayer.features, function(n) {
      if (!n.state && !equalAttributes(n.data, n.attributes)) {
        n.state = "Update"
      }
    })

    // commit vector layer via WFS-T
    app.center_south_and_east_panel.feature_table.store.proxy.protocol.commit(
      vectorLayer.features,
      {
        callback: function() {
          // refresh everything the user sees
          var layers = app.center_south_and_east_panel.map_panel.map.layers
          for (var i = layers.length - 1; i >= 0; --i) {
            layers[i].redraw(true)
          }
          app.center_south_and_east_panel.feature_table.store.reload()
        }
      }
    )
  }

  function displayLoginPopup() {
    var loginPopup = new Ext.Window({
      title: "Welcome to OpenCOP",
      iconCls: "geocent_logo",
      modal: true,
      layout: "fit",
      width: 325,
      height: 150,
      items: [
        new Ext.FormPanel({
          labelWidth: 75,
          // label settings here cascade unless overridden
          url: 'save-form.php',
          frame: true,
          bodyStyle: 'padding:5px 5px 0',
          defaults: {
            width: 200
          },
          defaultType: 'textfield',
          items: [
            {
              fieldLabel: 'Username',
              name: 'username',
              allowBlank: false
            }, {
              fieldLabel: 'Password',
              name: 'password',
              inputType: "password"
            }
          ],
          buttons: [
            {
              text: 'Log In',
              iconCls: 'silk_user_go',
              disabled: true
            }, {
              text: 'Enter as Guest',
              iconCls: 'silk_door_in',
              handler: function() {
                loginPopup.hide() 
                displayAvailableLayers()
              }
            }
          ]
        })
      ]
    })
    loginPopup.show()
  }

  function displayAvailableLayers() {
    var available_layers_window = new Ext.Window({
      title: "Add Layers to the Map",
      iconCls: 'geosilk_layers_add',
      modal: true,
      layout: "fit",
      width: 800,
      height: 600,
      listeners: {
        // close available layers window when user clicks on
        // anything that isn't the window
        show: function() {
          Ext.select('.ext-el-mask').addListener('click', function() {
            available_layers_window.close();
          });
        }
      },
      items: [{
        xtype: "grid",
        ref: 'available_layers_grid',
        margins: '0 5 0 0',
        layout: 'fit',
        viewConfig: {
          forceFit: true
        },
        listeners: { "rowdblclick": function() {
            add_SelectedAvailableLayers_To_ActiveLayers(available_layers_window)}},
        store: new GeoExt.data.WMSCapabilitiesStore({
          url: "/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.1.1",
          autoLoad: true,
          sortInfo:{field: 'prefix', direction: "ASC"}
        }),
        columns: [{
          header: "Layer Group",
          dataIndex: "prefix",
          width: 150,
          sortable: true
        }, {
          header: "Title",
          dataIndex: "title",
          width: 250,
          sortable: true
        }, {
          header: "Abstract",
          dataIndex: "abstract",
          width: 600,
          sortable: true
        }]
      }],
      buttons: [{
          text: "Add to Map",
          iconCls: 'silk_add',
          handler: function() {
            add_SelectedAvailableLayers_To_ActiveLayers(available_layers_window)
          }
        }, '-', {
        text: 'Done',
        iconCls: 'silk_tick',
        handler: function() {
          available_layers_window.hide()
        }
      }]
    })
    available_layers_window.show()
  }

  function currentModePanel() { return app.west.selected_layer_panel.tabs.getActiveTab().initialConfig.ref }
  function queryFeaturesActive() { return currentModePanel() == 'query_features' }
  function editFeaturesActive()  { return currentModePanel() == 'edit_features' }
  function layerDetailActive()   { return currentModePanel() == 'layer_detail' }
    
})

// Objects with the same keys and values (excluding functions) are equal.
//   Example: {a: 1, :b: 2} == {a: 1, :b: 2} != {a: 1, b: 2, c: 3}.
function equalAttributes(objA, objB) {
  // Yes, I feel bad about how hacky this is.  But it seems to work.
  return Ext.encode(objA) === Ext.encode(objB)
}

function displayAppInfo() {
  var win = new Ext.Window({
    title: "About OpenCOP",
    iconCls: "geocent_logo",
    modal: true,
    layout: "fit",
    width: 400,
    height: 400,
    items: [{
      html: '<p><img src="/opencop/images/OpenCOP_logo_32.png"></p><br><p class="about-text">OpenCOP is a richly-featured, interactive open source mapping tool which allows users to identify and view incident data in near real-time, creating a common operational picture (COP) of an event. OpenCOP was created by Geocent, LLC.  </p> <br /> <p class="about-text"> For more information on Geocent, please visit us online at <a href="http://www.geocent.com" target="_blank">www.geocent.com</a>.  For information or technical support, email us at <a href="mailto:OpenCop@geocent.com">OpenCop@geocent.com</a> or call (800) 218-9009.</p> <br/> <p class="version"> Version 2.0.0.</p>',
      padding: '10 10 10 10'
    }],
    buttons: [{
      text: 'Done',
      iconCls: 'silk_tick',
      handler: function() {
        win.hide()
      }
    }]
  })
  win.show()
}

function displayHelp() {
  var win = new Ext.Window({
    title: "Help",
    iconCls: "silk_help",
    modal: true,
    layout: "fit",
    width: 800,
    height: 600,
    items: [{
      html: "<p>This is where the help docs will go. They will be really nice.</p>",
      padding: '10 10 10 10'
    }],
    buttons: [{
      text: 'Done',
      iconCls: 'silk_tick',
      handler: function() {
        win.hide()
      }
    }]
  })
  win.show()
}

function displayApplicationSettings() {
  var win = new Ext.Window({
    title: "Application Settings",
    iconCls: 'silk_cog_edit',
    modal: true,
    layout: "fit",
    width: 800,
    height: 600,
    items: [{
      html: "<p>Coming soon!</p>",
      padding: '10 10 10 10'
    }],
    buttons: [{
      text: 'Done',
      iconCls: 'silk_tick',
      handler: function() {
        win.hide()
      }
    }]
  })
  win.show()
}

function displayMySettings() {
  var win = new Ext.Window({
    title: "My Settings",
    iconCls: 'silk_user_edit',
    modal: true,
    layout: "fit",
    width: 400,
    height: 400,
    items: [{
      html: "<p>This is where you'll be able to change your password and administer any other settings associated with your account. It'll be cool.",
      padding: '10 10 10 10'
    }],
    buttons: [{
      text: 'Save Changes',
      iconCls: 'silk_tick',
      handler: function() {
        win.hide()
      }
    }, {
      text: 'Cancel',
      iconCls: 'silk_cross',
      handler: function() {
        win.hide()
      }
    }]
  })
  win.show()
}

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

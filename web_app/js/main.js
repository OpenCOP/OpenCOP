"use strict";

var Cop = function() {

  var app
  var selectedIconUrl
  var username// null means guest

  // select an icon for a feature while in edit mode
  var selectIcon = function(obj) {

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
      Growl.info("Default_graphic changed", h.img(obj.src) + h.br() + h.code(obj.src))
    }

    selectedIconUrl = obj.src
    if(Popup.GeoExtPopup.anyOpen()) {
      updateFeature(obj)
    } else {
      createFeature(obj)
    }
  }

  var init = function() {
    optionallyDisplayLoginPopup()

    OpenLayers.ProxyHost = "/geoserver/rest/proxy?url="
    Ext.BLANK_IMAGE_URL = "/opencop/lib/ext-3.4.0/resources/images/default/s.gif"
    Ext.state.Manager.setProvider(new Ext.state.CookieProvider())

    Layer.initScratchLayer()

    var map_panel = {
      xtype : "gx_mappanel",
      ref : "map_panel",
      id : "map_panel",
      region : "center",
      map : {
        // numZoomLevels: 19,  // see issue 46
        projection : new OpenLayers.Projection("EPSG:900913"),
        displayProjection : new OpenLayers.Projection("EPSG:4326"),
        units : "m",
        maxResolution : 156543.0339,
        tileSize : new OpenLayers.Size(256, 256),
        maxExtent : new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34),
        controls : Control.buildControls()
      },
      extent : new OpenLayers.Bounds(-10918469.080342, 2472890.3987378, -9525887.0459675, 6856095.3481128),
      layers : [Layer.getVectorLayer()],
      items : [{
        xtype : "gx_zoomslider",
        aggressive : false,
        vertical : true,
        height : 100
      }]
    }

    var menu_bar = new Ext.Toolbar({
      id : "top_menu_bar",
      ref : "top_menu_bar",
      region : 'north',
      height : 28,
      items : [{
        width : 90,
        iconCls : 'opencop_logo',
        handler : Popup.displayAppInfo
      }, '-', {
        text : 'Zoom to Me',
        iconCls : 'silk_zoom_to_me',
        handler : function() {
          // IE doesn't support geolocation (at least the IE that I have)
          // so just return out.
          if(navigator == null || navigator.geolocation == null) {
            return
          }

          var handler = function(location) {
            var zoom = 14// zoom level (higher number is closer in to the
            // ground)

            // Get an OpenLayers LonLat from the location passed in from the
            // browser.
            var lonlat = new OpenLayers.LonLat(location.coords.longitude, location.coords.latitude)

            // Convert the LonLat to the map's projection
            lonlat.transform(app.center_south_and_east_panel.map_panel.map.displayProjection, app.center_south_and_east_panel.map_panel.map.getProjectionObject())

            // Set the center and zoom level of the map object
            app.center_south_and_east_panel.map_panel.map.setCenter(lonlat, zoom)
          }
          // call to the browser's geolocation utility
          navigator.geolocation.getCurrentPosition(handler)
        }
      }, '-',
      //Doesn't work
      // {
      //    text: 'Hide Side Panel',
      //    iconCls: 'silk_arrow_left',
      //    toggle: true,
      //    handler: function() {
      //      app.west.collapse(true)
      //      this.setText("Show Side Panel")
      //    }
      // },
      '->', {
        ref : "loading_text",
        id : "loading_text",
        xtype : "tbtext",
        text : "Loading..."
      }, {
        text : 'Application Settings',
        iconCls : 'silk_cog_edit',
        handler : function() {
          window.open("/geoserver", "geoserver")
        }
      }, '-', {
        text : 'Log Out',
        iconCls : 'silk_user_go',
        handler : function() {
          AjaxUtils.logout()
          location.reload(true)
        }
      }, ' ']
    })
    //initially we want the loading text to be hidden
    menu_bar.loading_text.hide()

    var layerTree = new Ext.tree.TreeNode({
      text : "All Layers",
      expanded : true
    })
    layerTree.appendChild(new GeoExt.tree.LayerContainer({
      text : "Overlays",
      expanded : true,
      allowDrag : false,
      isTarget : false,
      iconCls : "geosilk_folder_layer",
      loader : {
        filter : function(record) {
          var layer = record.get("layer")
          return !layer.baselayer && layer.displayInLayerSwitcher
        }
      }
    }))
    layerTree.appendChild(new GeoExt.tree.BaseLayerContainer({
      text : "Base Layers",
      expanded : true,
      allowDrag : false,
      allowDrop : false,
      iconCls : "geosilk_folder_map"
    }))

    var tree_panel = {
      autoScroll : true,
      animate : true,
      containerScroll : true,
      enableDD : true, // messes with base layers funtionality
      margins : '0 0 0 5',
      ref : "tree_panel",
      region : 'center',
      split : true,
      xtype : "treepanel",
      root : layerTree,
      rootVisible : false,
      listeners : {

        // The geoext/openlayers system doesn't automatically update the
        // internal baselayer settings when the user makes a selection in the
        // layer tree.  Therefore, we have to do that by hand here.
        //
        // This fixes the "I zoom out, but the base layer doesn't always zoom
        // out" problem (Issue #34).
        "checkchange" : function(node, checked) {
          var layer = node.layer
          if(layer.baselayer && checked) {
            var map = app.center_south_and_east_panel.map_panel.map
            map.setBaseLayer(layer)
          }
        }
      },

      tbar : [{
        text : 'Add',
        iconCls : 'silk_add',
        handler : displayAvailableLayers
      }, '-', {
        text : "Delete",
        iconCls : 'silk_delete',
        disabled : false,
        handler : function() {
          var node = Panel.currentlySelectedLayerNode()
          if(node) {
            app.center_south_and_east_panel.map_panel.map.removeLayer(node.layer)
            shutdownDetailsPane()
            Control.KML.removeLayer(node.layer)
            Control.refreshControls()
          }
        }
      }]
    }

    var layerDetail = {
      ref : "layer_detail",
      title : 'Details',
      cls : 'selected-layer-panel',
      autoScroll : true,
      iconCls : "silk_information",
      frame : true,
      listeners : {
        "activate" : function() {
          refreshVectorLayerAndFeatureGrid()
          Control.refreshControls()
        }
      },
      items : [{
        xtype : 'box',
        cls : "selected-layer-title",
        autoEl : {
          tag : 'h1',
          id : 'layer-description-title',
          html : '-- No layer selected --'
        }
      }, {
        xtype : 'box',
        autoEl : {
          tag : 'h2',
          html : 'Opacity'
        }
      }, {
        xtype : "gx_opacityslider",
        ref : "opacity_slider",
        aggressive : true,
        animate : false, // slider gets extremely jacked up if you let it
        // animate
        changevisibility : true
      }, {
        xtype : 'box',
        autoEl : {
          tag : 'h2',
          html : 'Layer Description'
        }
      }, {
        xtype : 'box',
        autoEl : {
          tag : 'p',
          id : 'layer_description',
          html : "N/A"
        }
      }]
    }

    var legendPanel = {
      ref : "legend_panel",
      id : "legend_panel",
      title : 'Legend',
      cls : 'selected-layer-panel',
      autoScroll : true,
      iconCls : "silk_book_open",
      frame : true,
      listeners : {
        "activate" : function() {
          refreshVectorLayerAndFeatureGrid()
          Control.refreshControls()
          Legend.refreshLegendPanel()
        }
      },
      items : [{
        xtype : 'tbbutton',
        cls : "legend-popout-button",
        icon : 'images/misc_icons/popout.png',
        listeners : {
          'click' : Legend.buildPopoutLegendPopup
        }
      }, {
        xtype : 'box',
        cls : "selected-layer-title",
        autoEl : {
          tag : 'h1',
          id : 'legend_layer_title'
        }
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'h2',
          id : 'legend_combo_box_title',
          html : 'Style'
        }
      }, {
        xtype : 'container',
        cls : "selected-layer-padding",
        ref : 'legend_combo_box_panel'
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'h2',
          id : 'legend_style_title'
        }
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'p',
          id : 'legend_style_abstract'
        }
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'img',
          id : 'legend_style_graphic',
          src : ""
        }
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'h2',
          id : 'elevation_combo_box_title',
          html : 'Elevation'
        }
      }, {
        xtype : 'container',
        cls : "selected-layer-padding",
        ref : 'elevation_combo_box_panel'
      }, {
        xtype : 'box',
        cls : "selected-layer-padding",
        autoEl : {
          tag : 'h2',
          id : 'time_combo_box_title',
          html : 'Time'
        }
      }, {
        xtype : 'container',
        cls : "selected-layer-padding",
        ref : 'time_combo_box_panel'
      }]
    }

    var editFeaturesPanel = {
      ref : "edit_features",
      title : 'Edit',
      cls : 'selected-layer-panel',
      autoScroll : true,
      iconCls : "silk_pencil",
      frame : 'true',
      listeners : {
        "activate" : function() {
          populateIcons()
          refreshVectorLayerAndFeatureGrid()
          Control.refreshControls()
          refreshLayerEditPanel()
        }
      },
      items : [{
        xtype : 'box',
        cls : "selected-layer-title",
        autoEl : {
          tag : 'h1',
          id : 'layer-edit-title',
          html : '-- No layer selected --'
        }
      }, {
        xtype : 'box',
        autoEl : {
          tag : 'h1',
          html : 'Click on a Highlighted Feature to Edit'
        }
      }, {
        xtype : 'box',
        autoEl : {
          tag : 'p',
          html : "Click on an Icon Below and then Click on the map to place it"
        }
      }, {
        xtype : "box",
        id : "available_icons"
      }]
    }

    var selected_layer_panel = {
      title : "Selected Layer",
      region : "south",
      ref : 'selected_layer_panel',
      iconCls : "silk_selected_layer",
      layout : "fit",
      height : 300,
      collapsible : true,
      collapsed : true,
      split : true,
      items : [{
        xtype : 'tabpanel',
        enableTabScroll : true,
        ref : "tabs",
        activeTab : 0,
        items : [layerDetail, editFeaturesPanel, legendPanel]
      }]
    }

    var west_panel = {
      ref : "west",
      region : 'west',
      autoScroll : true,
      collapsible : true,
      id : 'west-panel',
      iconCls : 'silk_layers',
      margins : '0 0 0 5',
      split : true,
      layout : 'border',
      title : 'Active Layers',
      items : [tree_panel, selected_layer_panel],
      width : 225
    }

    // ON THE CUTTING BLOCK
    var feature_table = {
      hidden : true, // until we properly delete it
      xtype : "editorgrid",
      ref : "feature_table",
      title : "Features",
      collapsed : true,
      collapsible : true,
      iconCls : 'silk_table_find',
      split : true,
      region : "south",
      height : 200,
      sm : new GeoExt.grid.FeatureSelectionModel(),
      store : new GeoExt.data.FeatureStore({
        fields : [],
        proxy : new GeoExt.data.ProtocolProxy({
          protocol : new OpenLayers.Protocol.WFS({
            url : "/geoserver/ows",
            version : "1.1.0"
          })
        })
      }),
      columns : [],
      bbar : []
    }

    var center_south_and_east_panel = {
      autoScroll : true,
      ref : "center_south_and_east_panel",
      region : 'center',
      split : true,
      layout : 'border',
      items : [map_panel, feature_table]
    }

    // init app
    app = new Ext.Viewport({
      layout : 'border',
      items : [menu_bar, west_panel, center_south_and_east_panel]
    })

    app.center_south_and_east_panel.map_panel.map.events.on({
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
      app.center_south_and_east_panel.feature_table.reconfigure(new GeoExt.data.FeatureStore({
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
      app.center_south_and_east_panel.feature_table.store.bind(Layer.getVectorLayer())
      app.center_south_and_east_panel.feature_table.getSelectionModel().bind(Layer.getVectorLayer())
      if(Layer.getVectorLayer().strategies == null) {
        Layer.getVectorLayer().strategies = [new OpenLayers.Strategy.BBOX({
          resFactor : 1
        })];
      }
      // Set the correct sketch handler according to the geometryType
      Control.setDrawControlHandler(geometryType)
    }

    // fired on layer selection in the selection tree
    function setLayer() {
      refreshLayerDetailsPanel()
      refreshVectorLayerAndFeatureGrid()
      Control.refreshControls()
      Legend.refreshLegendPanel()
      refreshLayerEditPanel()
    }

    function moveToDetailsTab() {
      if(!app) {
        return
      }
      app.west.selected_layer_panel.tabs.setActiveTab(0)
    }

    function refreshLayerEditPanel() {
      var layerRecord = Panel.currentlySelectedLayerRecord()
      if(!layerRecord) {
        return
      }

      var layerEditTitle = Ext.get('layer-edit-title')
      if(!layerEditTitle) {
        return
      }
      layerEditTitle.update(layerRecord.data.title)
    }

    function refreshLayerDetailsPanel() {
      var layerRecord = Panel.currentlySelectedLayerRecord()
      if(!layerRecord) {
        return
      }

      var layer = layerRecord.getLayer()
      var slider = app.west.selected_layer_panel.tabs.layer_detail.opacity_slider

      Ext.get('layer-description-title').update(layerRecord.data.title)
      Ext.get('layer_description').update(layerRecord.data.abstract)
      slider.setLayer(layer)
      app.west.selected_layer_panel.expand()
      populateIcons()

      // No, this line doesn't really make any sense.  The min value is always
      // 0.  But without it, the slider often shows up on the wrong position.
      //
      // I believe that this line forces the slider to redraw.  More sensible
      // options, like show(), enable(), render(), or redraw() either don't
      // work or don't have the desired effect.
      //
      // This hack only works if animate is false.
      slider.setMinValue(0)
    }

    function populateIcons() {
      var layerRecord = Panel.currentlySelectedLayerRecord()
      if(!layerRecord) {
        return
      }
      var available_icons_div = Ext.get('available_icons')
      if(!available_icons_div) {
        // div is "lazy loaded first time" edit panel is viewed; prior
        // to that, the div won't exist
        return
      }
      displayIconsFor(layerRecord.data.name)
    }

    function displayIconsFor(layerName) {
      AjaxUtils.getIconInfo(layerName, function(listOfHashes) {

        function icons(listOfHashes) {
          Ext.DomHelper.overwrite("available_icons", {
            tag : "table",
            id : "available_icons_table"
          })
          var templateHtml = "<tr>" + "<td><img src='{url}' alt='{name}' onclick='Cop.selectIcon(this)'/></td>" + "<td>{name}</td>" + "</tr>"
          var tpl = new Ext.Template(templateHtml)
          tpl.compile()
          _(listOfHashes).each(function(item) {
            tpl.append('available_icons_table', item)
          })
        }

        function noIcons() {
          var img = "<img src='/opencop/images/silk/add.png' onclick='Cop.selectIcon(this)' />"
          Ext.DomHelper.overwrite("available_icons", {
            tag : "p",
            id : "available_icons_table",
            html : img
          })
        }

        if(_(listOfHashes).isEmpty()) {
          noIcons()
        } else {
          icons(listOfHashes)
        }
      })
    }

    function refreshVectorLayerAndFeatureGrid() {

      if(!app) {
        return // app isn't defined until later
      }

      Popup.GeoExtPopup.closeAll()
      LoadingIndicator.start("refreshVectorLayerAndFeatureGrid")
      var grid = app.center_south_and_east_panel.feature_table
      if(Panel.queryFeaturesActive() || Panel.editFeaturesActive()) {
        var node = Panel.currentlySelectedLayerNode()
        if(node && node.layer) {
          populateWfsGrid(node.layer)
          Layer.getVectorLayer().parentLayer = node.layer
        }
      }
      grid[Panel.queryFeaturesActive() ? "expand" : "collapse"]()// isn't this cute?
      Layer.getVectorLayer().removeAllFeatures()// needed for query tab
      LoadingIndicator.stop("refreshVectorLayerAndFeatureGrid")
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
            app.center_south_and_east_panel.feature_table.setTitle(layer.name)
            makeWfsGridHeadersDynamic(store, baseUrl)
          }
        }
      })
      LoadingIndicator.stop("populateWfsGrid")
    }

    function shutdownDetailsPane() {
      moveToDetailsTab()
      app.west.selected_layer_panel.collapse()
      app.west.tree_panel.getSelectionModel().clearSelections()
    }

    function configureLayerTreeEvents() {

      var suppressNextClick = false

      function onUncheckLayer(layer) {
        var isActiveVectorLayer = (Layer.getVectorLayer().parentLayer && layer.id == Layer.getVectorLayer().parentLayer.id)
        if(isActiveVectorLayer) {
          shutdownDetailsPane()
        }
      }

      app.west.tree_panel.getSelectionModel().on("selectionchange", setLayer)
      app.west.tree_panel.on("beforeclick", function(node) {
        if(node.isSelected()) {
          suppressNextClick = true
        }
      })
      app.west.tree_panel.on("click", function(node) {
        if(suppressNextClick) {
          shutdownDetailsPane()
          suppressNextClick = false
        }
      })

      app.west.tree_panel.on("checkchange", function(node, justChecked) {
        if(!justChecked) {
          onUncheckLayer(node.layer)
        }
      })
    }

    configureLayerTreeEvents()

    var sm = app.center_south_and_east_panel.feature_table.getSelectionModel()
    sm.unbind()
    sm.bind(Control.getModifyControl().selectControl)
    sm.on("beforerowselect", function() {
      sm.clearSelections()
    })

    /* ---------------------------------------------------------------
     * UTILITY FUNCTIONS
     *
     * Utility functions that require onReady scope
     * (generally meaning "including app")
     */

    /**
     * Display login popup, if this instance of opencop is configured
     * for that sort of thing.
     */
    function optionallyDisplayLoginPopup() {
      AjaxUtils.getConfigOpt("security", "showLogin", function(showLogin) {
        if(showLogin == "true") {
          displayLoginPopup()
        } else {
          optionallyDisplayAvailableLayers()
        }
      }, displayLoginPopup)
    }

    function optionallyDisplayAvailableLayers() {
      AjaxUtils.getConfigOpt("map", "showLayers", function(showLayers) {
        if(showLayers == "true") {
          displayAvailableLayers()
        }
      }, displayAvailableLayers)
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
        var layers = app.center_south_and_east_panel.map_panel.map.layers
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
            addLayer(Layer.buildOlLayer(layerOpts))
          })
        })
      }

      return {
        serializeActiveLayers: serializeActiveLayers,
        loadLayers: loadLayers
      }
    }()

    function featureChanged(feature) {
      return !Utils.equalAttributes(feature.data, feature.attributes)
    }

    function displayLoginPopup() {
      var loginPopup = new Ext.Window({
        title : "Welcome to OpenCOP",
        iconCls : "geocent_logo",
        modal : true,
        layout : "fit",
        width : 325,
        height : 150,
        listeners : {
          // close available layers window when user clicks on
          // anything that isn't the window
          show : function() {
            Ext.select('.ext-el-mask').addListener('click', function() {
              loginPopup.close()
              optionallyDisplayAvailableLayers()
            })
          }
        },
        items : [new Ext.FormPanel({
          labelWidth : 75,
          ref : "loginForm",
          frame : true,
          monitorValid : true,
          bodyStyle : 'padding:5px 5px 0',
          defaults : {
            width : 200
          },
          defaultType : 'textfield',
          items : [{
            fieldLabel : 'Username',
            name : 'username',
            ref : "username",
            allowBlank : false,
            listeners : {
              afterrender : function(field) {
                // True = select existing text in box.
                // Delay (ms).
                field.focus(false, 100)
              }
            }
          }, {
            fieldLabel : 'Password',
            name : 'password',
            ref : "password",
            inputType : "password",
            allowBlank : false,
            enableKeyEvents : true,
            listeners : {
              specialKey : function(field, el) {
                if(el.getKey() == Ext.EventObject.ENTER) {
                  Ext.getCmp('log_in_button').handler.call(Ext.getCmp('log_in_button').scope)
                }
              }
            }
          }],
          buttons : [{
            text : 'Log In',
            name : 'log_in_button',
            id : 'log_in_button',
            ref : 'log_in_button',
            iconCls : 'silk_user_go',
            formBind : true,
            handler : function() {
              var response = Ext.Ajax.request({
                url : "/geoserver/j_spring_security_check",
                params : "username=" + loginPopup.loginForm.username.getValue() + "&password=" + loginPopup.loginForm.password.getValue(),
                callback : function(options, success, response) {
                  // Hack alert: The security check returns a success
                  // code regardless of whether the user successfully
                  // authenticated. The only way to determine success or
                  // failure is to inspect the contents of the response
                  // and see if it redirected back to a login page.
                  if(response.responseText.search("GeoServer: User login") > -1) {
                    username = null// guest
                    loginPopup.hide()
                    displayFailedLoginPopup()
                  } else {
                    username = loginPopup.loginForm.username.getValue()//
                    // current user
                    loginPopup.hide()
                    optionallyDisplayAvailableLayers()
                  }
                }
              })
            }
          }, {
            text : 'Enter as Guest',
            iconCls : 'silk_door_in',
            handler : function() {
              loginPopup.hide()
              optionallyDisplayAvailableLayers()
            }
          }]
        })]
      })
      loginPopup.show()
    }

    function displayFailedLoginPopup() {
      var failedLoginPopup = new Ext.Window({
        title : "Log In Failed",
        iconCls : "silk_exclamation",
        modal : true,
        layout : "fit",
        width : 325,
        height : 150,
        listeners : {
          // close available layers window when user clicks on
          // anything that isn't the window
          show : function() {
            Ext.select('.ext-el-mask').addListener('click', function() {
              failedLoginPopup.close()
              optionallyDisplayAvailableLayers()
            })
          }
        },
        items : [{
          html : '<p style="text-align: center; font-size: 120%">Invalid Username and/or Password.</p>',
          frame : true,
          padding : '20 20 20 20'
        }],
        buttons : [{
          text : 'Try Again',
          iconCls : 'silk_user_go',
          handler : function() {
            failedLoginPopup.hide()
            displayLoginPopup()
          }
        }, {
          text : 'Enter as Guest',
          iconCls : 'silk_door_in',
          handler : function() {
            failedLoginPopup.hide()
            optionallyDisplayAvailableLayers()
          }
        }]
      })
      failedLoginPopup.show()
    }

    function displayAvailableLayers() {
      LoadingIndicator.start("displayAvailableLayers")
      Ext.Ajax.request({
        url : AjaxUtils.jsonUrl("layergroup"),
        success : function(response) {

          // Return an ext grid reprsenting the layers available within
          // a given layergroup
          //
          // options:
          // - layergroup id
          // - layergroup name
          // - layergroup url (with filter)
          function createGeoserverGrid(gridOpts) {
            return {
              xtype : "grid",
              title : gridOpts.name,
              margins : '0 5 0 0',
              layout : 'fit',
              viewConfig : {
                forceFit : true
              },
              listeners : {
                "rowdblclick" : addAllSelectedLayers,
                "activate" : deselectAllLayers
              },
              stripeRows : true,
              store : new GeoExt.data.WMSCapabilitiesStore({
                url : gridOpts.url,
                autoLoad : true,
                sortInfo : {
                  field : 'title',
                  direction : "ASC"
                },
                listeners : {
                  "load" : function(store, records, options) {
                    loadAdditionalLayers(store, gridOpts.id)
                  }
                }
              }),
              columns : [{
                header : "Title",
                dataIndex : "title",
                width : 300,
                sortable : true
              }, {
                header : "Abstract",
                dataIndex : "abstract",
                width : 600,
                sortable : true
              }]
            }
          }

          // load layers that are not part of the GetCapabilities
          function loadAdditionalLayers(store, layerGroupId) {
            LoadingIndicator.start("loadAdditionalLayers")
            AjaxUtils.getAdditionalLayers(layerGroupId, function(layers) {
              _(layers).each(function(layerOpts) {
                store.add(new store.recordType({
                  id : _.uniqueId(),
                  prefix : layerOpts.prefix,
                  type : layerOpts.type,
                  title : layerOpts.name,
                  abstract : layerOpts.abstract,
                  layer : Layer.buildOlLayer(layerOpts)
                }))
              })
              LoadingIndicator.stop("loadAdditionalLayers")
            }, function() {
              LoadingIndicator.stop("loadAdditionalLayers")
            })
          }

          function addAllSelectedLayers() {// from all tabs
            var layers = app.center_south_and_east_panel.map_panel.map.layers
            _(layersPopup.tabs.items.items).chain()// all grids
            .map(function(grid) {
              return grid.getSelectionModel().getSelected()
            }).flatten().compact()// all selected layers
            .reject(function(selected) {// only add if not already added
              return _(layers).any(function(layer) {
                // We're checking for the equality of a selected layer
                // and an existing layer in the layer tree.
                return layerEqualsSelected(layer, selected)
              })
            }).each(addLayer)
            deselectAllLayers()
            Control.refreshControls()
          }

          function layerEqualsSelected(layer, selected) {
            // If names are urls match, they are considered equal
            if(selected.data.type == "KML") {
              return (selected.data.title == layer.name
                && cleanUrl(selected.data.layer.fullUrl) == cleanUrl(layer.fullUrl))
            } else { // assume WMS
              return (layer.params && layer.params.LAYERS == selected.data.name
                && cleanUrl(layer.url) == cleanUrl(selected.data.layer.url))
            }
          }

          function cleanUrl(url) {
            return Utils.trimChars(url, "&?")
          }

          function deselectAllLayers() {// from all tabs that have been
            // rendered
            _(layersPopup.tabs.items.items).chain().filter(function(g) {
              return g.rendered
            }).each(function(g) {
              g.getSelectionModel().clearSelections()
            })
          }

          var layersPopup = new Ext.Window({
            title : "Add Layers to the Map",
            iconCls : 'geosilk_layers_add',
            layout : "fit",
            modal : true,
            width : '60%',
            height : document.body.clientHeight - 50,
            items : [{
              xtype : "tabpanel",
              enableTabScroll : true,
              ref : "tabs",
              activeTab : 0,
              items : _(AjaxUtils.parseGeoserverJson(response)).map(createGeoserverGrid)
            }],
            listeners : {
              // close popup when user clicks on anything else
              show : function() {
                Ext.select('.ext-el-mask').addListener('click', function() {
                  layersPopup.close()
                })
              }
            },
            buttons : [{
              text : "Add to Map",
              iconCls : 'silk_add',
              handler : addAllSelectedLayers
            }, {
              text : 'Done',
              iconCls : 'silk_tick',
              handler : function() {
                layersPopup.hide()
              }
            }]
          })
          layersPopup.show()
          LoadingIndicator.stop("displayAvailableLayers")
        },
        failure : function() {
          LoadingIndicator.stop("displayAvailableLayers")
        }
      })
    }

    // add any kind of layer to the map
    //   - base layer
    //   - record
    //   - olLayer
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

      app.center_south_and_east_panel.map_panel.layers.add([forceToRecord(obj)])
    }

    function loadBaselayers() {

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
          checkBaseLayer(opts.name)
        })
      })
    }

    /**
     * Check the radio box for the base layer
     */
    function checkBaseLayer(baseLayerName) {

      // This is just about the hackiest thing ever.
      //
      // I searched high and low, but couldn't find a programmatic way to set
      // the radio buttons next to the base layers.  So instead I use jquery to
      // simulate a mouse click.
      //
      // We don't control which elements appear here, and there wasn't a lot to
      // select on.  The result is really, really fragile.  And this whole
      // system will break if there are ever multiple base layers with the same
      // name.

      var checkboxes = $('input[name=baselayer_checkbox]')
      var names = checkboxes.next().children().map(function(i, n) {
        return n.innerHTML
      })
      var index = _(names).indexOf(baseLayerName)
      checkboxes[index].click()
    }

    loadBaselayers()
    DefaultLayers.loadLayers()
    Layer.startAutoRefreshLayersSystem()
  }

  /**
   * Make rendering html in javascript stupid simple
   */
  var h = function() {
    return {
      img : function(src) {
        return "<img src='" + src + "' />"
      },
      code : function(text) {
        return "<code>" + text + "<code/>"
      },
      b : function(text) {
        return "<b>" + text + "<b/>"
      },
      p : function(text) {
        return "<p>" + text + "<p/>"
      },
      br : function() {
        return "<br />"
      }
    }
  }()

  function getApp() {
    return app
  }

  return {

    // global member variables
    username: username,

    // methods
    init : init,
    getApp: getApp,
    selectIcon : selectIcon
  }
}()

Ext.onReady(function() {
  if(devMode) {
    refresh.init()
  }
  Cop.init()
  if(devMode) {
    test.run()
  }
})

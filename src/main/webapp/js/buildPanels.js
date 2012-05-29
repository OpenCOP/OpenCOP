/**
 * It takes a lot of lines to define ext/geoext panels. All that
 * business happens in this file.
 */
var BuildPanels = function() {

  function buildAll() {

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
            lonlat.transform(Cop.getApp().center_south_and_east_panel.map_panel.map.displayProjection, Cop.getApp().center_south_and_east_panel.map_panel.map.getProjectionObject())

            // Set the center and zoom level of the map object
            Cop.getApp().center_south_and_east_panel.map_panel.map.setCenter(lonlat, zoom)
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
      //      Cop.getApp().west.collapse(true)
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
            var map = Cop.getApp().center_south_and_east_panel.map_panel.map
            map.setBaseLayer(layer)
          }
        }
      },

      tbar : [{
        text : 'Add',
        iconCls : 'silk_add',
        handler : Popup.displayAvailableLayers
      }, '-', {
        text : "Delete",
        iconCls : 'silk_delete',
        disabled : false,
        handler : function() {
          var node = Panel.currentlySelectedLayerNode()
          if(node) {
            Cop.getApp().center_south_and_east_panel.map_panel.map.removeLayer(node.layer)
            Panel.shutdownDetailsPane()
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
          Layer.refreshVectorLayerAndFeatureGrid()
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
          Layer.refreshVectorLayerAndFeatureGrid()
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
          Panel.populateIcons()
          Layer.refreshVectorLayerAndFeatureGrid()
          Control.refreshControls()
          Panel.refreshLayerEditPanel()
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

    return [menu_bar, west_panel, center_south_and_east_panel]
  }

  return  {
    buildAll: buildAll
  }
}()
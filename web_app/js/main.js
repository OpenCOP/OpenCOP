"use strict";

var cop = function() {

  var app
  var drawControl
  var vectorLayer
  var selectedIconUrl
  var username// null means guest
  var refreshInterval = 30000

  // select an icon for a feature while in edit mode
  var selectIcon = function(obj) {

    function createFeature(obj) {
      vectorLayer.styleMap.styles["temporary"].setDefaultStyle({
        externalGraphic : selectedIconUrl,
        pointRadius : "12",
        graphicOpacity : "1"
      })
      drawControl.activate()
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

    vectorLayer = Layer.buildScratchLayer()

    // legend namespace
    var legend = function() {

      function refreshLegendPanel() {

        if(!legendActive()) {
          return
        }

        var rec = currentlySelectedLayerRecord()
        if(!rec) {
          return
        }

        var title = rec.data.title
        Ext.get("legend_layer_title").update(title)

        refreshStyles(rec)
        refreshArrayComboBox(rec, "elevation", NetCDF.ELEVATIONS, "elevation_combo_box_panel", "elevation_combo_box_title")
        refreshArrayComboBox(rec, "time", NetCDF.TIMESTAMPS, "time_combo_box_panel", "time_combo_box_title")
      }

      function refreshStyles(rec) {
        var styles = Utils.makeUniqOnField(rec.data.styles, "name")
        var currentStyleIndex = getStyleIndex(styles, rec.data.layer.params.STYLES)
        var currentStyle = styles[currentStyleIndex]

        // update style-selector combo box
        var styleComboBoxPanel = app.west.selected_layer_panel.tabs.legend_panel.legend_combo_box_panel
        var styleComboBoxTitle = Ext.get('legend_combo_box_title')

        styleComboBoxPanel.removeAll()

        if(styleComboBoxTitle) {
          styleComboBoxTitle.setDisplayed(false)
        } else {
          console.log('styleComboBoxTitle is undefined')
        }

        if(styles.length > 1) {
          styleComboBoxPanel.add(buildStylesComboBox(styles, currentStyleIndex))
          styleComboBoxPanel.doLayout()

          if(styleComboBoxTitle) {
            styleComboBoxTitle.setDisplayed(true)
          }
        }

        setLegendToStyle(currentStyle)
      }

      /**
       * @param rec info about currently-selected layer (short for record)
       * @param paramName how the param is referenced in the url; lowercase
       * @param values the array we're filling the combo box with
       * @param extCombobox name of the ext combo box we're filling
       * @param extTitle title over the combo box
       */
      function refreshArrayComboBox(rec, paramName, values, extCombobox, extTitle) {

        // params likes the uppercase, in this instance. Consistently.
        var currIndex = getArrayIndex(values, rec.data.layer.params[paramName.toUpperCase()])
        var comboBoxPanel = app.west.selected_layer_panel.tabs.legend_panel[extCombobox]
        var comboBoxTitle = Ext.get(extTitle)

        // clear out everything in there now
        comboBoxPanel.removeAll()
        if(comboBoxTitle) {
          comboBoxTitle.setDisplayed(false)
        } else {
          console.log(paramname + ' comboBoxTitle is undefined')
        }

        // and put it back, if there's anything to put
        if(values.length > 1) {

          comboBoxPanel.add(buildArrayComboBox(values, currIndex, paramName))
          comboBoxPanel.doLayout()

          if(comboBoxTitle) {
            comboBoxTitle.setDisplayed(true)
          }
        }
      }

      function setLegendToStyle(style) {

        var title = style ? style.title : ""
        var olAbstract = style ? style.abstract : ""
        var url = style ? style.legend.href : ""

        Ext.get("legend_style_title").update(title)
        Ext.get("legend_style_abstract").update(olAbstract)
        Ext.get("legend_style_graphic").dom.src = url
      }

      function buildStylesComboBox(styles, currentStyleIndex) {
        return new Ext.form.ComboBox({
          typeAhead : true,
          triggerAction : 'all',
          autoSelect : true,
          lazyRender : true,
          mode : 'local',
          editable : false, // true = filter as the user types
          valueField : 'myId',
          displayField : 'displayText',
          store : new Ext.data.ArrayStore({
            id : 0,
            fields : ['myId', 'displayText'],
            data : buildStylesStore(styles)
          }),
          listeners : {
            'select' : function(combo, record, index) {
              setLegendToStyle(styles[index])
              currentlySelectedLayerRecord().data.layer.mergeNewParams({
                styles : styles[index].name
              })
            }
          }
        }).setValue(currentStyleIndex)
      }

      function buildArrayComboBox(arr, currIndex, paramName) {
        return new Ext.form.ComboBox({
          typeAhead : true,
          triggerAction : 'all',
          autoSelect : true,
          lazyRender : true,
          mode : 'local',
          editable : false, // true = filter as the user types
          valueField : 'myId',
          displayField : 'displayText',
          store : new Ext.data.ArrayStore({
            id : 0,
            fields : ['myId', 'displayText'],
            data : buildArrayStore(arr)
          }),
          listeners : {
            'select' : function(combo, record, index) {
              // merge causes an immediate layer refresh
              // (gymnastics needed to add feature with dynamic name to object)
              var params = {}
              params[paramName] = arr[index]
              currentlySelectedLayerRecord().data.layer.mergeNewParams(params)
            }
          }
        }).setValue(currIndex)
      }

      function getStyleIndex(styles, name) {
        var styleNames = _(styles).pluck("name")
        return getArrayIndex(styleNames, name)
      }

      /**
       * Like indexOf (returns the index of the element), except it returns
       * index of 0 if nothing is found.  Useful for combo boxes.
       */
      function getArrayIndex(arr, elem) {
        return !elem ? 0 : _.indexOf(arr, _.find(arr, function(e) {
          return e == elem
        }))
      }

      /**
       * Take a list of styles, and return a store suitable for a comboBox.
       *
       * Example output: [[0, "text0"], [1, "text1"], [2, "text2"], ...]
       */
      function buildStylesStore(styles) {
        var styleNames = _(styles).pluck("name")
        return buildArrayStore(styleNames);
      }

      /**
       * Function alias
       */
      var buildArrayStore = zipWithIndex

      /**
       * Ex: [a, b, c, d] => [[0, a], [1, b], [2, c], [3, d]]
       */
      function zipWithIndex(arr) {
        return _.map(_.range(arr.length), function(i) {
          return [i, arr[i]]
        })
      }

      function buildPopoutLegendPopup() {

        // grab what the legend is currently showing
        var layerName = Ext.get("legend_layer_title").dom.innerText
        var styleTitle = Ext.get("legend_style_title").dom.innerText
        var styleAbstract = Ext.get("legend_style_abstract").dom.innerText
        var legendGraphicUrl = Ext.get("legend_style_graphic").dom.src

        var nav = new Ext.FormPanel({
          frame : true,
          monitorValid : true,
          defaultType : 'textfield',
          items : [{
            xtype : 'box',
            cls : "legend-padding",
            autoEl : {
              tag : 'h1',
              html : styleTitle
            }
          }, {
            xtype : 'box',
            cls : "legend-padding",
            autoEl : {
              tag : 'p',
              html : styleAbstract
            }
          }, {
            xtype : 'box',
            cls : "legend-padding",
            autoEl : {
              tag : 'img',
              src : legendGraphicUrl
            }
          }]
        })
        var dlgPopup = new Ext.Window({
          collapsible : true,
          constrain : true,
          cls : "legend-window",
          height : 300,
          items : [nav],
          layout : 'fit',
          maximizable : true,
          modal : false,
          plain : true,
          renderTo : 'map_panel',
          resizable : true,
          width : 300,
          title : "Legend: " + layerName
        })
        dlgPopup.show()
        return dlgPopup
      }

      return {
        refreshLegendPanel : refreshLegendPanel,
        buildPopoutLegendPopup : buildPopoutLegendPopup
      }
    }()

    function cancelEditWfs(feature) {

      if(featureChanged(feature)) {
        Growl.info("Changes cancelled", "Changes to vector have been cancelled.")
      }

      feature.popup.close()
      if(feature.state == "Insert") {
        vectorLayer.removeFeatures([feature])
      } else {
        // reset attributes and position
        //
        // All that really needs to happen here is resetting the
        // attributes and geometry.  Attributes can be reset with
        // "feature.data = feature.attributes".  If we knew how to reset
        // the geom, this could be more efficient.
        refreshAllLayers()
      }
    }

    function createWfsPopup(feature) {
      // the "createWfsPopup" abstraction allows for the flexibility to
      // open other types of popups when in other modes
      if(editFeaturesActive()) {
        createEditWfsPopup(feature)
      }
    }

    function createEditWfsPopup(feature) {

      function hasAttribute(obj, attribute) {
        return _(obj).chain().keys().include(attribute).value()
      }

      // you're only allowed to drag a point if it's attached to the feature
      // you're currently editing
      function allowedToDragPoint(point, feature) {
        var id = feature.geometry.id
        var n0 = point.id == feature.id
        var n1 = id == Utils.safeDot(point, ['geometry', 'parent', 'id'])
        var n2 = id == Utils.safeDot(point, ['geometry', 'parent', 'parent', 'id'])
        var n3 = id == Utils.safeDot(point, ['geometry', 'parent', 'parent', 'parent', 'id'])
        var n4 = id == Utils.safeDot(point, ['geometry', 'parent', 'parent', 'parent', 'parent', 'id'])
        var n5 = id == Utils.safeDot(point, ['geometry', 'parent', 'parent', 'parent', 'parent', 'parent', 'id'])
        return n0 || n1 || n2 || n3 || n4 || n5
      }

      function ensureFeatureHasAllFields() {
        var allFields = _(vectorLayer.store.data.items).map(function(n) {
          return n.data.name
        })
        var missingFields = _(allFields).difference(_(feature.attributes).keys(), ["the_geom", "version"])
        _(missingFields).each(function(name) {
          feature.attributes[name] = ""
        })
      }

      ensureFeatureHasAllFields()

      // set default_graphic
      if(hasAttribute(feature.attributes, "default_graphic")) {
        feature.attributes.default_graphic = feature.attributes.default_graphic || selectedIconUrl
      }

      // Need to:
      // 1. allow moving point that has popup
      // 2. prevent selecting other points
      // 3. prevent moving other points
      // 4. unselecting point closes popup
      //
      // The empty dragStart callback is key. For whatever (stupid)
      // reason, it inhibits the select control.
      modifyControl.selectFeature(feature)
      modifyControl.dragStart = function() {
      }
      modifyControl.dragComplete = function(point) {

        if(allowedToDragPoint(point, feature)) {
          feature.state = OpenLayers.State.UPDATE
        } else {
          cancelEditWfs(feature)
        }
      }
      // remove the edit_url field (making a heavy assumption
      // that this field's name won't change)
      delete feature.attributes.edit_url

      var propertyGrid = new Ext.grid.PropertyGrid({
        title : feature.fid,
        source : feature.attributes
      })

      var popup = Popup.GeoExtPopup.create({
        title : "Edit WFS-T Feature",
        height : 300,
        width : 300,
        layout : "fit",
        map : app.center_south_and_east_panel.map_panel,
        location : feature,
        maximizable : true,
        collapsible : true,
        items : [propertyGrid],
        listeners : {
          "close" : function(feature) {
            modifyControl.unselectFeature(feature)
          }
        },
        buttons : [{
          text : 'Cancel',
          iconCls : 'silk_cross',
          handler : function() {
            cancelEditWfs(feature)
          }
        }, {
          text : 'Delete',
          iconCls : 'silk_cross',
          handler : function() {
            if(confirm("Delete this features?")) {
              feature.state = OpenLayers.State.DELETE
              saveFeature(feature)
              popup.close()
            }
          }
        }, {
          text : 'Save',
          iconCls : 'silk_tick',
          handler : function() {
            propertyGrid.stopEditing()// prevent having to click off field to
            // save in IE
            saveFeature(feature)
            popup.close()
          }
        }]
      })
      feature.popup = popup// so we can close the popup through the feature
      // later
      popup.show()
      drawControl.deactivate()
    }

    function vectorLayerContainsFeature(vectorLayer, feature) {
      return OpenLayers.Util.indexOf(vectorLayer.selectedFeatures, feature) > -1
    }

    var controls = [new OpenLayers.Control.Navigation(), new OpenLayers.Control.Attribution(), new OpenLayers.Control.PanPanel(), new OpenLayers.Control.ZoomPanel(), new OpenLayers.Control.MousePosition()]

    var modifyControl = new OpenLayers.Control.ModifyFeature(vectorLayer, {
      autoActivate : true
    })
    controls.push(modifyControl)

    drawControl = new OpenLayers.Control.DrawFeature(vectorLayer, OpenLayers.Handler.Point, {
      featureAdded : createWfsPopup
    })
    controls.push(drawControl)

    var selectFeatureControl = new OpenLayers.Control.SelectFeature(vectorLayer, {
      onSelect : createWfsPopup,
      onUnselect : cancelEditWfs
    })
    controls.push(selectFeatureControl)

    // get feature info (popup)
    var WMSGetFeatureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
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
              map : app.center_south_and_east_panel.map_panel,
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
    controls.push(WMSGetFeatureInfoControl)

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
        controls : controls
      },
      extent : new OpenLayers.Bounds(-10918469.080342, 2472890.3987378, -9525887.0459675, 6856095.3481128),
      layers : [vectorLayer],
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
          var node = currentlySelectedLayerNode()
          if(node) {
            app.center_south_and_east_panel.map_panel.map.removeLayer(node.layer)
            shutdownDetailsPane()
            Control.KML.removeLayer(node.layer)
            refreshControls()
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
          refreshControls()
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
          refreshControls()
          legend.refreshLegendPanel()
        }
      },
      items : [{
        xtype : 'tbbutton',
        cls : "legend-popout-button",
        icon : 'images/misc_icons/popout.png',
        listeners : {
          'click' : legend.buildPopoutLegendPopup
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
          refreshControls()
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

    LoadingIndicator.init(app)
    Control.init(app)

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
      app.center_south_and_east_panel.feature_table.store.bind(vectorLayer)
      app.center_south_and_east_panel.feature_table.getSelectionModel().bind(vectorLayer)
      if(vectorLayer.strategies == null) {
        vectorLayer.strategies = [new OpenLayers.Strategy.BBOX({
          resFactor : 1
        })];
      }
      // Set the correct sketch handler according to the geometryType
      drawControl.handler = new OpenLayers.Handler[geometryType](drawControl, drawControl.callbacks, drawControl.handlerOptions)
    }

    // fired on layer selection in the selection tree
    function setLayer() {
      refreshLayerDetailsPanel()
      refreshVectorLayerAndFeatureGrid()
      refreshControls()
      legend.refreshLegendPanel()
      refreshLayerEditPanel()
    }

    function moveToDetailsTab() {
      if(!app) {
        return
      }
      app.west.selected_layer_panel.tabs.setActiveTab(0)
    }

    // Sometimes which controls are activated gets pretty messed up.
    // This function attempts to set everything back to something
    // stable.
    //
    // This function could equally be called "hammer time".
    //
    // Called whenever:
    // - a layer is added, deleted, or selected
    // - any of the three panels are selected
    function refreshControls() {

      if(!app) {
        return
      }

      function currentLayerType() {
        var layerRecord = currentlySelectedLayerRecord()
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
        WMSGetFeatureInfoControl.activate()
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
        WMSGetFeatureInfoControl.deactivate()
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

      var legendPanel = app.west.selected_layer_panel.tabs.legend_panel
      var editPanel = app.west.selected_layer_panel.tabs.edit_features

      var mode = currentModePanel()
      var type = currentLayerType()

      if(isBaseLayer(type)) {
        moveToDetailsTab()
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

    function refreshLayerEditPanel() {
      var layerRecord = currentlySelectedLayerRecord()
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
      var layerRecord = currentlySelectedLayerRecord()
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
      var layerRecord = currentlySelectedLayerRecord()
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
          var templateHtml = "<tr>" + "<td><img src='{url}' alt='{name}' onclick='cop.selectIcon(this)'/></td>" + "<td>{name}</td>" + "</tr>"
          var tpl = new Ext.Template(templateHtml)
          tpl.compile()
          _(listOfHashes).each(function(item) {
            tpl.append('available_icons_table', item)
          })
        }

        function noIcons() {
          var img = "<img src='/opencop/images/silk/add.png' onclick='cop.selectIcon(this)' />"
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
      if(queryFeaturesActive() || editFeaturesActive()) {
        var node = currentlySelectedLayerNode()
        if(node && node.layer) {
          populateWfsGrid(node.layer)
          vectorLayer.parentLayer = node.layer
        }
      }
      grid[queryFeaturesActive() ? "expand" : "collapse"]()// isn't this cute?
      vectorLayer.removeAllFeatures()// needed for query tab
      LoadingIndicator.stop("refreshVectorLayerAndFeatureGrid")
    }

    function currentlySelectedLayerNode() {
      if(!app) {
        return null
      }
      return app.west.tree_panel.getSelectionModel().getSelectedNode()
    }

    function currentlySelectedLayerRecord() {
      var node = currentlySelectedLayerNode()
      return node ? node.layerStore.getById(node.layer.id) : null
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
            vectorLayer.store = store
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
        var isActiveVectorLayer = (vectorLayer.parentLayer && layer.id == vectorLayer.parentLayer.id)
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
    sm.bind(modifyControl.selectControl)
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
     * Grab the refresh interval from the server, and start
     * auto-layer-refresh going.
     */
    function startAutoRefreshLayersSystem() {
      AjaxUtils.getConfigOpt("map", "refreshInterval", function(interval) {
        refreshInterval = parseInt(interval)
        autoRefreshLayers()
      }, autoRefreshLayers)
    }

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

    function refreshAllLayers() {
      var layers = app.center_south_and_east_panel.map_panel.map.layers
      for(var i = layers.length - 1; i >= 0; --i) {
        refreshLayer(layers[i])
      }
      if(editFeaturesActive()) {
        app.center_south_and_east_panel.feature_table.store.reload()
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

    // Save the feature in the scratch vector layer through the power
    // of WFS-T, and refresh everything on the screen that touches that
    // vector layer.
    function saveFeature(feature) {

      function echoResult(response) {
        if(response.error) {
          // warning: fragile array-indexing code. Fix later.
          var e = response.error.exceptionReport.exceptions[0]
          Growl.err("Save Failed", h.b(e.code) + h.p(h.code(e.texts[0])))
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
      app.center_south_and_east_panel.feature_table.store.proxy.protocol.commit([feature], {
        callback : function(response) {
          echoResult(response)
          refreshAllLayers()
        }
      })
    }

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
            refreshControls()
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

    function currentModePanel() {
      if(!app) {
        return null
      }
      return app.west.selected_layer_panel.tabs.getActiveTab().initialConfig.ref
    }

    function queryFeaturesActive() {
      return currentModePanel() == 'query_features'
    }

    function editFeaturesActive() {
      return currentModePanel() == 'edit_features'
    }

    function layerDetailActive() {
      return currentModePanel() == 'layer_detail'
    }

    function legendActive() {
      return currentModePanel() == 'legend_panel'
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
    startAutoRefreshLayersSystem()
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

  // for DEVELOPMENT: let some variables leak out into global space
  var debug = function() {
    return {
      app : function() {
        return app
      },
      map : function() {
        return app.center_south_and_east_panel.map_panel.map
      },
      controls : function() {
        return app.center_south_and_east_panel.map_panel.map.controls
      },
      popupClass : function() {
        return Popup.GeoExtPopup
      }
    }
  }()

  return {

    // global member variables
    username: username,

    // methods
    init : init,
    debug : debug,
    selectIcon : selectIcon
  }
}()

Ext.onReady(function() {
  if(devMode) {
    refresh.init()
  }
  cop.init()
  if(devMode) {
    test.run()
  }
})

"use strict"

/**
 * Handles querying the ext panels. Notably, this doesn't have anything
 * to do with setting up the panels. That logic is large, and happens in
 * buildPanels.js.
 */
var Panel = function() {

  function currentModePanel() {
    if(!Cop.getApp()) {
      return null
    }
    return Cop.getApp().west.selected_layer_panel.tabs.getActiveTab().initialConfig.ref
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

  function currentlySelectedLayerNode() {
    if(!Cop.getApp()) {
      return null
    }
    return Cop.getApp().west.tree_panel.getSelectionModel().getSelectedNode()
  }

  function currentlySelectedLayerRecord() {
    var node = currentlySelectedLayerNode()
    return node ? node.layerStore.getById(node.layer.id) : null
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

  function refreshLayerDetailsPanel() {
    var layerRecord = Panel.currentlySelectedLayerRecord()
    if(!layerRecord) {
      return
    }

    var layer = layerRecord.getLayer()
    var slider = Cop.getApp().west.selected_layer_panel.tabs.layer_detail.opacity_slider

    Ext.get('layer-description-title').update(layerRecord.data.title)
    Ext.get('layer_description').update(layerRecord.data.abstract)
    slider.setLayer(layer)
    Cop.getApp().west.selected_layer_panel.expand()
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
        var templateHtml = "<tr>" + "<td><img src='{url}' alt='{name}' onclick='WFS.selectIcon(this)'/></td>" + "<td>{name}</td>" + "</tr>"
        var tpl = new Ext.Template(templateHtml)
        tpl.compile()
        _(listOfHashes).each(function(item) {
          tpl.append('available_icons_table', item)
        })
      }

      function noIcons() {
        var img = "<img src='/opencop/images/silk/add.png' onclick='WFS.selectIcon(this)' />"
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

  function moveToDetailsTab() {
    if(!Cop.getApp()) {
      return
    }
    Cop.getApp().west.selected_layer_panel.tabs.setActiveTab(0)
  }

  function shutdownDetailsPane() {
    Panel.moveToDetailsTab()
    Cop.getApp().west.selected_layer_panel.collapse()
    Cop.getApp().west.tree_panel.getSelectionModel().clearSelections()
  }

  function configureLayerTreeEvents() {

    var suppressNextClick = false

    function onUncheckLayer(layer) {
      var isActiveVectorLayer = (Layer.getVectorLayer().parentLayer && layer.id == Layer.getVectorLayer().parentLayer.id)
      if(isActiveVectorLayer) {
        Panel.shutdownDetailsPane()
      }
    }

    Cop.getApp().west.tree_panel.getSelectionModel().on("selectionchange", setLayer)
    Cop.getApp().west.tree_panel.on("beforeclick", function(node) {
      if(node.isSelected()) {
        suppressNextClick = true
      }
    })
    Cop.getApp().west.tree_panel.on("click", function(node) {
      if(suppressNextClick) {
        Panel.shutdownDetailsPane()
        suppressNextClick = false
      }
    })

    Cop.getApp().west.tree_panel.on("checkchange", function(node, justChecked) {
      if(!justChecked) {
        onUncheckLayer(node.layer)
      }
    })
  }

  /**
   * Fired on layer selection in the selection tree
   */
  function setLayer() {
    Panel.refreshLayerDetailsPanel()
    Layer.refreshVectorLayerAndFeatureGrid()
    Control.refreshControls()
    Legend.refreshLegendPanel()
    Panel.refreshLayerEditPanel()
  }

  return {
    currentModePanel: currentModePanel,
    checkBaseLayer: checkBaseLayer,
    queryFeaturesActive: queryFeaturesActive,
    editFeaturesActive: editFeaturesActive,
    layerDetailActive: layerDetailActive,
    currentlySelectedLayerNode: currentlySelectedLayerNode,
    currentlySelectedLayerRecord: currentlySelectedLayerRecord,
    legendActive: legendActive,
    populateIcons: populateIcons,
    displayIconsFor: displayIconsFor,
    refreshLayerDetailsPanel: refreshLayerDetailsPanel,
    moveToDetailsTab: moveToDetailsTab,
    shutdownDetailsPane: shutdownDetailsPane,
    configureLayerTreeEvents: configureLayerTreeEvents,
    setLayer: setLayer,
    refreshLayerEditPanel: refreshLayerEditPanel
  }
}()


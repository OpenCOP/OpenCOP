"use strict"

/**
 * The legend class.  It's legendary!
 */
var Legend = function() {

  function refreshLegendPanel() {

    if(!Panel.legendActive()) {
      return
    }

    var rec = Panel.currentlySelectedLayerRecord()
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
    var styleComboBoxPanel = Cop.getApp().west.selected_layer_panel.tabs.legend_panel.legend_combo_box_panel
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
    var comboBoxPanel = Cop.getApp().west.selected_layer_panel.tabs.legend_panel[extCombobox]
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
          Panel.currentlySelectedLayerRecord().data.layer.mergeNewParams({
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
          Panel.currentlySelectedLayerRecord().data.layer.mergeNewParams(params)
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
  var buildArrayStore = Utils.zipWithIndex

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

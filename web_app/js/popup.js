"use strict"

/**
 * If it creates (or even manages) a popup, it belongs here.
 */
var Popup = function() {

  function displayAppInfo() {
    var win = new Ext.Window({
      title : "About OpenCOP",
      iconCls : "geocent_logo",
      modal : true,
      layout : "fit",
      width : 400,
      height : 400,
      items : [{
        html : '<p><img src="/opencop/images/OpenCOP_logo_32.png"></p><br><p class="about-text">OpenCOP is a richly-featured, interactive open source mapping tool which allows users to identify and view incident data in near real-time, creating a common operational picture (COP) of an event. OpenCOP was created by Geocent, LLC.  </p> <br /> <p class="about-text"> For more information on Geocent, please visit us online at <a href="http://www.geocent.com" target="_blank">www.geocent.com</a>.  For information or technical support, email us at <a href="mailto:OpenCop@geocent.com">OpenCop@geocent.com</a> or call (800) 218-9009.</p> <br/> <p class="version"> Version 2.0.0.</p>',
        padding : '10 10 10 10'
      }],
      buttons : [{
        text : 'Done',
        iconCls : 'silk_tick',
        handler : function() {
          win.hide()
        }
      }]
    })
    win.show()
  }

  function displayHelp() {
    var win = new Ext.Window({
      title : "Help",
      iconCls : "silk_help",
      modal : true,
      layout : "fit",
      width : 800,
      height : 600,
      items : [{
        html : "<p>This is where the help docs will go. They will be really nice.</p>",
        padding : '10 10 10 10'
      }],
      buttons : [{
        text : 'Done',
        iconCls : 'silk_tick',
        handler : function() {
          win.hide()
        }
      }]
    })
    win.show()
  }

  function displayApplicationSettings() {
    var win = new Ext.Window({
      title : "Application Settings",
      iconCls : 'silk_cog_edit',
      modal : true,
      layout : "fit",
      width : 800,
      height : 600,
      items : [{
        html : "<p>Coming soon!</p>",
        padding : '10 10 10 10'
      }],
      buttons : [{
        text : 'Done',
        iconCls : 'silk_tick',
        handler : function() {
          win.hide()
        }
      }]
    })
    win.show()
  }

  function displayMySettings() {
    var win = new Ext.Window({
      title : "My Settings",
      iconCls : 'silk_user_edit',
      modal : true,
      layout : "fit",
      width : 400,
      height : 400,
      items : [{
        html : "<p>This is where you'll be able to change your password and administer any other settings associated with your account. It'll be cool.",
        padding : '10 10 10 10'
      }],
      buttons : [{
        text : 'Save Changes',
        iconCls : 'silk_tick',
        handler : function() {
          win.hide()
        }
      }, {
        text : 'Cancel',
        iconCls : 'silk_cross',
        handler : function() {
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
      if(singletonPopup) {
        singletonPopup.close()
        singletonPopup = null
      }
    }

    return {
      // Static factory method.  Opts is the massive options hash
      // that GeoExt.popup takes.
      create : function(opts) {
        close()
        singletonPopup = new GeoExt.Popup(opts)
        return singletonPopup
      },
      anyOpen : function() {
        return singletonPopup && !singletonPopup.hidden
      },
      closeAll : function() {
        close()
      }// Close all GeoExt.popups on the map.
      ,
      currentPopup : function() {
        return singletonPopup
      }
    }
  }()

  function createWfsPopup(feature) {
    // the "createWfsPopup" abstraction allows for the flexibility to
    // open other types of popups when in other modes
    if(Panel.editFeaturesActive()) {
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
      var allFields = _(Layer.getVectorLayer().store.data.items).map(function(n) {
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
    Control.getModifyControl().selectFeature(feature)
    Control.getModifyControl().dragStart = function() {
    }
    Control.getModifyControl().dragComplete = function(point) {

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
      map : Cop.getApp().center_south_and_east_panel.map_panel,
      location : feature,
      maximizable : true,
      collapsible : true,
      items : [propertyGrid],
      listeners : {
        "close" : function(feature) {
          Control.getModifyControl().unselectFeature(feature)
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
            WFS.saveFeature(feature)
            popup.close()
          }
        }
      }, {
        text : 'Save',
        iconCls : 'silk_tick',
        handler : function() {
          propertyGrid.stopEditing()// prevent having to click off field to
          // save in IE
          WFS.saveFeature(feature)
          popup.close()
        }
      }]
    })
    // so we can close the popup through the feature later
    feature.popup = popup
    popup.show()
    Control.deactivateDrawControl()
  }


  return {
    displayAppInfo: displayAppInfo,
    //    displayHelp: displayHelp,
    //    displayApplicationSettings: displayApplicationSettings,
    //    displayMySettings: displayMySettings,
    GeoExtPopup: GeoExtPopup,
    createWfsPopup: createWfsPopup
  }
}()

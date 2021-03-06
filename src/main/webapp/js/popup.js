"use strict"

/**
 * If it creates (or even manages) a popup, it belongs here.
 */
var Popup = function() {

  var username // null means guest

  /**
   * This "class" ensures that only a single GeoExt popup will be
   * available at a time.
   */
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
      feature.attributes.default_graphic = feature.attributes.default_graphic || WFS.getSelectedIconUrl()
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
        Control.cancelEditWfs(feature)
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
          Control.cancelEditWfs(feature)
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
                "abstract" : layerOpts["abstract"],
                layer : Layer.buildOlLayer(layerOpts)
              }))
            })
            LoadingIndicator.stop("loadAdditionalLayers")
          }, function() {
            LoadingIndicator.stop("loadAdditionalLayers")
          })
        }

        function addAllSelectedLayers() {// from all tabs
          var layers = Cop.getApp().center_south_and_east_panel.map_panel.map.layers
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
          }).each(Layer.addLayer)
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

  /**
   * Display login popup, if this instance of opencop is configured
   * for that sort of thing.
   */
  function optionallyDisplayLoginPopup() {
    AjaxUtils.getConfigOpt("security", "showLogin", function(showLogin) {
      if(showLogin == "true") {
        Popup.displayLoginPopup()
      } else {
        optionallyDisplayAvailableLayers()
      }
    }, Popup.displayLoginPopup)
  }

  function optionallyDisplayAvailableLayers() {
    AjaxUtils.getConfigOpt("map", "showLayers", function(showLayers) {
      if(showLayers == "true") {
        Popup.displayAvailableLayers()
      }
    }, Popup.displayAvailableLayers)
  }

  function getUsername() {
    return username
  }

  return {
    displayAppInfo: displayAppInfo,
    //    displayHelp: displayHelp,
    //    displayApplicationSettings: displayApplicationSettings,
    //    displayMySettings: displayMySettings,
    getUsername: getUsername,
    GeoExtPopup: GeoExtPopup,
    createWfsPopup: createWfsPopup,
    displayLoginPopup: displayLoginPopup,
    displayFailedLoginPopup: displayFailedLoginPopup,
    displayAvailableLayers: displayAvailableLayers,
    optionallyDisplayLoginPopup: optionallyDisplayLoginPopup,
    optionallyDisplayAvailableLayers: optionallyDisplayAvailableLayers
  }
}()

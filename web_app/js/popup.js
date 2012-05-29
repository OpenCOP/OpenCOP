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

  return {
    displayAppInfo: displayAppInfo,
//    displayHelp: displayHelp,
//    displayApplicationSettings: displayApplicationSettings,
//    displayMySettings: displayMySettings,
    GeoExtPopup: GeoExtPopup
  }
}()
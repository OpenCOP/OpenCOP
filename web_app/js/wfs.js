"use strict"

var WFS = function() {

  /**
   * Save the feature in the scratch vector layer through the power
   * of WFS-T, and refresh everything on the screen that touches that
   * vector layer.
   */
  function saveFeature(feature) {

    function echoResult(response) {
      if(response.error) {
        // warning: fragile array-indexing code. Fix later.
        var e = response.error.exceptionReport.exceptions[0]
        Growl.err("Save Failed", H.b(e.code) + H.p(H.code(e.texts[0])))
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
    Cop.getApp().center_south_and_east_panel.feature_table.store.proxy.protocol.commit([feature], {
      callback : function(response) {
        echoResult(response)
        Layer.refreshAllLayers()
      }
    })
  }

  return {
    saveFeature: saveFeature
  }
}()
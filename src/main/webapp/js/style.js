"use strict"

/**
 * Where our stylish constants live.
 */
var Style = function() {

  /**
   * Return next style in style sequence. Sequence will eventually
   * loop.  (This is for vector, KML layers.)
   */
  var getNext = function() {

    /**
     * Build style by specifying changes to default style.
     *
     * @opts Hash of changes to make to default OpenLayers style
     */
    var buildStyle = function(opts) {
      var style = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style["default"])
      return OpenLayers.Util.applyDefaults(opts, style)
    }
    var index = 0
    var fillOpacity = 0.9
    var availableStyles = [buildStyle({
      strokeColor : "red",
      fillColor : "red",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "purple",
      fillColor : "purple",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "black",
      fillColor : "black",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "brown",
      fillColor : "brown",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "pink",
      fillColor : "pink",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "yellow",
      fillColor : "yellow",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "white",
      fillColor : "white",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "blue",
      fillColor : "blue",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "orange",
      fillColor : "orange",
      fillOpacity : fillOpacity
    }), buildStyle({
      strokeColor : "green",
      fillColor : "green",
      fillOpacity : fillOpacity
    })]

    var bumpIndex = function() {
      index += 1
      if(index >= availableStyles.length) {
        index = 0
      }
    }

    return function() {
      var style = availableStyles[index]
      bumpIndex()
      return style
    }
  }()

  return {
    getNext: getNext
  }
}()

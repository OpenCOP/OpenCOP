/**
 * Make rendering html in javascript stupid simple
 */
var H = function() {
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
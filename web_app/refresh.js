/**
 * When the watched url's (file's) contents change, refresh this page.
 * For this to work, you must run the startWatch.sh script on the
 * server.
 *
 * This is a dev tool.
 */
var refresh = function() {

  var lastUpdated
  var refreshIntervalMs = 100
  var url = "updated"

  function init() {
    $.get(url, function(updated) {
      lastUpdated = updated
      setTimeout(check, refreshIntervalMs)
    })
  }

  function check() {
    $.get(url, function(updated) {
      if(updated != "" && lastUpdated != updated) {
        window.location.reload()
      }
      setTimeout(check, refreshIntervalMs)
    })
  }

  return {
    init:init
  }
}()

"use strict"

/**
 * This is a dev tool.
 *
 * When the watched url's (file's) contents change, refresh this page.
 * For this to work, you must run the startWatch.sh script on the
 * server.
 */
var refresh = function() {

  var initialContent
  var refreshIntervalMs = 100
  var url = "/opencop-updated/updated"

  function init() {
    $.get(url, function(content) {
      initialContent = content
      setTimeout(check, refreshIntervalMs)
    })
  }

  function check() {
    $.get(url, function(content) {
      if(content != "" && initialContent != content) {
        window.location.reload()
      }
      setTimeout(check, refreshIntervalMs)
    })
  }

  return {
    init:init
  }
}()

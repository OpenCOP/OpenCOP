"use strict"

/**
 * Tells the user that something ajax-y is going on. Call start() when a
 * new process starts, and stop() when it ends. This keeps track of the
 * number of processes running.
 */
var LoadingIndicator = function() {

  var refcount = 0
  var dev_showLogging = false  // to rapidly turn logging on/off

  function inited() {
    return Cop.getApp() && Cop.getApp().top_menu_bar
  }

  function hide() {
    Cop.getApp().top_menu_bar.loading_text.hide()
  }

  function show() {
    Cop.getApp().top_menu_bar.loading_text.show()
  }

  /**
   * User calls when something new has started loading.
   */
  function start(desc) {
    if(!inited()) {
      return
    }

    if(dev_showLogging) {
      console.log(desc + ": start")
    }

    show()
    refcount++
  }

  /**
   * User calls when something has finished loading.
   */
  function stop(desc) {
    if(!inited()) {
      return
    }

    if(dev_showLogging) {
      console.log(desc + ": stop")
    }

    if(refcount > 0) {
      refcount--
    }
    if(refcount === 0) {
      hide()
    }
  }

  return {
    start: start,
    stop: stop
  }
}()

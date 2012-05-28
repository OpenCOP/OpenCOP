var LoadingIndicator = function() {

  var refcount = 0
  var app
  var dev_showLogging = false  // to rapidly turn logging on/off

  function init(extApp) {
    app = extApp
  }

  function inited() {
    return app && app.top_menu_bar
  }

  function hide() {
    app.top_menu_bar.loading_text.hide()
  }

  function show() {
    app.top_menu_bar.loading_text.show()
  }

  /**
   * Something new has started loading.
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
   * Something has finished loading.
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
    init: init,
    start: start,
    stop: stop
  }
}()

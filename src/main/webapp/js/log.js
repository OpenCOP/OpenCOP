/**
 * Do all your logging through this class! Logging is off by default,
 * but you can turn it on by calling 'enable'.
 */
var Log = function() {
  var doLogging = false

  function enable() {
    doLogging = true
  }

  function disable() {
    doLogging = false
  }

  function msg(msg) {
    if(doLogging) {
      console.info(msg)
    }
  }

  function warn(msg) {
    if(doLogging) {
      console.warn(msg)
    }
  }

  function err(msg) {
    if(doLogging) {
      console.error(msg)
    }
  }

  return {
    enable: enable,
    disable: disable,
    msg: msg,
    err: err,
    warn: warn
  }
}()
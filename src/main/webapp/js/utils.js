"use strict"

/**
 * Utils namespace (for the purest of the pure functions).
 */
var Utils = function() {

  /**
   * Return a new arr where each object is unique, with uniqueness tested
   * against field (a string).
   */
  function makeUniqOnField(arr, field) {
    return _.reduce(arr, function(acc, n) {
      var isIn = _.find(acc, function(m) {
        return m[field] == n[field]
      })
      if(!isIn) {
        acc.push(n)
      }
      return acc
    }, [])
  }

  // Objects with the same keys and values (excluding functions) are equal.
  //   Example: {a: 1, :b: 2} == {a: 1, :b: 2} != {a: 1, b: 2, c: 3}.
  function equalAttributes(objA, objB) {
    // Yes, I feel bad about how hacky this is.  But it seems to work.
    return Ext.encode(objA) === Ext.encode(objB)
  }

  // Return a copy of obj where all its attributes have been passed
  // through fn.
  function fmap(obj, fn) {
    var n = {}
    _(obj).each(function(val, key) {
      n[key] = fn(val)
    })
    return n
  }

  // Sometimes you want to be able to say things like `foo.a.b.c.d.e`, but
  // you don't want to have to do a lot of null checking.  Instead, do this:
  // `Utils.safeDot(foo, ['a', 'b', 'c', 'd', 'e'])`, which will
  // short-circuit with "undefined" if anything untoward happens.
  function safeDot(obj, attrs) {
    var currObj = obj
    for(var i = 0; i < attrs.length; ++i) {
      if(!currObj || !currObj[attrs[i]]) {
        return undefined
      }
      currObj = currObj[attrs[i]]
    }
    return currObj
  }

  /**
   * Remove all chars from beginning and end of text.
   */
  function trimChars(text, chars) {
    while(contains(chars, last(text))) {
      text = dropLast(text)
    }
    while(contains(chars, first(text))) {
      text = dropFirst(text)
    }
    return text
  }

  function first(text) {
    return text[0]
  }

  function last(arr) {
    return arr[arr.length - 1]
  }

  function dropFirst(text) {
    return text.substring(1, text.length)
  }

  function dropLast(text) {
    return text.substring(0, text.length - 1)
  }

  function contains(arr, elem) {
    return arr.indexOf(elem) >= 0
  }

  function defaultTo(obj, val) {
    return obj == null || obj == undefined ? val : obj
  }

  /**
    * Ex: [a, b, c, d] => [[0, a], [1, b], [2, c], [3, d]]
    */
  function zipWithIndex(arr) {
    return _.map(_.range(arr.length), function(i) {
      return [i, arr[i]]
    })
  }


  return {
    makeUniqOnField: makeUniqOnField,
    equalAttributes: equalAttributes,
    fmap: fmap,
    safeDot: safeDot,
    trimChars: trimChars,
    first: first,
    last: last,
    dropFirst: dropFirst,
    dropLast: dropLast,
    contains: contains,
    defaultTo: defaultTo,
    zipWithIndex: zipWithIndex
  }
}()

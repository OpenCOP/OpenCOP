// the cheapest javascript test framework evar!
var test = (function() {

  var passChar = "."
  var failMsg = "FAIL: "
  function isPassed(n) { return n == passChar }

  function is(val, comment) { return val ? passChar : failMsg + "is() is false. " + comment }
  function isNot(val, comment) { return !val ? passChar : failMsg + "isNot() is true. " + comment }

  function isEq(a, b, comment) { return a == b ? passChar : failMsg + a + " != " + b + ". " + comment }
  function isUneq(a, b, comment) { return a != b ? passChar : failMsg + a + " == " + b + ". " + comment }

  function isEqAttrs(a, b, comment) {
    return cop.utils.equalAttributes(a, b)
      ? passChar
      : failMsg + a + "attrs != " + b + " attrs." + comment }

  function isUneqAttrs(a, b, comment) {
    return !cop.utils.equalAttributes(a, b)
      ? passChar
      : failMsg + a + "attrs == " + b + " attrs." + comment }

  function printSummary(testResultStrings) {
    var passed = _.filter(testResultStrings, isPassed)
    var failed = _.reject(testResultStrings, isPassed)

    console.log("failed: " + failed.length)
    console.log("passed: " + passed.length)

    _.each(failed, function(n) { console.log(n) })
  }

  return { run: function() {

    printSummary(
      [ isEq(2, 2, "isEq")
      , isUneq(2, 3, "isUneq")

      , is(true, "is")
      , isNot(false, "isNot")

      ///  real testing  ///

      , isEqAttrs({a: 1, b: 2}, {a: 1, b: 2}, "equalAttributes")
      , isUneqAttrs({a: 1, b: 2}, {a: 1, b: 2, c: 3}, "not equalAttributes")

      , isEqAttrs(
        cop.utils.makeUniqOnField([{a: 1, b: 2}, {a: 1, b: 3}, {a: 2, b: 4}], "a"),
        [{a:1, b:2}, {a:2, b:4}],
        "makeUniqOnField")

      , isEqAttrs(
        cop.utils.fmap({a:1, b:2, c:3}, function(n) { return n + 1 }),
        {a:2, b:3, c:4},
        "fmap")

      , isEq(cop.utils.defaultTo(undefined, 0), 0, "defaultTo 0 on undefined")
      , isEq(cop.utils.defaultTo(null, 0), 0, "defaultTo 0 on null")
      , isEq(cop.utils.defaultTo(2, 0), 2, "don't defaultTo on not null")

      , isEq(cop.utils.safeDot(undefined, ["c"]), undefined, "safedot: undefined")
      , isEq(cop.utils.safeDot({a: {b: {c: {d: 4}}}}, ["c"]), undefined, "safedot: c")
      , isEq(cop.utils.safeDot({a: {b: {c: {d: 4}}}}, ["a", "c"]), undefined, "safedot: a c")
      , isEq(cop.utils.safeDot({a: {b: {c: {d: 4}}}}, ["a", "b", "c", "d"]), 4, "safedot: a b c d")

      ])
  }}
}())

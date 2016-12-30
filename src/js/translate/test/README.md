# Tests for the `translate` module.

The translate module is relatively simple and (hopefully) the tests reflect that.

* `always-true-mocha.js` is a simple test suite that actually tests the test runner. It contains a single test that
   will always be true. If its not green, then the test runner, not the tests, are your problem.

* `cmumps-utils-mocha.js` tests the utility functions in `translate/util/cmumps-utils.js`

* `microparsers-mocha.js` test the strings in cmumps that actually have an internal structure and need to be parsed,
   for example dates, street addresses or names. These tests parse things and check the results.
   
* `translate-parts-mocha.js` test the translations of various parts of a cmumps into jsonld structure, typically cmumps-patient7.jsonld.
  This is the "real" test suite.
  
File `test_utils.js` contains a few test utilities. The important function there is `test_utils.cloneReorderGraph()`. This function makes a deep copy of the input
jsonld cmumps into and reorders the `@graph` array. This is useful since the implementation for translations shouldn't care about the order of appearance of objects
in the `@graph` array.
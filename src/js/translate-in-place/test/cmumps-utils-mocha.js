// Test the test runner

var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var _ = require('underscore');
var cmumps_utils = require('../../translate/util/cmumps_utils');
var fdt = require('../../translate/cmumps2fhir_datatypes');



// always-true-mocha.js provides a template for other tests and can be used to debug the mocha test runner.

describe('for cmumps-utils', function() {

    it('is obsolete!', function () {
        console.error("\nTHE TRANSLATE-IN-PLACE TRANSLATORS ARE OBSOLETE.  DO NOT USE!\n");
        console.error("\nTHESE TRANSLATORS WERE RETAINED FOR REFERENCE PURPOSES ONLY.\n");
    });
    
    describe.skip('isJsonld', function () {

        it.skip('returns true for a jsonld object', function () {
            expect(cmumps_utils.isJsonld({'@context': null, '@graph': null})).to.equal(true);
        });

        it.skip('returns false for an object missing @context', function () {
            expect(cmumps_utils.isJsonld({'@graph': null})).to.equal(false);
        });

        it.skip('returns false for an object missing @graph', function () {
            expect(cmumps_utils.isJsonld({'@context': null})).to.equal(false);
        });

        it.skip('does not clean integers', function () {
            var o = {x: 1};
            var clean_o = fdt.clean(o);
            chai.expect(o).has.key('x');
            chai.expect(o.x).is.equal(1);
        });
    });

    describe.skip('the frontier (examples)', function () {
        it.skip('is empty for scalars', function () {
            var scalar = 1;
            var theFrontier = cmumps_utils.frontier(scalar);
            chai.expect(theFrontier).to.eql([]);
        });

        it.skip('is a simple list for a single object', function () {
            var theObject = {x: 1, y: 2, z: 3};
            var theFrontier = cmumps_utils.frontier(theObject);
            var pairs = _.pairs(theFrontier).map(function (i) {
                return i[1];
            });
            chai.expect(pairs).to.have.members(theFrontier);
        });

        it.skip('is a prefixed list for a deep object', function () {
            var theObject = {
                key0: {key1: 'key0.key1'},
                key2: {key3: 'key2.key3'},
                key4: {key5: {key6: 'key4.key5.key6'}}
            };
            var theFrontier = cmumps_utils.frontier(theObject);
            chai.expect(theFrontier).to.have.length(3);
            theFrontier.forEach(function (i) {
                chai.expect(i[0]).to.equal(i[1])
            });
        });

        it.skip('can have only values (example of cmumps_utils.values())', function () {
            var theObject = {
                key0: {key1: 'key0.key1'},
                key2: {key3: 'key2.key3'},
                key4: {key5: {key6: 'key4.key5.key6'}}
            };
            var theValues = cmumps_utils.values(theObject);
            chai.expect(theValues).to.have.length(3);
            chai.expect(theValues[0]).to.equal(theObject.key0.key1)
        });


        it.skip('can only have keys (example of cmumps_utils.keys())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theKeys = cmumps_utils.keys(theObject);
            chai.expect(theKeys).to.have.length(3);
            chai.expect(theKeys[0]).to.eql('key0.key1');
            chai.expect(theKeys[1]).to.eql('key2.key3');
            chai.expect(theKeys[2]).to.eql('key4.key5.key6');

        });

        it.skip('can find the value differences (example of cmumps_utils.diffObjects())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theDiff = cmumps_utils.diffObjects(theObject, theObject);
            chai.expect(theDiff).to.have.length(0);
        });

        it.skip('can find the value overlaps (example of cmumps_utils.overlapObjects())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theOverlap = cmumps_utils.overlapObjects(theObject, theObject);
            chai.expect(theOverlap).to.have.length(3);
            chai.expect(theOverlap).to.eql(cmumps_utils.values(theObject));
        });


    });


    // cmumps_utils.partition()
    describe.skip('the partition of an object (examples)', function () {
        it.skip('makes no changes if the array of expressions is empty (example)', function () {
            var o = {x: 1}; // some object
            var result = cmumps_utils.partition(o, []);
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({}); // nothing was used
            chai.expect(result.unused).to.eql(o); // nothing was removed
        });

        it.skip('makes a single change if the array of expressions is has one entry (example)', function () {
            var o = {x: 1}; // some object
            var result = cmumps_utils.partition(o, ["['x']"]); //remove the 'x' attribute
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({x: 1}); // 'x' used
            chai.expect(result.unused).to.eql({}); // nothing left
        });

        it.skip('makes a single change if the array of expressions has the same entry multiple times (example)', function () {
            var o = {x: 1}; // some object
            var result = cmumps_utils.partition(o, ["['x']", "['x']"]); //remove the 'x' attribute, second time doesn't matter
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({x: 1}); // 'x' used
            chai.expect(result.unused).to.eql({}); // nothing left
        });

        it.skip('changes nothing for expressions that reference nothing (example)', function () {
            var o = {x: 1}; // some object
            var result = cmumps_utils.partition(o, ["['y']"]); // no 'y' attribute repeatedly, doesn't matter
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({}); // nothing was used
            chai.expect(result.unused).to.eql(o); // nothing was removed
        });

        it.skip('changes nothing for expressions that reference nothing repeatedly (example)', function () {
            var o = {x: 1}; // some object
            var result = cmumps_utils.partition(o, ["['y']", "['y']"]); // no 'y' attribute repeatedly, doesn't matter
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({}); // nothing was used
            chai.expect(result.unused).to.eql(o); // nothing was removed
        });


        it.skip('removes nested objects and leaves the right stuff (example)', function () {
            var o = {k0: 'k0', k1: {k2: 'k1.k2', k3: 'k1.k3'}, k4: 'k4'}; // nested object
            var result = cmumps_utils.partition(o, ["['k4']", "['k1']['k3']"]); // remove some parts
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({k4: 'k4', k1: {k3: 'k1.k3'}}); // some taken
            chai.expect(result.unused).to.eql({k0: 'k0', k1: {k2: 'k1.k2'}}); // some remain
        });

        it.skip('removes nested objects and leaves the right stuff repeatedly (example)', function () {
            var o = {k0: 'k0', k1: {k2: 'k1.k2', k3: 'k1.k3'}, k4: 'k4'}; // nested object
            var expressions = ["['k4']", "['k1']['k3']"];
            var result = cmumps_utils.partition(o, expressions.concat(expressions)); // repeating nested expressions doesn't matter
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({k4: 'k4', k1: {k3: 'k1.k3'}}); // some taken
            chai.expect(result.unused).to.eql({k0: 'k0', k1: {k2: 'k1.k2'}}); // some remain
        });

        it.skip('removes nested objects and leaves the right stuff even if removing interior nodes (example)', function () {
            var o = {k0: 'k0', k1: {k2: 'k1.k2', k3: 'k1.k3'}, k4: 'k4'}; // nested object
            var expressions = ["['k4']", "['k1']", "['k1']['k2']"];
            var result = cmumps_utils.partition(o, expressions.concat(expressions)); // repeating nested expressions doesn't matter
            chai.expect(result).to.have.keys('used', 'unused');
            chai.expect(result.used).to.eql({k4: 'k4', k1: {k2: 'k1.k2', k3: 'k1.k3'}}); // some taken
            chai.expect(result.unused).to.eql({k0: 'k0'}); // some remain
        });




    });


});

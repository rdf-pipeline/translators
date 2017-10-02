// Test the test runner

var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var _ = require('underscore');
var cmumps_utils = require('../util/cmumps_utils');
var fdt = require('../cmumps2fhir_datatypes');
var lpi = require('../lpi');
var cmumps2fhir_labs = require('../cmumps2fhir_labs');
var semver = require('semver');


// always-true-mocha.js provides a template for other tests and can be used to debug the mocha test runner.

describe('for cmumps-utils', function() {

    //
    describe('expecting node version', function() {
        expect(semver.parse(process.versions.node).major).to.be.at.least(4);
    });

    describe('isJsonld', function () {

        it('returns true for a jsonld object', function () {
            expect(cmumps_utils.isJsonld({'@context': null, '@graph': null})).to.equal(true);
        });

        it('returns false for an object missing @context', function () {
            expect(cmumps_utils.isJsonld({'@graph': null})).to.equal(false);
        });

        it('returns false for an object missing @graph', function () {
            expect(cmumps_utils.isJsonld({'@context': null})).to.equal(false);
        });

        it('does not clean false', function () {
            var o = {x: false};
            var clean_o = fdt.clean(o);
            chai.expect(o).has.key('x');
            chai.expect(o.x).is.equal(false);
        });

        it('does not clean integers', function () {
            var o = {x: 1};
            var clean_o = fdt.clean(o);
            chai.expect(o).has.key('x');
            chai.expect(o.x).is.equal(1);
        });
    });

    describe('the frontier (all can serve as examples)', function () {
        it('is empty for scalars', function () {
            var scalar = 1;
            var theFrontier = cmumps_utils.frontier(scalar);
            chai.expect(theFrontier).to.eql([]);
        });

        it('is a simple list for a single object', function () {
            var theObject = {x: 1, y: 2, z: 3};
            var theFrontier = cmumps_utils.frontier(theObject);
            var pairs = _.pairs(theFrontier).map(function (i) {
                return i[1];
            });
            chai.expect(pairs).to.have.members(theFrontier);
        });

        it('is a prefixed list for a deep object', function () {
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

        it('can have only values (example of cmumps_utils.values())', function () {
            var theObject = {
                key0: {key1: 'key0.key1'},
                key2: {key3: 'key2.key3'},
                key4: {key5: {key6: 'key4.key5.key6'}}
            };
            var theValues = cmumps_utils.values(theObject);
            chai.expect(theValues).to.have.length(3);
            chai.expect(theValues[0]).to.equal(theObject.key0.key1)
        });


        it('can only have keys (example of cmumps_utils.keys())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theKeys = cmumps_utils.keys(theObject);
            chai.expect(theKeys).to.have.length(3);
            chai.expect(theKeys[0]).to.eql('key0.key1');
            chai.expect(theKeys[1]).to.eql('key2.key3');
            chai.expect(theKeys[2]).to.eql('key4.key5.key6');

        });

        it('can find the value differences (example of cmumps_utils.diffObjects())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theDiff = cmumps_utils.diffObjects(theObject, theObject);
            chai.expect(theDiff).to.have.length(0);
        });

        it('can find the value overlaps (example of cmumps_utils.overlapObjects())', function () {
            var theObject = {key0: {key1: 'key0.key1'}, key2: {key3: 'key2.key3'}, key4: {key5: {key6: 'key4.key5.key6'}}};
            var theOverlap = cmumps_utils.overlapObjects(theObject, theObject);
            chai.expect(theOverlap).to.have.length(3);
            chai.expect(theOverlap).to.eql(cmumps_utils.values(theObject));
        });




    });
});


// generate variants of the Defer object and make sure they make sense
describe('for lpi ...', function() {
    describe('lpi.Defer() ...', function() {
        it('can Defer a lab result translation as a Defer object', function () {
            var fhirTargetResource = cmumps2fhir_labs.translateLabsFhir.resourceType; // each translator "knows" its FHIR result
            var translatorFunction = cmumps2fhir_labs.translateLabsFhir;
            var sourceNode = 'tbs';
            var id = '63-0000007'; // cmumpss:Lab_Result-63
            var patientId = 'urn:local:fhir:Patient:2-' + id.split('-')[1];
            var patientName = 'BUNNY, BUGS DOC';
            var result = lpi.fhirDefer(fhirTargetResource, translatorFunction, sourceNode, id, patientId, patientName);
            // chai.expect(result).to.be.an.instanceOf(lpi.Defer);
            chai.expect(result).to.have.keys(['@id', 'id', 'resourceType', '_deferred', 'fhir:patientName', 't:translatedBy']);
            chai.expect(result['t:translatedBy']).to.have.keys(['t:translator', 't:sourceNode', 't:patientId', 't:patientName']);
            chai.expect(result.id).equals(id);
            chai.expect(result['t:translatedBy']['t:patientId']).equals(patientId);
            chai.expect(result['fhir:patientName']).equals(patientName);
            chai.expect(result['t:translatedBy']['t:patientName']).equals(patientName);
        });

        it('can Defer a lab result translation as an Object', function () {
            var fhirTargetResource = cmumps2fhir_labs.translateLabsFhir.resourceType; // each translator "knows" its FHIR result
            var translatorFunction = cmumps2fhir_labs.translateLabsFhir;
            var sourceNode = 'tbs';
            var id = '63-0000007'; // cmumpss:Lab_Result-63
            var patientId = 'urn:local:fhir:Patient:2-' + id.split('-')[1];
            var patientName = 'BUGS, BUNNY DOC';
            var result = lpi.fhirDefer(fhirTargetResource, translatorFunction, sourceNode, id, patientId, patientName);
            chai.expect(result).to.be.an.instanceOf(Object);
            chai.expect(result).to.have.keys(['@id', 'id', 'resourceType', '_deferred', 'fhir:patientName', 't:translatedBy']);
            chai.expect(result['t:translatedBy']).to.have.keys(['t:translator', 't:sourceNode', 't:patientId', 't:patientName']);
            chai.expect(result.id).equals(id);
            chai.expect(result['t:translatedBy']['t:patientId']).equals(patientId);
            chai.expect(result['fhir:patientName']).equals(patientName);
            chai.expect(result['t:translatedBy']['t:patientName']).equals(patientName);
        });

    });
});

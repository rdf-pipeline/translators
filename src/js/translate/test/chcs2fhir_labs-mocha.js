// chcs2fhir_labs-mocha.js

var Chai = require('chai');
var expect = Chai.expect;
var should = Chai.should();

var Fs = require('fs');

var Labs = require('../chcs2fhir_labs'); 
var Utils = require('../util/chcs_utils');

describe("chcs2fhir_labs", function() {

    var patient7 = Utils.load(__dirname+'/../../../../data/fake_chcs/patient-7/chcs-patient7.jsonld');

    it("should have expected exported interface", function() {
        Labs.should.be.an.object;
        Labs.extractLabs.should.be.a('function');
        Labs.resourceType.should.equal('DiagnosticOrder'); // David?  Eric?  Is this right?
        Labs.translateLabsFhir.should.be.a('function');
    });

    describe("#extractLabs", function() {
        it("should throw an error if there is no JSON-LD data passed in", function() {
            expect(Labs.extractLabs).to.throw(Error, 
                "Cannot extract CHCS labs because patient data object is undefined!");
        });

        it("should handle empty JSON-LD object gracefully", function() {
            var results = Labs.extractLabs({});
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should handle empty JSON-LD array gracefully", function() {
            var results = Labs.extractLabs([]);
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should extract CHCS labs", function() {
            var results = Labs.extractLabs(patient7);

            results.should.be.an('array');
            results.should.have.length(1);
 
            var labResult = results[0]; 
            labResult.should.have.all.keys([ 
                '_id', 'micro_conversion_flag-63', 'label',
                'clinical_chemistry-63', 'patient-63', 'type' ]);
            labResult.label.should.equal('BUNNY,BUGS');
            labResult.type.should.equal('chcss:Lab_Result-63');

            var expected = Utils.load(__dirname+'/data/expectedChcsLabResult.json');
            labResult.should.deep.equal(expected);
        }); 
    });

    describe("#translateLabs2Fhir", function() {

        it("should translate CHCS labs to FHIR", function() {
            var chcsLabs = Labs.extractLabs(patient7);
            var fhirResults = Labs.translateLabsFhir(chcsLabs[0]);
            var expected = Utils.load(__dirname+'/data/expectedFhirDiagOrder.json');
            fhirResults.should.deep.equal(expected);
        });

    });

});


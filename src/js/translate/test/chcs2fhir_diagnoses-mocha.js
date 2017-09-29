// chcs2fhir_diagnoses-mocha.js

const Chai = require('chai');
const expect = Chai.expect;
const should = Chai.should();

const Fs = require('fs');

const Diagnoses = require('../chcs2fhir_diagnoses'); 
const Utils = require('../util/chcs_utils');

describe("chcs2fhir_diagnoses", function() {

    var patient7 = Utils.load(__dirname+'/../../../../data/fake_chcs/patient-7/chcs-patient7.jsonld');

    it("should have expected exported interface", function() {
        Diagnoses.should.be.an.object;
        Diagnoses.extractDiagnoses.should.be.a('function');
        Diagnoses.resourceType.should.equal('DiagnosticReport');
        Diagnoses.translateDiagnosesFhir.should.be.a('function');
    });

    describe("#extractDiagnoses", function() {
        it("should throw an error if there is no JSON-LD data passed in", function() {
            expect(Diagnoses.extractDiagnoses).to.throw(Error, 
                "Cannot extract CHCS diagnoses because patient data object is undefined!");
        });

        it("should handle empty JSON-LD object gracefully", function() {
            var results = Diagnoses.extractDiagnoses({});
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should handle empty JSON-LD array gracefully", function() {
            var results = Diagnoses.extractDiagnoses([]);
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should extract CHCS diagnoses", function() {
            var results = Diagnoses.extractDiagnoses(patient7);

            results.should.be.an('array');
            results.should.have.length(3);
 
            results.forEach(function(diagResult) { 
                diagResult.should.have.all.keys([ 
                    '_id', 'type', 'label', 'problem-100417', 'patient-100417',
                    'status-100417', 'location-100417', 'date_of_onset-100417',
                    'diagnosis-100417' ]);
                diagResult['_id'].should.be.oneOf(['100417-4559064', '100417-4562039', '100417-4568875']);
                diagResult.type.should.equal('chcss:Kg_Patient_Diagnosis-100417');
                diagResult['status-100417'].should.equal('Active');
                diagResult['date_of_onset-100417'].should.deep.equal({ value: '1990-01-01', type: 'xsd:date' });
            });
        }); 
    });

    describe("#translateDiagnoses2Fhir", function() {

        it("should translate CHCS diagnoses to FHIR", function() {
            var chcsDiagnoses = Diagnoses.extractDiagnoses(patient7);

            var fhirResults = chcsDiagnoses.map(function(diagnosis) { 
                return Diagnoses.translateDiagnosesFhir(diagnosis);
            });
            fhirResults.should.be.an('array');
            fhirResults.should.have.length(3);

            var expected = Utils.load(__dirname+'/data/expectedFhirDiagReport.json');
            fhirResults.should.deep.equal(expected);
        });

    });

});


// chcs2fhir_prescriptions-mocha.js

const Chai = require('chai');
const expect = Chai.expect;
const should = Chai.should();

const Fs = require('fs');

const Prescriptions = require('../chcs2fhir_prescriptions'); 
const Utils = require('../util/chcs_utils');

describe("chcs2fhir_prescriptions", function() {

    var patient7 = Utils.load(__dirname+'/../../../../data/fake_chcs/patient-7/chcs-patient7.jsonld');

    it("should have expected exported interface", function() {
        Prescriptions.should.be.an.object;
        Prescriptions.extractPrescriptions.should.be.a('function');
        Prescriptions.resourceType.should.equal('MedicationDispense');
        Prescriptions.translatePrescriptionsFhir.should.be.a('function');
    });

    describe("#extractPrescriptions", function() {
        it("should throw an error if there is no JSON-LD data passed in", function() {
            expect(Prescriptions.extractPrescriptions).to.throw(Error, 
                "Cannot extract CHCS prescriptions because patient data object is undefined!");
        });

        it("should handle empty JSON-LD object gracefully", function() {
            var results = Prescriptions.extractPrescriptions({});
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should handle empty JSON-LD array gracefully", function() {
            var results = Prescriptions.extractPrescriptions([]);
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should extract CHCS prescriptions", function() {
            var results = Prescriptions.extractPrescriptions(patient7);

            results.should.be.an('array');
            results.should.have.length(6);

            results.forEach(function(prescription) { 
                expect(prescription['_id']).to.be.oneOf(
                    ["52-40863", "52-7810413", "52-7810414", "52-40863", "52-7810413", "52-7810414"]);
                prescription.type.should.equal('chcss:Prescription-52');
                expect(prescription['status-52']).to.be.oneOf(
                    ["DISCONTINUED", "EXPIRED"]);
                prescription.should.include.keys([ '_id', 'type', 'label', 'rx_-52', 'patient-52',
                      'provider-52', 'drug-52', 'qty-52', 'days_supply-52', 'refills-52', 'logged_by-52',
                      'login_date-52', 'refills-52', 'logged_by-52', 'login_date-52', 'mtf_division-52',
                      'status-52', 'refills_remaining-52', 'child_resistant_cont-52', 'fill_expiration-52',
                      'order_date_time-52', 'order_entry_number-52', 'order_pointer-52',
                      'date_time_received_from_oe-52', 'outpatient_site-52', 'expiration_date-52',
                      'meprs_code-52', 'comments-52', 'sig-52', 'activity_log-52', 'fill_dates-52' ]);
            });
        });

    });

    describe("#translatePrescriptions2Fhir", function() {
        it("should translate CHCS prescriptions to FHIR", function() {
            var chcsPrescriptions = Prescriptions.extractPrescriptions(patient7);
            var fhirMeds = chcsPrescriptions.map(function(prescription) { 
                return Prescriptions.translatePrescriptionsFhir(prescription);
            });
            var expected = Utils.load(__dirname+'/data/expectedFhirMeds.json');
            fhirMeds.should.deep.equal(expected);
        });
    });

});


// chcs2fhir_demographics-mocha.js

const Chai = require('chai');
const expect = Chai.expect;
const should = Chai.should();

const Fs = require('fs');

const Demographics = require('../chcs2fhir_demographics'); 
const Utils = require('../util/chcs_utils');

describe("chcs2fhir_demographics", function() {
  
    var patient7 = Utils.load(__dirname+'/../../../../data/fake_chcs/patient-7/chcs-patient7.jsonld');

    it("should have expected exported interface", function() {
        Demographics.should.be.an.object;
        Demographics.extractDemographics.should.be.a('function');
        Demographics.resourceType.should.equal('Patient');
        Demographics.translateDemographicsFhir.should.be.a('function');
    });

    describe("#extractDemographics", function() {
        it("should throw an error if there is no JSON-LD data passed in", function() {
            expect(Demographics.extractDemographics).to.throw(Error, 
                "Cannot extract CHCS demographics because patient data object is undefined!");
        });

        it("should handle empty JSON-LD object gracefully", function() {
            var results = Demographics.extractDemographics({});
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should handle empty JSON-LD array gracefully", function() {
            var results = Demographics.extractDemographics([]);
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should extract CHCS demographics", function() {
            var results = Demographics.extractDemographics(patient7);

            results.should.be.an('array');
            results.should.have.length(1);
 
            var patientDemographics = results[0]; 
            patientDemographics.should.have.all.keys([ 'type', '_id', 'patient_ssn-2', 'street_address-2',
                'city-2', 'zip_code-2', 'state-2', 'label', 'registration_comment-2', 'name-2',
                'phone-2', 'office_phone-2', 'temporary_phone-2', 'fax_number-2', 'email_address-2',
                'ssn-2', 'dod_id_-2', 'sex-2', 'marital_status-2', 'emergency_contact-2', 'ephone-2',
                'erelationship-2', 'estreet_address-1', 'estreet_address-2', 'ecity-2', 'estate-2',
                'ezip-2', 'fmp-2', 'registration_type-2', 'branch_of_service_last-2', 
                'outpatient_record_location-2', 'deers_address_updated-2', 'geo_loc_of_ship_unit-2', 
                'dob-2', 'deers_uic-2', 'user_altering_patient_record-2', 'military_grade_rank-2',
                'fmp_ssn-2', 'patient_category-2', 'date_entered_into_file-2', 'organ_donor_date-2',
                'medical_record_type-2', 'who_entered_patient-2', 'registration_incomplete-2', 
                'active_duty-2', 'unit_ship_id-2', 'sponsor_name-2', 'organ_donor-2' ]);

            patientDemographics.type.should.equal('chcss:Patient-2');
            patientDemographics['_id'].should.equal('2-000007');
            patientDemographics['sex-2'].should.deep.equal( { id: 'chcss:2__02_E-MALE', label: 'MALE' });
            patientDemographics['organ_donor-2'].should.deep.equal({ 
               id: 'chcss:2_9001_01_E-UNDECIDED', 
               label: 'UNDECIDED' });
            var expected = Utils.load(__dirname+'/data/expectedChcsDemographics.json');
            patientDemographics.should.deep.equal(expected);
        });
    });

    describe("#translateDemographics2Fhir", function() {
        it("should translate CHCS demographics to FHIR", function() {
            var patient = Demographics.extractDemographics(patient7);
            var results = Demographics.translateDemographicsFhir(patient[0]);
            var expected = Utils.load(__dirname+'/data/expectedFhirDemographics.json');
            results.should.deep.equal(expected);
        });
    });

});


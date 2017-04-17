// cmumps2fhir_procedures-mocha.js

const Chai = require('chai');
const expect = Chai.expect;
const should = Chai.should();

const Fs = require('fs');

const Procedures = require('../cmumps2fhir_procedures'); 
const Utils = require('../util/cmumps_utils');

describe("cmumps2fhir_procedures", function() {

    var patient7 = Utils.load(__dirname+'/../../../../data/fake_cmumps/patient-7/cmumps-patient7.jsonld');

    it("should have expected exported interface", function() {
        Procedures.should.be.an.object;
        Procedures.extractProcedures.should.be.a('function');
        Procedures.resourceType.should.equal('Procedure');
        Procedures.translateProceduresFhir.should.be.a('function');
    });

    describe("#extractProcedures", function() {
        it("should throw an error if there is no JSON-LD data passed in", function() {
            expect(Procedures.extractProcedures).to.throw(Error, 
                "Cannot extract CMUMPS procedures because patient data object is undefined!");
        });

        it("should handle empty JSON-LD object gracefully", function() {
            var results = Procedures.extractProcedures({});
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should handle empty JSON-LD array gracefully", function() {
            var results = Procedures.extractProcedures([]);
            results.should.be.an('array');
            results.should.be.empty;
        });

        it("should extract CMUMPS diagnoses", function() {
            var results = Procedures.extractProcedures(patient7);

            results.should.be.an('array');
            results.should.have.length(1);
 
            results.forEach(function(procedure) { 
                procedure.should.have.all.keys([ 
                    'type', 'label', 'patient', '_id', 'description', 'comments',
                    'status', 'dateReported', 'source', 'verified', 'provider' ]);
                procedure['_id'].should.equal('Procedure-1074046');
                procedure.type.should.equal('Procedure');
                procedure.patient.should.deep.equal({ id: 'Patient-000007', label: 'BUNNY, BUGS' });
                procedure.description.id.should.equal('HDDConcept-67355');
                procedure.comments.should.equal('Encounter Procedure');
                procedure.status.should.deep.equal({ id: 'HDDConcept-1024', label: 'Active' });
                procedure.dateReported.should.deep.equal({ value: '1990-01-01T00:00:00', type: 'xsd#dateTime' });
                procedure.verified.should.be.true;
                procedure.provider.should.deep.equal({ id: 'Provider-41200034', label: 'MOUSE, MICKEY' });
            }); 
        }); 
    });

    describe("#translatesProcedures2Fhir", function() {

        it("should translate CMUMPS procedures to FHIR", function() {
            var cmumpsProcedures = Procedures.extractProcedures(patient7);
            var fhirProcedure = Procedures.translateProceduresFhir(cmumpsProcedures[0]);
            
            var expected = Utils.load(__dirname+'/data/expectedFhirProcedure.json');
            fhirProcedure.should.deep.equal(expected);
        });

    });

});


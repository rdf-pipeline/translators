/**
 * Depending on the key name, certain chcs data values can be strings or objects that must be further parsed.
 * The functions that parse them have been nicknamed microparsers. Usually a regular expression is enough. But not always.
 */

// testing
var assert = require('assert');
var chai = require('chai');
// chai.config.includeStack = true;


var prefix = '../../translate/'; // translate and graph_tranlate share underlying plumbing
var sibling = '../';
var chcs2fhir_all = require(sibling + 'graph_chcs2fhir_all');
var chcs2fhir_demographics = require(sibling + 'graph_chcs2fhir_demographics');
var chcs2fhir_labs = require(sibling + 'graph_chcs2fhir_labs');
var chcs2fhir_diagnoses = require(sibling + 'graph_chcs2fhir_diagnoses');
var chcs2fhir_prescriptions = require(sibling + 'graph_chcs2fhir_prescriptions');
var chcs2fhir_procedures = require(sibling + 'graph_chcs2fhir_procedures');


var fhir = require(prefix + 'fhir');
var chcs_utils = require(prefix + 'util/chcs_utils');
var chcs = require(prefix + 'chcs');
var JSONPath = require('jsonpath-plus');
var fhir2xml = require('fhir-json-to-xml');
var parser = new fhir2xml.FHIRConverter(2);
var fdt = require(prefix + 'chcs2fhir_datatypes');
var test_utils = require('./../../translate/test/test_utils');


// Different names for the same input file, allows for easier on-the-fly modications.
var patient7Jsonld = 
    chcs_utils.load(__dirname + '/../../../../data/fake_chcs/patient-7/chcs-patient7.jsonld');

// var bugsBunnyJsonld = patient7Jsonld;
// var bugsBunnyDiagnosisJsonld = patient7Jsonld;
// var bugsBunnyProceduresJsonld = patient7Jsonld;


describe('chcs2fhir_all fhirParts', function () {

    it('is obsolete!', function () {
        console.error("\nTHE TRANSLATE-IN-PLACE TRANSLATORS ARE OBSOLETE.  DO NOT USE!\n");
        console.error("\nTHESE TRANSLATORS WERE RETAINED FOR REFERENCE PURPOSES ONLY.\n");
    });

    describe.skip('across all report categories', function () {

        // fhirDate(chcsDate)
        // @see microparsers-mocha.js for misformed input
        it.skip('fhirDate should convert yyyy-mm-dd to mm-dd-yyyy', function () {
            var year = '1809';
            var month = '02';
            var day = '12'; // abe
            var chcsDate = year + '-' + month + '-' + day;
            var fhirDate = day + '-' + month + '-' + year;
            chai.expect(function () {
                result = fdt.fhirDate(chcsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(fhirDate);
        });

        it.skip('fhirDate should convert yy-mm-dd to mm-dd-19yy', function () {
            var year = '09';
            var month = '02';
            var day = '12'; // abe + 100y
            var chcsDate = year + '-' + month + '-' + day;
            var fhirDate = day + '-' + month + '-' + '19' + year;
            chai.expect(function () {
                result = fdt.fhirDate(chcsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(fhirDate);
        });

        it.skip('fhirDate should throw an Error with bad chcs date', function () {
            var year = '9';
            var month = '02';
            day = '12'; // year is bogus
            var chcsDate = year + '-' + month + '-' + day;
            chai.expect(function () {
                fdt.fhirDate(chcsDate);
            }).to.throw(Error, /Bad chcs date/);
        });

        // fhirHumanName
        it.skip('fhirHumanName should parse a simple name', function () {
            var last = "bunny";
            var first = "bugs";
            var aName = last + ',' + first;
            var fhirHumanName;
            chai.expect(function () {
                fhirHumanName = fdt.fhirHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(fhirHumanName).not.to.be.null;
            chai.expect(fhirHumanName).to.be.an('object');
            chai.expect(fhirHumanName).to.have.all.keys('use', 'family', 'given');
            chai.expect(fhirHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(fhirHumanName.family[0]).to.equal(last);
            chai.expect(fhirHumanName.given[0]).to.equal(first);
            chai.expect(fhirHumanName).not.has.property('title');
        });

        it.skip('fhirHumanName should parse a last, first mi', function () {
            var last = "bunny";
            var first = "bugs";
            var mi = 'doc';
            var aName = last + ',' + first + ' ' + mi;
            var fhirHumanName;
            chai.expect(function () {
                fhirHumanName = fdt.fhirHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(fhirHumanName).not.to.be.null;
            chai.expect(fhirHumanName).to.be.an('object');
            chai.expect(fhirHumanName).to.have.all.keys('use', 'family', 'given');
            chai.expect(fhirHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(fhirHumanName.family[0]).to.equal(last);
            chai.expect(fhirHumanName.given[0]).to.equal(first + ' ' + mi);
            chai.expect(fhirHumanName).not.has.property('title');
        });

        it.skip('fhirHumanName should parse last, first mi title', function () {
            var last = "bunny";
            var first = "bugs";
            var mi = 'doc';
            var title = 'mr';
            var aName = last + ',' + first + ' ' + mi + ' ' + title;
            var fhirHumanName;
            chai.expect(function () {
                fhirHumanName = fdt.fhirHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(fhirHumanName).not.to.be.null;
            chai.expect(fhirHumanName).to.be.an('object');
            chai.expect(fhirHumanName).to.have.all.keys('use', 'family', 'given', 'prefix');
            chai.expect(fhirHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(fhirHumanName.family[0]).to.equal(last);
            chai.expect(fhirHumanName.given[0]).to.equal(first + ' ' + mi);
            chai.expect(fhirHumanName.prefix[0]).to.equal(title);
        });

        it.skip('fhirHumanName should throw an Error on bad chcs name', function () {
            var first = "bugs";
            var badName = ',' + first; // misformed, no last name
            chai.expect(function () {
                fdt.fhirHumanName(badName);
            }).to.throw(Error, /Bad chcs name/);
        });

        it.skip('fhirIdentfier should create an array of identifiers if passed in', function () {
            var ssn = 'xxx-xx-xxxx';
            var dod = 'dod-id-number';
            var fhirIds = null;
            chai.expect(function () {
                fhirIds = fdt.fhirIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(fhirIds).not.to.be.null;
            chai.expect(fhirIds).to.be.an('Array');
            chai.expect(fhirIds).to.have.length(2);
            // TODO order in array shouldn't matter, so this test is wrong
            chai.expect(fhirIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'chcss', display: 'chcss'}], text: ssn},
                value: ssn
            });
            chai.expect(fhirIds[1]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'chcss', display: 'chcss'}], text: dod},
                value: dod
            });
        });

        it.skip('fhirIdentfier should skip ssn if undefined', function () {
            var ssn = undefined;
            var dod = 'dod-id-number';
            var fhirIds = null;
            chai.expect(function () {
                fhirIds = fdt.fhirIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(fhirIds).not.to.be.null;
            chai.expect(fhirIds).to.be.an('Array');
            chai.expect(fhirIds).to.have.length(1);
            // TODO order in array shouldn't matter, so this test is wrong
            // chai.expect(fhir_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'chcss', text: ssn}, value: ssn});
            chai.expect(fhirIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'chcss', display: 'chcss'}], text: dod},
                value: dod
            });
        });

        it.skip('fhirIdentfier should skip dod if undefined', function () {
            var ssn = 'xxx-xx-xxxx';
            var dod = undefined;
            var fhirIds = null;
            chai.expect(function () {
                fhirIds = fdt.fhirIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(fhirIds).not.to.be.null;
            chai.expect(fhirIds).to.be.an('Array');
            chai.expect(fhirIds).to.have.length(1);
            // TODO order in array shouldn't matter, so this test is wrong
            chai.expect(fhirIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'chcss', display: 'chcss'}], text: ssn},
                value: ssn
            });
            // chai.expect(fhir_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'chcss', text: dod}, value: dod});
        });

        it.skip('fhirIdentfier should skip ssn and dod if undefined', function () {
            var ssn = undefined;
            var dod = undefined;
            var fhirIds = null;
            chai.expect(function () {
                fhirIds = fdt.fhirIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(fhirIds).to.be.undefined;
        });

        it.skip('fhirMaritalStatus should map to fhir marital status', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["DIVORCED", "SINGLE,NEVER MARRIED", "MARRIED", "LEGALLY SEPARATED"].map(function (ms) {
                return {label: ms};
            }).forEach(function (chcsJsonld) {
                var fhirTranslation;
                chai.expect(function () {
                    fhirTranslation = fdt.fhirMaritalStatus(chcsJsonld);
                }).to.not.throw(Error);
                chai.expect(fhirTranslation).not.to.be.null;
                chai.expect(fhirTranslation.coding[0].code).is.equal(chcsJsonld.label[0][0]);
            });
        });

        it.skip('fhirMaritalStatus should throw error if chcs status unknown', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["askdjfsldaf"].map(function (ms) {
                return {label: ms};
            }).forEach(function (chcsJsonlod) {
                var fhirTranslation;
                chai.expect(function () {
                    fhirTranslation = fdt.fhirMaritalStatus(chcsJsonlod);
                }).to.throw(Error, /not mapped to fhir/);
            });
        });

        // fhirAddress
        // addresses are messy, everything can be optional
        it.skip('fhirAddress should create a fhir address', function () {
            var chcsJsonldPart = {
                // http://smallville.wikia.com/wiki/Daily_Planet
                street1: "1000 Broadway",
                city: "Metropolis",
                state: "Kansas", // yes, Kansas
                zip: "12345",
                country: "USA"
            };
            var fhirTranslation;
            chai.expect(function () {
                fhirTranslation = fdt.fhirAddress(chcsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(fhirTranslation).to.have.all.keys('type', 'line', 'city', 'state',
                'country', 'postalCode', 'resourceType');
            chai.expect(fhirTranslation.line[0]).to.equal(chcsJsonldPart.street1);
            chai.expect(fhirTranslation.city).to.equal(chcsJsonldPart.city);
            chai.expect(fhirTranslation.state).to.equal(chcsJsonldPart.state);
            chai.expect(fhirTranslation.postalCode).to.equal(chcsJsonldPart.zip);
            chai.expect(fhirTranslation.country).to.equal(chcsJsonldPart.country);
        });

        it.skip('fhirAddress should create a fhir address with county', function () {
            var chcsJsonldPart = {
                // http://smallville.wikia.com/wiki/Daily_Planet
                street1: '1000 Broadway',
                city: 'Metropolis',
                state: 'Kansas', // yes, Kansas
                zip: '12345',
                county: 'Pawnee',
                country: 'USA'
            };
            var fhirTranslation;
            chai.expect(function () {
                fhirTranslation = fdt.fhirAddress(chcsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(fhirTranslation).to.have.all.keys('type', 'line', 'city', 'state', 'country',
                'resourceType', 'postalCode', 'district');
            chai.expect(fhirTranslation.line[0]).to.equal(chcsJsonldPart.street1);
            chai.expect(fhirTranslation.city).to.equal(chcsJsonldPart.city);
            chai.expect(fhirTranslation.state).to.equal(chcsJsonldPart.state);
            chai.expect(fhirTranslation.postalCode).to.equal(chcsJsonldPart.zip);
            chai.expect(fhirTranslation.country).to.equal(chcsJsonldPart.country);
            chai.expect(fhirTranslation.district).to.equal(chcsJsonldPart.county);
        });

    });
});
// In these next tests, chcs2fhir_all entire chcs jsonld objects taking their contents from
// specific files. Then investigate the various fhirParts.

describe.skip('for an entire chcs jsonld objects', function () {

    it.skip('medications part (example)', function () {

        // Get the entire chcs jsonld object in a file
        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = chcs_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we chcs2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we chcs2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the chcs input and chcs2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: chcs2fhir_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        var result;
        chai.expect(function () {
            // example calls
            // chcs2fhir_all an entire jsonld chcs object

            chai.expect(function() {
                result = chcs2fhir_all.translatechcsFhir(chcsJsonld);
            }).to.not.throw(Error);
            chai.expect(result).to.have.keys(['options', 'fhir', 'participants']);
            var allFhir = result.fhir;
            //                      ^^^^^^^^^^^^^^^^^ chcs2fhir_all entire chcs jsonld input
            // ... then extract out the fhir medication tranlation
            medicationsTranslateAll = fhir.extractMedications(allFhir);
            //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            medicationsTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a fhir "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the chcs medications objects *first* from the chcs jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        chai.expect(function () {
            // example calls
            // Get the medications from the chcs jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlychcsMedications = chcs.extractPrescriptions(chcsJsonld2);
            chai.expect(onlychcsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlychcsMedications.forEach(function (aSinglechcsMedication) {
                var onlyASingleFhirMedication = chcs2fhir_prescriptions.translatePrescriptionsFhir(aSinglechcsMedication);
                chai.expect(onlyASingleFhirMedication.fhir.resourceType).to.equal('MedicationDispense');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirMedication);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

    });


    it.skip('medications part, same data but reordered', function () {

        // Get the entire chcs jsonld object in a file
        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(chcsJsonld).to.not.eqls(patient7Jsonld); // chcsJsonld


        // We're going to compute the same result two different ways.
        // In the first way, we chcs2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we chcs2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the chcs input and chcs2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: chcs2fhir_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        var result;
        chai.expect(function () {
            // example calls
            // chcs2fhir_all an entire jsonld chcs object

            chai.expect(function() {
                result = chcs2fhir_all.translatechcsFhir(chcsJsonld);
            }).to.not.throw(Error);
            chai.expect(result).to.have.keys(['options', 'fhir', 'participants']);
            var allFhir = result.fhir;
            //                      ^^^^^^^^^^^^^^^^^ chcs2fhir_all entire chcs jsonld input
            // ... then extract out the fhir medication tranlation
            medicationsTranslateAll = fhir.extractMedications(allFhir);
            //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            medicationsTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a fhir "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the chcs medications objects *first* from the chcs jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        chai.expect(function () {
            // example calls
            // Get the medications from the chcs jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlychcsMedications = chcs.extractPrescriptions(chcsJsonld2);
            chai.expect(onlychcsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlychcsMedications.forEach(function (aSinglechcsMedication) {
                var onlyASingleFhirMedication = chcs2fhir_prescriptions.translatePrescriptionsFhir(aSinglechcsMedication);
                chai.expect(onlyASingleFhirMedication.fhir.resourceType).to.equal('MedicationDispense');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirMedication);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

    });


    it.skip('demographic part (example)', function () {

        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = chcs_utils.clone(patient7Jsonld);

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics; // Object
        chai.expect(function () {
            demographics = fhir.extractPatient(chcs2fhir_all.translatechcsFhir(chcsJsonld).fhir);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(demographics);
            }).to.not.throw(Error);

        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;
        chai.expect(demographics.resourceType).to.equal("Patient");

        // Second approach, let's extract the patient out of the entire chcs jsonld input and then
        // chcs2fhir_all only that.
        var chcsPatient;
        var fhirPatientOnly;
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        chai.expect(function () {
            chcsPatient = chcs.extractPatient(chcsJsonld2)[0];
            fhirPatientOnly = chcs2fhir_demographics.translateDemographicsFhir(chcsPatient).fhir;

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(fhirPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(fhirPatientOnly);

    });


    it.skip('diagnoses part (example)', function () {

        // Get the entire chcs jsonld object in a file
        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = chcs_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we chcs2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we chcs2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the chcs input and chcs2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: chcs2fhir_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        var result;
        var allFhir;
        chai.expect(function () {
            // example calls
            // chcs2fhir_all an entire jsonld chcs object
            result = chcs2fhir_all.translatechcsFhir(chcsJsonld, {warnings: true});
            allFhir = result.fhir;
            //                          ^^^^^^^^^^^^^^^^^ chcs2fhir_all entire chcs jsonld input
            // ... then extract out the fhir medication tranlation
            diagnosesTranslateAll = fhir.extractDiagnoses(allFhir);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            diagnosesTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        chai.expect(diagnosesTranslateAll.length).to.equal(3); // should have 3 diagnoses

        // Lift out the first translation
        var firstFhirDiagnosis = fhir.extractDiagnoses(allFhir)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstFhirDiagnosis.subject.reference).to.match(/2-\d+/);
        chai.expect(firstFhirDiagnosis.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        var firstInput = chcs.extractDiagnoses(chcsJsonld2)[0];
        // Patient should translate unscathed.
        chai.expect(firstFhirDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a fhir "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the chcs medications objects *first* from the chcs jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the chcs jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlychcsDiagnoses = chcs.extractDiagnoses(chcsJsonld2);
            chai.expect(onlychcsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlychcsDiagnoses.forEach(function (aSinglechcsDiagnosis) {
                var onlyASingleFhirDiagnosis = chcs2fhir_diagnoses.translateDiagnosesFhir(aSinglechcsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ chcs Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirDiagnosis.fhir.resourceType).to.equal('DiagnosticReport');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


    it.skip('labs part (example)', function () {
        // the entire chcs jsonld object in a file
        var pathnameForTestCase = 'data/fake_chcs/bugs-bunny.jsonld';
        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = chcs_utils.clone(patient7Jsonld);

        // Let's get just the fhir medications portion of the fhir translation.
        // Note that we dodge participating properties and warnings (which are still available
        // for each translation part).
        var labs; // List[Object]
        chai.expect(function () {
            labs = fhir.extractLabs(chcs2fhir_labs.translateLabsFhir(chcsJsonld));

            // See if each separate lab result translates to xml.
            labs.forEach(function (l) {
                chai.expect(function () {
                    parser.toXML(l.fhir);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        labs.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticObservation");
        });

        it.skip('procedures part (example)', function () {

            // Get the entire chcs jsonld object in a file
            // ... loaded into chcs. This has @context and @graph.
            var chcsJsonld = chcs_utils.clone(bugsBunnyProceduresJsonld);


            // We're going to compute the same result two different ways.
            // In the first way, we chcs2fhir_all everything (including medications) and
            // *then* extract the *translated* medications from the aggregate translation
            // (a fhir "bundle"). In the second approach, we chcs2fhir_all just the fhirParts
            // we need, the patient and then medication, but extract those pieces first
            // from the chcs input and chcs2fhir_all the fhirParts. Since some of the medication
            // translation depends on patient input, we pass in just enough of the patient
            // so that we can get a medication translation.

            // First approach: chcs2fhir_all everything, then extract the medications.
            var proceduresTranslateAll; // List[Object]
            chai.expect(function () {
                // example calls
                // chcs2fhir_all an entire jsonld chcs object
                var allFhir = chcs2fhir_all.translatechcsFhir(chcsJsonld);
                //                      ^^^^^^^^^^^^^^^^^ chcs2fhir_all entire chcs jsonld input
                // ... then extract out the fhir medication tranlation
                proceduresTranslateAll = fhir.extractProcedures(allFhir);
                //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the fhir translation

                // finally let's generate the xml associated with each fhir result.
                chai.expect(function () {
                    parser.toXML(allFhir);
                }).to.not.throw(Error);

                // Each separate medication should parse correctly.
                proceduresTranslateAll.forEach(function (m) {
                    chai.expect(function () {
                        parser.toXML(m);
                    }).to.not.throw(Error);
                });

            }).to.not.throw(Error);

            // chai.expect(proceduresTranslateAll.length).to.equal(11); // should have 11 medications
            // Each object should be a fhir "MedicationDispense" resourceType
            proceduresTranslateAll.forEach(function (i) {
                chai.expect(i.resourceType).to.equal('Procedure');
            });


            // Second approach: extract the chcs medications objects *first* from the chcs jsonld "whole thing".
            // Then apply the "one-to-one" fhir translation on that.
            var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
            chai.expect(function () {
                // example calls
                // Get the medications from the chcs jsonld. Might not be any in general. We're expecting as many
                // as we got from the previous test above.
                var onlychcsProcedures = chcs.extractProcedures(chcsJsonld);
                chai.expect(onlychcsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
                onlychcsProcedures.forEach(function (aSinglechcsProcedure) {
                    var onlyASingleFhirProcedure = chcs2fhir_medications.translateMedicationsFhir(aSinglechcsProcedure);
                    //                                        ^^^^^^^^^^^^^^ chcs2fhir_all
                    chai.expect(onlyASingleFhirProcedure.fhir.resourceType).to.equal('Procedure');

                    // parse the single fhir medication into xml
                    chai.expect(function () {
                        parser.toXML(onlyASingleFhirProcedure);
                    }).to.not.throw(Error);


                });

            }).to.not.throw(Error);

        });
    });


    //
    it.skip('procedures part (example)', function () {

        // Get the entire chcs jsonld object in a file
        // ... loaded into chcs. This has @context and @graph.
        var chcsJsonld = chcs_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we chcs2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we chcs2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the chcs input and chcs2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: chcs2fhir_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        var result;
        var allFhir;
        chai.expect(function () {
            // example calls
            // chcs2fhir_all an entire jsonld chcs object
            result = chcs2fhir_all.translatechcsFhir(chcsJsonld, {warnings: true});
            allFhir = result.fhir;
            //                          ^^^^^^^^^^^^^^^^^ chcs2fhir_all entire chcs jsonld input
            // ... then extract out the fhir procedure tranlation
            proceduresTranslateAll = fhir.extractProcedures(allFhir);
            //                           ^^^^^^^^^^^^^^^^ extract just procedures out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            proceduresTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        // chai.expect(proceduresTranslateAll.length).to.equal(3); // should have 3 diagnoses

        // Lift out the first translation
        var firstFhirProcedure = fhir.extractProcedures(allFhir)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstFhirProcedure.subject.reference).to.match(/2-\d+/);
        chai.expect(firstFhirProcedure.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        var firstInput = chcs.extractProcedures(chcsJsonld2)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstFhirProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a fhir "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the chcs medications objects *first* from the chcs jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        var chcsJsonld2 = chcs_utils.clone(patient7Jsonld);
        chai.expect(function () {
            // example calls
            // Get the medications from the chcs jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlychcsProcedures = chcs.extractProcedures(chcsJsonld2);
            chai.expect(onlychcsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlychcsProcedures.forEach(function (aSinglechcsProcedure) {
                var onlyASingleFhirProcedure = chcs2fhir_procedures.translateProceduresFhir(aSinglechcsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ chcs Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirProcedure.fhir.resourceType).to.equal(chcs.chcss.Procedure);

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });

    //


    describe.skip('In various scenarios', function () {
        it.skip('bugs bunny should parse', function () {
            // TODO mike@carif.io: load relative to this file, not pwd?
            // so path would be '../../data/fake_chcs/bugs-bunny.chcs.json'
            // and npm test would work correctly?

            var chcsJsonld = chcs_utils.clone(patient7Jsonld);
            var result;
            var fhirTranslation;
            //chai.expect(function () {
                result = chcs2fhir_all.translatechcsFhir(chcsJsonld);
            //}).to.not.throw(Error);
            chai.expect(result).to.have.keys(['options', 'fhir', 'participants']);
            fhirTranslation = result.fhir;

            var demographics = fhir.extractPatient(fhirTranslation);
            var medications = fhir.extractMedications(fhirTranslation);
            var labs = fhir.extractLabs(fhirTranslation);


            // the medications subreport is an Array[{fhir: <object>, participants: <Array[String]>, warnings: <Array[String]>]
            // should have 11 entries
            chai.expect(medications.length).to.equal(6); // bugs takes 11 meds
            chai.expect(demographics.name.family[0]).to.equal("BUNNY".toUpperCase());
            chai.expect(demographics.name.given[0]).to.equal("BUGS DOC".toUpperCase());

            // Check various fhir translated portions of medications
            var _medications = JSONPath({
                json: medications,
                path: '$.[?(@.resourceType == "MedicationDispense")]'
            });
            chai.expect(_medications.length).to.equal(medications.length);
            var firstMedication = _medications[0];
            chai.expect(firstMedication.resourceType).to.equal('MedicationDispense');
            chai.expect(firstMedication.resourceType).to.equal(fhir.returns[fhir.extractMedications]);
            chai.expect(firstMedication.identifier.value).to.equal('52-40863');
            chai.expect(firstMedication.dosageInstruction[0].timing.repeat.frequency).to.equal(1);
            chai.expect(firstMedication.dosageInstruction[0].timing.repeat.period).to.equal(1);
            chai.expect(firstMedication.dosageInstruction[0].timing.repeat.periodUnit).to.equal('d');
            chai.expect(firstMedication.daysSupply.value).to.equal(120);

            chai.expect(firstMedication.patient.display).to.equal("BUNNY,BUGS".toUpperCase());
            chai.expect(firstMedication.patient.reference).to.equal('Patient/2-000007');
        });
    });

    describe.skip('for coverage', function () {
        describe.skip('missing fields', function () {
            chai.expect(true).to.equal(true);
        });


        describe.skip('missing fields', function () {
            chai.expect(true).to.equal(true);
        });

        describe.skip('missing fields', function () {
            chai.expect(true).to.equal(true);
        });
    });
});




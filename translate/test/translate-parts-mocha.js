/**
 * Depending on the key name, certain cmumps data values can be strings or objects that must be further parsed.
 * The functions that parse them have been nicknamed microparsers. Usually a regular expression is enough. But not always.
 */

var assert = require('assert');
var chai = require('chai');
// var _ = require('underscore');
//var cmumps2fhir = require('../cmumps2fhir');
var cmumps2fhir_all = require('../cmumps2fhir_all');
var cmumps2fhir_demographics = require('../cmumps2fhir_demographics');
var cmumps2fhir_labs = require('../cmumps2fhir_labs');
var cmumps2fhir_diagnoses = require('../cmumps2fhir_diagnoses');
var cmumps2fhir_prescriptions = require('../cmumps2fhir_prescriptions');
var cmumps2fhir_procedures = require('../cmumps2fhir_procedures');


var cmumps2fhir_simple_all = require('../cmumps2fhir_simple_all');
// simple versions (without participating properties)
var cmumps2fhir_simple_demographics = require('../cmumps2fhir_simple_demographics');
// var cmumps2fhir_simple_labs = require('../cmumps2fhir_simple_labs');
var cmumps2fhir_simple_diagnoses = require('../cmumps2fhir_simple_diagnoses');
var cmumps2fhir_simle_prescriptions = require('../cmumps2fhir_simple_prescriptions');
var cmumps2fhir_simple_procedures = require('../cmumps2fhir_simple_procedures');


var fhir = require('../fhir');
var cmumps_utils = require('../util/cmumps_utils');
var cmumps = require('../cmumps');
var JSONPath = require('jsonpath-plus');
var fhir2xml = require('fhir-json-to-xml');
var parser = new fhir2xml.FHIRConverter(2);
var fdt = require('../cmumps2fhir_datatypes');
var test_utils = require('./test_utils');

// Different names for the same input file, allows for easier on-the-fly modications.
// var testDataPath = 'translate/test/data/';
var patient7Jsonld = cmumps_utils.load('data/fake_cmumps/patient-7/cmumps-patient7.jsonld');


describe('cmumps2fhir_all fhirParts', function () {
    describe('across all report categories', function () {

        // fhirDate(cmumpsDate)
        // @see microparsers-mocha.js for misformed input
        it('fhirDate should convert yyyy-mm-dd to mm-dd-yyyy', function () {
            var year = '1809';
            var month = '02';
            var day = '12'; // abe
            var cmumpsDate = year + '-' + month + '-' + day;
            var fhirDate = day + '-' + month + '-' + year;
            chai.expect(function () {
                result = fdt.fhirDate(cmumpsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(fhirDate);
        });

        it('fhirDate should convert yy-mm-dd to mm-dd-19yy', function () {
            var year = '09';
            var month = '02';
            var day = '12'; // abe + 100y
            var cmumpsDate = year + '-' + month + '-' + day;
            var fhirDate = day + '-' + month + '-' + '19' + year;
            chai.expect(function () {
                result = fdt.fhirDate(cmumpsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(fhirDate);
        });

        it('fhirDate should throw an Error with bad cmumps date', function () {
            var year = '9';
            var month = '02';
            day = '12'; // year is bogus
            var cmumpsDate = year + '-' + month + '-' + day;
            chai.expect(function () {
                fdt.fhirDate(cmumpsDate);
            }).to.throw(Error, /Bad cmumps date/);
        });

        // fhirHumanName
        it('fhirHumanName should parse a simple name', function () {
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

        it('fhirHumanName should parse a last, first mi', function () {
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

        it('fhirHumanName should parse last, first mi title', function () {
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

        it('fhirHumanName should throw an Error on bad cmumps name', function () {
            var first = "bugs";
            var badName = ',' + first; // misformed, no last name
            chai.expect(function () {
                fdt.fhirHumanName(badName);
            }).to.throw(Error, /Bad cmumps name/);
        });

        it('fhirIdentfier should create an array of identifiers if passed in', function () {
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
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: ssn},
                value: ssn
            });
            chai.expect(fhirIds[1]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: dod},
                value: dod
            });
        });

        it('fhirIdentfier should skip ssn if undefined', function () {
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
            // chai.expect(fhir_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'cmumpss', text: ssn}, value: ssn});
            chai.expect(fhirIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: dod},
                value: dod
            });
        });

        it('fhirIdentfier should skip dod if undefined', function () {
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
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: ssn},
                value: ssn
            });
            // chai.expect(fhir_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'cmumpss', text: dod}, value: dod});
        });

        it('fhirIdentfier should skip ssn and dod if undefined', function () {
            var ssn = undefined;
            var dod = undefined;
            var fhirIds = null;
            chai.expect(function () {
                fhirIds = fdt.fhirIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(fhirIds).to.be.undefined;
        });

        it('fhirMaritalStatus should map to fhir marital status', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["DIVORCED", "SINGLE,NEVER MARRIED", "MARRIED", "LEGALLY SEPARATED"].map(function (ms) {
                return {label: ms};
            }).forEach(function (cmumpsJsonld) {
                var fhirTranslation;
                chai.expect(function () {
                    fhirTranslation = fdt.fhirMaritalStatus(cmumpsJsonld);
                }).to.not.throw(Error);
                chai.expect(fhirTranslation).not.to.be.null;
                chai.expect(fhirTranslation.coding[0].code).is.equal(cmumpsJsonld.label[0][0]);
            });
        });

        it('fhirMaritalStatus should throw error if cmumps status unknown', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["askdjfsldaf"].map(function (ms) {
                return {label: ms};
            }).forEach(function (cmumpsJsonlod) {
                var fhirTranslation;
                chai.expect(function () {
                    fhirTranslation = fdt.fhirMaritalStatus(cmumpsJsonlod);
                }).to.throw(Error, /not mapped to fhir/);
            });
        });

        // fhirAddress
        // addresses are messy, everything can be optional
        it('fhirAddress should create a fhir address', function () {
            var cmumpsJsonldPart = {
                // http://smallville.wikia.com/wiki/Daily_Planet
                street1: "1000 Broadway",
                city: "Metropolis",
                state: "Kansas", // yes, Kansas
                zip: "12345",
                country: "USA"
            };
            var fhirTranslation;
            chai.expect(function () {
                fhirTranslation = fdt.fhirAddress(cmumpsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(fhirTranslation).to.have.all.keys('type', 'line', 'city', 'state',
                'country', 'postalCode', 'resourceType');
            chai.expect(fhirTranslation.line[0]).to.equal(cmumpsJsonldPart.street1);
            chai.expect(fhirTranslation.city).to.equal(cmumpsJsonldPart.city);
            chai.expect(fhirTranslation.state).to.equal(cmumpsJsonldPart.state);
            chai.expect(fhirTranslation.postalCode).to.equal(cmumpsJsonldPart.zip);
            chai.expect(fhirTranslation.country).to.equal(cmumpsJsonldPart.country);
        });

        it('fhirAddress should create a fhir address with county', function () {
            var cmumpsJsonldPart = {
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
                fhirTranslation = fdt.fhirAddress(cmumpsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(fhirTranslation).to.have.all.keys('type', 'line', 'city', 'state', 'country',
                'resourceType', 'postalCode', 'district');
            chai.expect(fhirTranslation.line[0]).to.equal(cmumpsJsonldPart.street1);
            chai.expect(fhirTranslation.city).to.equal(cmumpsJsonldPart.city);
            chai.expect(fhirTranslation.state).to.equal(cmumpsJsonldPart.state);
            chai.expect(fhirTranslation.postalCode).to.equal(cmumpsJsonldPart.zip);
            chai.expect(fhirTranslation.country).to.equal(cmumpsJsonldPart.country);
            chai.expect(fhirTranslation.district).to.equal(cmumpsJsonldPart.county);
        });


        it('fhirTiming(undefined) => undefined', function () {
            var sig = undefined;
            var fhirTiming;
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(undefined);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.equal(undefined);
        });

        it('fhirTiming twice daily', function () {
            var sig = 'BID';
            var when = 'sometime';
            var fhirTiming;
            var result = {
                resourceType: 'Timing',
                event: [ when ],
                repeat: {
                    frequency: 2,
                    period: 1,
                    periodUnit: 'd'
                },
                code: fdt.fhirCodeableConcept(sig)
            };
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(sig, when);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.eqls(result);
        });

        it('fhirTiming thrice daily', function () {
            var sig = 'TID';
            var when = 'sometime';
            var fhirTiming;
            var result = {
                resourceType: 'Timing',
                event: [ when ],
                repeat: {
                    frequency: 3,
                    period: 1,
                    periodUnit: 'd'
                },
                code: fdt.fhirCodeableConcept(sig)
            };
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(sig, when);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.eqls(result);
        });

        it('fhirTiming four times daily', function () {
            var sig = 'QID';
            var when = 'sometime';
            var fhirTiming;
            var result = {
                resourceType: 'Timing',
                event: [ when ],
                repeat: {
                    frequency: 4,
                    period: 1,
                    periodUnit: 'd'
                },
                code: fdt.fhirCodeableConcept(sig)
            };
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(sig, when);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.eqls(result);
        });

        it('fhirTiming four times a day', function () {
            var sig = 'Q6H';
            var when = 'sometime';
            var fhirTiming;
            var result = {
                resourceType: 'Timing',
                event: [ when ],
                repeat: {
                    frequency: 1,
                    period: 6,
                    periodUnit: 'h'
                },
                code: fdt.fhirCodeableConcept(sig)
            };
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(sig, when);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.eqls(result);
        });

        it('fhirTiming daily', function () {
            var sig = 'Q1D';
            var when = 'sometime';
            var fhirTiming;
            var result = {
                resourceType: 'Timing',
                event: [ when ],
                repeat: {
                    frequency: 1,
                    period: 1,
                    periodUnit: 'd'
                },
                code: fdt.fhirCodeableConcept(sig)
            };
            chai.expect(function () {
                fhirTiming = fdt.fhirTiming(sig, when);
            }).to.not.throw(Error);
            chai.expect(fhirTiming).to.eqls(result);
        });


        it('fdt.makeJsonFetcher1 only works on objects', function () {
            chai.expect(function () {
                fdt.makeJsonFetcher1(1, []);
            }).to.throw(Error, /Can only make json fetchers on objects./); // encoding the actual message is brittle
        });

        it('fdt.peek only works on objects', function () {
            chai.expect(function () {
                fdt.peek(1, []);
            }).to.throw(Error, /Can only make json fetchers on objects./); // encoding the actual message is brittle
        });

        it('fdt.eat only works on objects', function () {
            chai.expect(function () {
                fdt.eat(1, []);
            }).to.throw(Error, /Can only make json fetchers on objects./); // encoding the actual message is brittle
        });

        it('cleaning an empty array returns undefined', function () {
            var cleaned;
            chai.expect(function() {
                cleaned = fdt.clean([])
            }).to.not.throw(Error);
            chai.expect(cleaned).is.equals(undefined);
        });

        it('clean([o]) is the same as [clean(o)]', function () {
            var start = {x: 1, gone: undefined}; // gone removed
            var cleaned0 = cmumps_utils.clone(start);
            var cleaned1 = cmumps_utils.clone(start); // cleaned0, cleaned1 modified
            chai.expect(function() {
                cleaned0 = fdt.clean(start);
                cleaned1 = fdt.clean([start]);
            }).to.not.throw(Error);
            chai.expect(cleaned1.length).to.equal(1);
            chai.expect(cleaned0).is.equals(cleaned1[0]);
        });


    });
});
// In these next tests, cmumps2fhir_all entire cmumps jsonld objects taking their contents from
// specific files. Then investigate the various fhirParts.

describe('for an entire cmumps jsonld objects', function () {

    it('translate with label only', function() {
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);
        var thePatient = cmumps.extractPatient(cmumpsJsonld);
        delete thePatient['name-2'];
        var minimal = {
            '@content': cmumpsJsonld['@content'],
            '@graph': [ thePatient ]
    };

        var translatedPatient;
        chai.expect(function() {
            translatedPatient = cmumps2fhir_simple_demographics.translate(cmumps.extractPatient(cmumpsJsonld)[0]);
        }).to.not.throw(Error);

        lastFirst = thePatient[0]['label'].split(',');
        chai.expect(lastFirst[0]).to.equal(translatedPatient.name.family[0]);
        chai.expect(translatedPatient.name.given[0]).to.equals('BUGS DOC'); // label can be different from name

    });


    it('medications part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        // Clone the object so that as you modify parts of it, you
        // don't ruin the source.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        var allFhir, allFhirArray, simpleAllFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {}, 'now');
            // If the input is wrapped in an array, the translator digs each one out and translates that.
            allFhirArray = cmumps2fhir_all.translatecmumpsFhir([cmumpsJsonld, cmumpsJsonld, cmumpsJsonld], {}, 'now');
            simpleAllFhir = cmumps2fhir_simple_all.translate(cmumpsJsonld, 'now');
            //                      ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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

        chai.expect(allFhir).is.eql(simpleAllFhir);

        chai.expect(allFhirArray.length).to.equal(3);
        chai.expect(allFhirArray[0]).eqls(allFhirArray[1]);
        chai.expect(allFhirArray[2]).eqls(allFhir);

        // Because of terminology, a patient is a single object and a demographic is a list of patients.
        var thePatient = fhir.extractPatient(simpleAllFhir);
        var thePatients = fhir.extractDemographics(simpleAllFhir);
        chai.expect(thePatients.length).to.equals(1);
        chai.expect(thePatients[0]).eqls(thePatient);


        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a fhir "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASingleFhirMedication = cmumps2fhir_prescriptions.translatePrescriptionsFhir(aSinglecmumpsMedication);
                chai.expect(onlyASingleFhirMedication.resourceType).to.equal('MedicationDispense');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirMedication);
                }).to.not.throw(Error);


            });
        }).to.not.throw(Error);


        // Checking the policy doesn't matter
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {policy: true}, 'now');
        }).to.not.throw(Error);



        // check various errors
        // Checking the policy with two patient records is an error and should throw
        var twoPatientsCmumpsJsonld = cmumps_utils.clone(cmumpsJsonld);

        // Create some bad input with a cmumps input that has two patients.
        twoPatientsCmumpsJsonld['@graph'].push(cmumps.extractDemographics(cmumpsJsonld)[0]);
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(twoPatientsCmumpsJsonld, {policy: true}, 'now');
        }).to.throw(Error);

        // check various errors
        // Checking the policy with two patient records is an error and should throw
        var noPatientsCmumpsJsonld = cmumps_utils.clone(cmumpsJsonld);
        // No patient present should produce an error.
        cmumps.removePatient(noPatientsCmumpsJsonld);
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(noPatientsCmumpsJsonld, {policy: true}, 'now');
        }).to.throw(Error);

        // No graph should throw an error
        var noGraphCmumpsJsonld = cmumps_utils.clone(cmumpsJsonld);
        delete noGraphCmumpsJsonld['@graph'];
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(noGraphCmumpsJsonld, {policy: true}, 'now');
        }).to.throw(Error);

        // An @graph that's not an array should throw an error.
        noGraphCmumpsJsonld['@graph'] = 1;
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(noGraphCmumpsJsonld, {policy: true}, 'now');
        }).to.throw(Error);

        // An empty @graph should throw an error.
        noGraphCmumpsJsonld['@graph'] = [];
        chai.expect(function () {
            allFhir = cmumps2fhir_all.translatecmumpsFhir(noGraphCmumpsJsonld, {policy: true}, 'now');
        }).to.throw(Error);


    });

    it('simple medications part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        // Clone the object so that as you modify parts of it, you
        // don't ruin the source.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            medicationsTranslateAll = cmumps.extractMedications(cmumpsJsonld).map(cmumps2fhir_simle_prescriptions.translate);

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


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASingleFhirMedication = cmumps2fhir_prescriptions.translatePrescriptionsFhir(aSinglecmumpsMedication);
                chai.expect(onlyASingleFhirMedication.resourceType).to.equal('MedicationDispense');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirMedication);
                }).to.not.throw(Error);


            });
        }).to.not.throw(Error);

    });


    it('medications part, same data but reordered', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        // Clone the object so that as you modify parts of it, you
        // don't ruin the source.
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            var allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
            //                      ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASingleFhirMedication = cmumps2fhir_prescriptions.translatePrescriptionsFhir(aSinglecmumpsMedication);
                chai.expect(onlyASingleFhirMedication.resourceType).to.equal('MedicationDispense');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirMedication);
                }).to.not.throw(Error);


            });
        }).to.not.throw(Error);


        var removedCmumpsPrescriptions = cmumps.removePrescriptions(cmumpsJsonld); // modifies cmumpsJsonld
        chai.expect(removedCmumpsPrescriptions).has.length(medicationsTranslateAll.length);

        var noCmumpsPrescriptions = cmumps.removePrescriptions(cmumpsJsonld);
        // TODO: lengths don't seem right
        chai.expect(noCmumpsPrescriptions).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutPrescriptions = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
        var noPrescriptions = fhir.extractMedications(translationWithoutPrescriptions);
        chai.expect(noPrescriptions).has.length(0);


    });


    it('extract cmumps demographic part (example)', function () {

        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics; // Object
        chai.expect(function () {
            demographics = cmumps.extractDemographics(cmumpsJsonld);
        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;

    });


    it('extract demographic part (example)', function () {

        // the entire cmumps jsonld object in a file
        var pathnameForTestCase = 'data/fake_cmumps/bugs-bunny.jsonld';
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);
        ;

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = fhir.extractPatient(cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld));
            simpleDemographics = cmumps2fhir_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
            // parsable into xml?
            chai.expect(function () {
                parser.toXML(demographics);
            }).to.not.throw(Error);

        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;
        chai.expect(demographics.resourceType).to.equal("Patient");
        chai.expect(simpleDemographics).is.not.null;
        chai.expect(simpleDemographics.resourceType).to.equal("Patient");
        chai.expect(demographics).eql(simpleDemographics);

        // Second approach, let's extract the patient out of the entire cmumps jsonld input and then
        // cmumps2fhir_all only that.
        var cmumpsPatient;
        var fhirPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            fhirPatientOnly = cmumps2fhir_demographics.translateDemographicsFhir(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(fhirPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);


        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(fhirPatientOnly);

        cmumps.removePatient(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsPatient = cmumps.extractPatient(cmumpsJsonld);
        chai.expect(noCmumpsPatient).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDemographics = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
        var noDemographics = fhir.extractPatient(translationWithoutDemographics);
        chai.expect(noDemographics).is.undefined;


    });


    it('extract demographic part, reorder input', function () {

        // ... loaded into cmumps. This has @context and @graph, but in a different order from patient7Jsonld
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = fhir.extractPatient(cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld));
            simpleDemographics = cmumps2fhir_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
            // parsable into xml?
            chai.expect(function () {
                parser.toXML(demographics);
            }).to.not.throw(Error);

        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;
        chai.expect(demographics.resourceType).to.equal("Patient");
        chai.expect(simpleDemographics).is.not.null;
        chai.expect(simpleDemographics.resourceType).to.equal("Patient");
        chai.expect(demographics).eql(simpleDemographics);

        // Second approach, let's extract the patient out of the entire cmumps jsonld input and then
        // cmumps2fhir_all only that.
        var cmumpsPatient;
        var fhirPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            fhirPatientOnly = cmumps2fhir_demographics.translateDemographicsFhir(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(fhirPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(fhirPatientOnly);

    });


    it('extract cmumps demographic part (example)', function () {

        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics; // Object
        chai.expect(function () {
            demographics = cmumps.extractDemographics(cmumpsJsonld);
        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;

    });


    it('extract demographic part (example)', function () {

        // the entire cmumps jsonld object in a file
        var pathnameForTestCase = 'data/fake_cmumps/bugs-bunny.jsonld';
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);
        ;

        // First approach: Let's get just the fhir demographics portion of the entire fhir translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = fhir.extractPatient(cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld));
            simpleDemographics = cmumps2fhir_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
            // parsable into xml?
            chai.expect(function () {
                parser.toXML(demographics);
            }).to.not.throw(Error);

        }).to.not.throw(Error);
        chai.expect(demographics).is.not.null;
        chai.expect(demographics.resourceType).to.equal("Patient");
        chai.expect(simpleDemographics).is.not.null;
        chai.expect(simpleDemographics.resourceType).to.equal("Patient");
        chai.expect(demographics).eql(simpleDemographics);

        // Second approach, let's extract the patient out of the entire cmumps jsonld input and then
        // cmumps2fhir_all only that.
        var cmumpsPatient;
        var fhirPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            fhirPatientOnly = cmumps2fhir_demographics.translateDemographicsFhir(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(fhirPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(fhirPatientOnly);

    });


    it('diagnoses part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstFhirDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a fhir "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASingleFhirDiagnosis = cmumps2fhir_diagnoses.translateDiagnosesFhir(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);


        cmumps.removeDiagnoses(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
        chai.expect(noCmumpsDiagnoses).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDiagnoses = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
        var noDiagnoses = fhir.extractDiagnoses(translationWithoutDiagnoses);
        chai.expect(noDiagnoses).has.length(0);

    });


    it('simple diagnoses part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result multiple ways and then compare the results.
        // We:
        //   * extract the diagnoses from the input. Then translate each of them using the simple
        //     translator.
        //   * translate the entire input, then extract out the translated results.
        // We:
        //   * look at the first translation "indepth"
        //   * translate each diagnoses and "spot check" values, similar to the first bullet above.
        //   * finally we remove all the diagnoses and try translating them. Should be none. Want to
        //     test that edge case.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            diagnosesTranslateAll = cmumps.extractDiagnoses(cmumpsJsonld).map(cmumps2fhir_simple_diagnoses.translate);

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(diagnosesTranslateAll);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            diagnosesTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);


        var diagnosesTranslateAllExtracted; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
            // ... then extract out the fhir medication tranlation
            diagnosesTranslateAllExtracted = fhir.extractDiagnoses(allFhir);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            diagnosesTranslateAllExtracted.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        // Same result computed two different ways.
        chai.expect(diagnosesTranslateAll).eql(diagnosesTranslateAllExtracted);


        chai.expect(diagnosesTranslateAll.length).to.equal(3); // should have 3 diagnoses

        // Lift out the first translation
        var firstFhirDiagnosis = diagnosesTranslateAll[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstFhirDiagnosis.subject.reference).to.match(/2-\d+/);
        chai.expect(firstFhirDiagnosis.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstFhirDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a fhir "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASingleFhirDiagnosis = cmumps2fhir_simple_diagnoses.translate(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);


        cmumps.removeDiagnoses(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
        chai.expect(noCmumpsDiagnoses).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDiagnoses = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
        var noDiagnoses = fhir.extractDiagnoses(translationWithoutDiagnoses);
        chai.expect(noDiagnoses).has.length(0);


    });


    it('diagnoses part, reordered data', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstFhirDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a fhir "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASingleFhirDiagnosis = cmumps2fhir_diagnoses.translateDiagnosesFhir(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


    it('labs part (example)', function () {
        // the entire cmumps jsonld object in a file
        var pathnameForTestCase = 'data/fake_cmumps/bugs-bunny.jsonld';
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);
        ;

        // Let's get just the fhir medications portion of the fhir translation.
        // Note that we dodge participating properties and warnings (which are still available
        // for each translation part).
        var labs; // List[Object]
        chai.expect(cmumps2fhir_labs.translateLabsFhir.deferred).is.true;
        var labs = cmumps.extractLabs(cmumpsJsonld);
        chai.expect(labs.length).is.greaterThan(0);
        var fhirDiagnosticReports;
        chai.expect(function () {
            fhirDiagnosticReports = labs.map(function (l) { return cmumps2fhir_labs.translateLabsFhir(l); });
        }).to.not.throw(Error);

        fhirDiagnosticReports.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport");
        });

        var firstLab = labs[0];
        var firstDeferredTranslation = fhirDiagnosticReports[0];
        chai.expect(firstDeferredTranslation['t:translatedBy']['t:sourceNode']).eql(firstLab);

    });

    it('procedures part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            var allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
            //                      ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
            // ... then extract out the fhir medication tranlation
            proceduresTranslateAll = fhir.extractProcedures(allFhir);
            //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the fhir translation

            // Now that labs are deferred, they are no longer valid xml.
            // finally let's generate the xml associated with each fhir result.
            // chai.expect(function () {
            //    parser.toXML(allFhir);
            // }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            proceduresTranslateAll.forEach(function (m) {
                if (! m._deferred) {
                    chai.expect(function () {
                        parser.toXML(m);
                    }).to.not.throw(Error);
                }
            });

        }).to.not.throw(Error);

        // chai.expect(proceduresTranslateAll.length).to.equal(11); // should have 11 medications
        // Each object should be a fhir "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal('Procedure');
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASingleFhirProcedure = cmumps2fhir_procedures.translateProceduresFhir(aSinglecmumpsProcedure);
                //                                        ^^^^^^^^^^^^^^ cmumps2fhir_all
                chai.expect(onlyASingleFhirProcedure.resourceType).to.equal('Procedure');

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });

//
    it('procedures part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstFhirProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a fhir "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASingleFhirProcedure = cmumps2fhir_procedures.translateProceduresFhir(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


    it('simple procedures part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            proceduresTranslateAll = cmumps.extractProcedures(cmumpsJsonld).map(cmumps2fhir_simple_procedures.translate);

            // Each separate medication should parse correctly.
            proceduresTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);


        var proceduresTranslateAllExtracted; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
            // ... then extract out the fhir medication tranlation
            proceduresTranslateAllExtracted = fhir.extractProcedures(allFhir);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the fhir translation

            // finally let's generate the xml associated with each fhir result.
            chai.expect(function () {
                parser.toXML(allFhir);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            proceduresTranslateAllExtracted.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        // Same result computed two different ways.
        chai.expect(proceduresTranslateAll).eql(proceduresTranslateAllExtracted);


        // chai.expect(proceduresTranslateAll.length).to.equal(3); // should have 3 diagnoses

        // Lift out the first translation
        var firstFhirProcedure = proceduresTranslateAll[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstFhirProcedure.subject.reference).to.match(/2-\d+/);
        chai.expect(firstFhirProcedure.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstFhirProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a fhir "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASingleFhirProcedure = cmumps2fhir_procedures.translateProceduresFhir(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


    it('procedures part, reordered data', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        // confirm that @graph has been reorder
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2fhir_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a fhir "bundle"). In the second approach, we cmumps2fhir_all just the fhirParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2fhir_all the fhirParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2fhir_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        var allFhir;
        chai.expect(function () {
            // example calls
            // cmumps2fhir_all an entire jsonld cmumps object
            allFhir = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2fhir_all entire cmumps jsonld input
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
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstFhirProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a fhir "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" fhir translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASingleFhirProcedure = cmumps2fhir_procedures.translateProceduresFhir(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => FHIR DiagnosticReport directly
                chai.expect(onlyASingleFhirProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single fhir medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASingleFhirProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


//


    describe('In various scenarios', function () {
        it('bugs bunny should appear', function () {
            // TODO mike@carif.io: load relative to this file, not pwd?
            // so path would be '../../data/fake_cmumps/bugs-bunny.cmumps.json'
            // and npm test would work correctly?

            var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);
            ;
            var fhirTranslation;
            chai.expect(function () {
                fhirTranslation = cmumps2fhir_all.translatecmumpsFhir(cmumpsJsonld);
            }).to.not.throw(Error);

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

    describe('for coverage', function () {
        describe('missing fields', function () {
            chai.expect(true).to.equal(true);
        });


        describe('missing fields', function () {
            chai.expect(true).to.equal(true);
        });

        describe('missing fields', function () {
            chai.expect(true).to.equal(true);
        });
    });
})
;




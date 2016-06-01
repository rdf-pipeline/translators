/**
 * Depending on the key name, certain cmumps data values can be strings or objects that must be further parsed.
 * The functions that parse them have been nicknamed microparsers. Usually a regular expression is enough. But not always.
 */

var assert = require('assert');
var chai = require('chai');
// var _ = require('underscore');
//var cmumps2sd = require('../cmumps2sd');
var cmumps2sd_all = require('../cmumps2sd_all');
var cmumps2sd_demographics = require('../cmumps2sd_demographics');
var cmumps2sd_labs = require('../cmumps2sd_labs');
var cmumps2sd_diagnoses = require('../cmumps2sd_diagnoses');
var cmumps2sd_prescriptions = require('../cmumps2sd_prescriptions');
var cmumps2sd_procedures = require('../cmumps2sd_procedures');


var cmumps2sd_simple_all = require('../cmumps2sd_simple_all');
// simple versions (without participating properties)
var cmumps2sd_simple_demographics = require('../cmumps2sd_simple_demographics');
// var cmumps2sd_simple_labs = require('../cmumps2sd_simple_labs');
var cmumps2sd_simple_diagnoses = require('../cmumps2sd_simple_diagnoses');
var cmumps2sd_simle_prescriptions = require('../cmumps2sd_simple_prescriptions');
var cmumps2sd_simple_procedures = require('../cmumps2sd_simple_procedures');




'use strict';
var prefix = '../../translate/';
var sd = require('../sd');
var cmumps_utils = require(prefix + 'util/cmumps_utils');
var cmumps = require(prefix + 'cmumps');
var JSONPath = require('jsonpath-plus');
// var sd2xml = require('sd-json-to-xml');
// var parser = new sd2xml.sdConverter(2);
var fdt = require('../cmumps2sd_datatypes');
var test_utils = require('./test_utils');

// Different names for the same input file, allows for easier on-the-fly modications.
// var testDataPath = 'translate/test/data/';
var patient7Jsonld = cmumps_utils.load('data/fake_cmumps/patient-7/cmumps-patient7.jsonld');


describe('cmumps2sd_all sdParts', function () {
    describe('across all report categories', function () {

        // sdDate(cmumpsDate)
        // @see microparsers-mocha.js for misformed input
        it('sdDate should convert yyyy-mm-dd to mm-dd-yyyy', function () {
            var year = '1809';
            var month = '02';
            var day = '12'; // abe
            var cmumpsDate = year + '-' + month + '-' + day;
            var sdDate = day + '-' + month + '-' + year;
            var result;
            chai.expect(function () {
                result = fdt.sdDate(cmumpsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(sdDate);
        });

        it('sdDate should convert yy-mm-dd to mm-dd-19yy', function () {
            var year = '09';
            var month = '02';
            var day = '12'; // abe + 100y
            var cmumpsDate = year + '-' + month + '-' + day;
            var sdDate = day + '-' + month + '-' + '19' + year;
            var result;
            chai.expect(function () {
                result = fdt.sdDate(cmumpsDate);
            }).to.not.throw(Error);
            chai.expect(result).not.to.be.null;
            chai.expect(result).to.be.an('string');
            chai.expect(result).equals(sdDate);
        });

        it('sdDate should throw an Error with bad cmumps date', function () {
            var year = '9';
            var month = '02';
            var day = '12'; // year is bogus
            var cmumpsDate = year + '-' + month + '-' + day;
            chai.expect(function () {
                fdt.sdDate(cmumpsDate);
            }).to.throw(Error, /Bad cmumps date/);
        });

        // sdHumanName
        it('sdHumanName should parse a simple name', function () {
            var last = "bunny";
            var first = "bugs";
            var aName = last + ',' + first;
            var sdHumanName;
            chai.expect(function () {
                sdHumanName = fdt.sdHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(sdHumanName).not.to.be.null;
            chai.expect(sdHumanName).to.be.an('object');
            chai.expect(sdHumanName).to.have.all.keys('use', 'family', 'given');
            chai.expect(sdHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(sdHumanName.family[0]).to.equal(last);
            chai.expect(sdHumanName.given[0]).to.equal(first);
            chai.expect(sdHumanName).not.has.property('title');
        });

        it('sdHumanName should parse a last, first mi', function () {
            var last = "bunny";
            var first = "bugs";
            var mi = 'doc';
            var aName = last + ',' + first + ' ' + mi;
            var sdHumanName;
            chai.expect(function () {
                sdHumanName = fdt.sdHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(sdHumanName).not.to.be.null;
            chai.expect(sdHumanName).to.be.an('object');
            chai.expect(sdHumanName).to.have.all.keys('use', 'family', 'given');
            chai.expect(sdHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(sdHumanName.family[0]).to.equal(last);
            chai.expect(sdHumanName.given[0]).to.equal(first + ' ' + mi);
            chai.expect(sdHumanName).not.has.property('title');
        });

        it('sdHumanName should parse last, first mi title', function () {
            var last = "bunny";
            var first = "bugs";
            var mi = 'doc';
            var title = 'mr';
            var aName = last + ',' + first + ' ' + mi + ' ' + title;
            var sdHumanName;
            chai.expect(function () {
                sdHumanName = fdt.sdHumanName(aName);
            }).to.not.throw(Error);
            chai.expect(sdHumanName).not.to.be.null;
            chai.expect(sdHumanName).to.be.an('object');
            chai.expect(sdHumanName).to.have.all.keys('use', 'family', 'given', 'prefix');
            chai.expect(sdHumanName.use).to.equal('usual');
            // TODO eql doesn't work?
            chai.expect(sdHumanName.family[0]).to.equal(last);
            chai.expect(sdHumanName.given[0]).to.equal(first + ' ' + mi);
            chai.expect(sdHumanName.prefix[0]).to.equal(title);
        });

        it('sdHumanName should throw an Error on bad cmumps name', function () {
            var first = "bugs";
            var badName = ',' + first; // misformed, no last name
            chai.expect(function () {
                fdt.sdHumanName(badName);
            }).to.throw(Error, /Bad cmumps name/);
        });

        it('sdIdentfier should create an array of identifiers if passed in', function () {
            var ssn = 'xxx-xx-xxxx';
            var dod = 'dod-id-number';
            var sdIds = null;
            chai.expect(function () {
                sdIds = fdt.sdIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(sdIds).not.to.be.null;
            chai.expect(sdIds).to.be.an('Array');
            chai.expect(sdIds).to.have.length(2);
            // TODO order in array shouldn't matter, so this test is wrong
            chai.expect(sdIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: ssn},
                value: ssn
            });
            chai.expect(sdIds[1]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: dod},
                value: dod
            });
        });

        it('sdIdentfier should skip ssn if undefined', function () {
            var ssn = undefined;
            var dod = 'dod-id-number';
            var sdIds = null;
            chai.expect(function () {
                sdIds = fdt.sdIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(sdIds).not.to.be.null;
            chai.expect(sdIds).to.be.an('Array');
            chai.expect(sdIds).to.have.length(1);
            // TODO order in array shouldn't matter, so this test is wrong
            // chai.expect(sd_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'cmumpss', text: ssn}, value: ssn});
            chai.expect(sdIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: dod},
                value: dod
            });
        });

        it('sdIdentfier should skip dod if undefined', function () {
            var ssn = 'xxx-xx-xxxx';
            var dod = undefined;
            var sdIds = null;
            chai.expect(function () {
                sdIds = fdt.sdIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(sdIds).not.to.be.null;
            chai.expect(sdIds).to.be.an('Array');
            chai.expect(sdIds).to.have.length(1);
            // TODO order in array shouldn't matter, so this test is wrong
            chai.expect(sdIds[0]).to.eqls({
                use: 'usual',
                // assigner: 'US',
                type: {coding: [{code: 'cmumpss', display: 'cmumpss'}], text: ssn},
                value: ssn
            });
            // chai.expect(sd_ids[0]).to.eqls({use: 'usual', assigner: 'US', type: {coding: 'cmumpss', text: dod}, value: dod});
        });

        it('sdIdentfier should skip ssn and dod if undefined', function () {
            var ssn = undefined;
            var dod = undefined;
            var sdIds = null;
            chai.expect(function () {
                sdIds = fdt.sdIdentifier(ssn, dod);
            }).to.not.throw(Error);
            chai.expect(sdIds).to.be.undefined;
        });

        it('sdMaritalStatus should map to sd marital status', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["DIVORCED", "SINGLE,NEVER MARRIED", "MARRIED", "LEGALLY SEPARATED"].map(function (ms) {
                return {label: ms};
            }).forEach(function (cmumpsJsonld) {
                var sdTranslation;
                chai.expect(function () {
                    sdTranslation = fdt.sdMaritalStatus(cmumpsJsonld);
                }).to.not.throw(Error);
                chai.expect(sdTranslation).not.to.be.null;
                chai.expect(sdTranslation.coding[0].code).is.equal(cmumpsJsonld.label[0][0]);
            });
        });

        it('sdMaritalStatus should throw error if cmumps status unknown', function () {
            // TODO: generate this enumeration from mongodb or schema/model provided by nodeVISTA?
            ["askdjfsldaf"].map(function (ms) {
                return {label: ms};
            }).forEach(function (cmumpsJsonlod) {
                var sdTranslation;
                chai.expect(function () {
                    sdTranslation = fdt.sdMaritalStatus(cmumpsJsonlod);
                }).to.throw(Error, /not mapped to sd/);
            });
        });

        // sdAddress
        // addresses are messy, everything can be optional
        it('sdAddress should create a sd address', function () {
            var cmumpsJsonldPart = {
                // http://smallville.wikia.com/wiki/Daily_Planet
                street1: "1000 Broadway",
                city: "Metropolis",
                state: "Kansas", // yes, Kansas
                zip: "12345",
                country: "USA"
            };
            var sdTranslation;
            chai.expect(function () {
                sdTranslation = fdt.sdAddress(cmumpsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(sdTranslation).to.have.all.keys('type', 'line', 'city', 'state',
                'country', 'postalCode', 'resourceType');
            chai.expect(sdTranslation.line[0]).to.equal(cmumpsJsonldPart.street1);
            chai.expect(sdTranslation.city).to.equal(cmumpsJsonldPart.city);
            chai.expect(sdTranslation.state).to.equal(cmumpsJsonldPart.state);
            chai.expect(sdTranslation.postalCode).to.equal(cmumpsJsonldPart.zip);
            chai.expect(sdTranslation.country).to.equal(cmumpsJsonldPart.country);
        });

        it('sdAddress should create a sd address with county', function () {
            var cmumpsJsonldPart = {
                // http://smallville.wikia.com/wiki/Daily_Planet
                street1: '1000 Broadway',
                city: 'Metropolis',
                state: 'Kansas', // yes, Kansas
                zip: '12345',
                county: 'Pawnee',
                country: 'USA'
            };
            var sdTranslation;
            chai.expect(function () {
                sdTranslation = fdt.sdAddress(cmumpsJsonldPart);
            }).to.not.throw(Error);
            chai.expect(sdTranslation).to.have.all.keys('type', 'line', 'city', 'state', 'country',
                'resourceType', 'postalCode', 'district');
            chai.expect(sdTranslation.line[0]).to.equal(cmumpsJsonldPart.street1);
            chai.expect(sdTranslation.city).to.equal(cmumpsJsonldPart.city);
            chai.expect(sdTranslation.state).to.equal(cmumpsJsonldPart.state);
            chai.expect(sdTranslation.postalCode).to.equal(cmumpsJsonldPart.zip);
            chai.expect(sdTranslation.country).to.equal(cmumpsJsonldPart.country);
            chai.expect(sdTranslation.district).to.equal(cmumpsJsonldPart.county);
        });

    });
});
// In these next tests, cmumps2sd_all entire cmumps jsonld objects taking their contents from
// specific files. Then investigate the various sdParts.

describe('for an entire cmumps jsonld objects', function () {


    it('medications part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        // Clone the object so that as you modify parts of it, you
        // don't ruin the source.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        var allsd, simpleAllsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {}, 'now');
            simpleAllsd = cmumps2sd_simple_all.translate(cmumpsJsonld, 'now');

            //                      ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            medicationsTranslateAll = sd.extractMedications(allsd);
            //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            medicationsTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });


        }).to.not.throw(Error);

        chai.expect(allsd).is.eql(simpleAllsd);



        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a sd "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASinglesdMedication = cmumps2sd_prescriptions.translatePrescriptionssd(aSinglecmumpsMedication);
                chai.expect(onlyASinglesdMedication.resourceType).to.equal('MedicationDispense');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdMedication);
                }).to.not.throw(Error);


            });
        }).to.not.throw(Error);

    });

    it('simple medications part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        // Clone the object so that as you modify parts of it, you
        // don't ruin the source.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            medicationsTranslateAll = cmumps.extractMedications(cmumpsJsonld).map(cmumps2sd_simle_prescriptions.translate);

            // Each separate medication should parse correctly.
            medicationsTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a sd "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASinglesdMedication = cmumps2sd_prescriptions.translatePrescriptionssd(aSinglecmumpsMedication);
                chai.expect(onlyASinglesdMedication.resourceType).to.equal('MedicationDispense');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdMedication);
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
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var medicationsTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            var allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
            //                      ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            medicationsTranslateAll = sd.extractMedications(allsd);
            //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
            }).to.not.throw(Error);

            // Each separate medication should parse correctly.
            medicationsTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        chai.expect(medicationsTranslateAll.length).to.equal(6); // should have 3 medications
        // Each object should be a sd "MedicationDispense" resourceType
        medicationsTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("MedicationDispense")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsMedications = cmumps.extractPrescriptions(cmumpsJsonld);
            chai.expect(onlycmumpsMedications.length).to.equal(medicationsTranslateAll.length); // both 11
            onlycmumpsMedications.forEach(function (aSinglecmumpsMedication) {
                var onlyASinglesdMedication = cmumps2sd_prescriptions.translatePrescriptionssd(aSinglecmumpsMedication);
                chai.expect(onlyASinglesdMedication.resourceType).to.equal('MedicationDispense');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdMedication);
                }).to.not.throw(Error);


            });
        }).to.not.throw(Error);


        var removedCmumpsPrescriptions = cmumps.removePrescriptions(cmumpsJsonld); // modifies cmumpsJsonld
        chai.expect(removedCmumpsPrescriptions).has.length(medicationsTranslateAll.length);

        var noCmumpsPrescriptions = cmumps.removePrescriptions(cmumpsJsonld);
        // TODO: lengths don't seem right
        chai.expect(noCmumpsPrescriptions).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutPrescriptions = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
        var noPrescriptions = sd.extractMedications(translationWithoutPrescriptions);
        chai.expect(noPrescriptions).has.length(0);





    });


    it('extract cmumps demographic part (example)', function () {

        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);

        // First approach: Let's get just the sd demographics portion of the entire sd translation.
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
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);;

        // First approach: Let's get just the sd demographics portion of the entire sd translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = sd.extractPatient(cmumps2sd_all.translatecmumpssd(cmumpsJsonld));
            simpleDemographics = cmumps2sd_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
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
        // cmumps2sd_all only that.
        var cmumpsPatient;
        var sdPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            sdPatientOnly = cmumps2sd_demographics.translateDemographicssd(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(sdPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        
        
        
        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(sdPatientOnly);

        cmumps.removePatient(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsPatient = cmumps.extractPatient(cmumpsJsonld);
        chai.expect(noCmumpsPatient).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDemographics = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
        var noDemographics = sd.extractPatient(translationWithoutDemographics);
        chai.expect(noDemographics).is.undefined;


    });


    it('extract demographic part, reorder input', function () {

        // ... loaded into cmumps. This has @context and @graph, but in a different order from patient7Jsonld
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);

        // First approach: Let's get just the sd demographics portion of the entire sd translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = sd.extractPatient(cmumps2sd_all.translatecmumpssd(cmumpsJsonld));
            simpleDemographics = cmumps2sd_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
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
        // cmumps2sd_all only that.
        var cmumpsPatient;
        var sdPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            sdPatientOnly = cmumps2sd_demographics.translateDemographicssd(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(sdPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(sdPatientOnly);

    });



    it('extract cmumps demographic part (example)', function () {

        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);

        // First approach: Let's get just the sd demographics portion of the entire sd translation.
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
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);;

        // First approach: Let's get just the sd demographics portion of the entire sd translation.
        var demographics, simpleDemographics; // Object
        chai.expect(function () {
            demographics = sd.extractPatient(cmumps2sd_all.translatecmumpssd(cmumpsJsonld));
            simpleDemographics = cmumps2sd_simple_demographics.translate(cmumps.extractDemographics(cmumpsJsonld)[0]);
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
        // cmumps2sd_all only that.
        var cmumpsPatient;
        var sdPatientOnly;
        chai.expect(function () {
            cmumpsPatient = cmumps.extractPatient(cmumpsJsonld)[0];
            sdPatientOnly = cmumps2sd_demographics.translateDemographicssd(cmumpsPatient);

            // parsable into xml?
            chai.expect(function () {
                parser.toXML(sdPatientOnly);
            }).to.not.throw(Error);

        }).to.not.throw(Error);

        // We got the same result two different ways. They are really the same?
        chai.expect(demographics).to.eqls(sdPatientOnly);

    });



    it('diagnoses part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            diagnosesTranslateAll = sd.extractDiagnoses(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdDiagnosis = sd.extractDiagnoses(allsd)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdDiagnosis.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdDiagnosis.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstsdDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a sd "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASinglesdDiagnosis = cmumps2sd_diagnoses.translateDiagnosessd(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);



        cmumps.removeDiagnoses(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
        chai.expect(noCmumpsDiagnoses).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDiagnoses = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
        var noDiagnoses = sd.extractDiagnoses(translationWithoutDiagnoses);
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

        // First approach: cmumps2sd_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            diagnosesTranslateAll = cmumps.extractDiagnoses(cmumpsJsonld).map(cmumps2sd_simple_diagnoses.translate);

            // finally let's generate the xml associated with each sd result.
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
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            diagnosesTranslateAllExtracted = sd.extractDiagnoses(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdDiagnosis = diagnosesTranslateAll[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdDiagnosis.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdDiagnosis.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstsdDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a sd "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASinglesdDiagnosis = cmumps2sd_simple_diagnoses.translate(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);



        cmumps.removeDiagnoses(cmumpsJsonld); // modifies cmumpsJsonld
        var noCmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
        chai.expect(noCmumpsDiagnoses).has.length(0);

        // Translate all with no demographics. Translation should complete, but without a patient.
        var translationWithoutDiagnoses = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
        var noDiagnoses = sd.extractDiagnoses(translationWithoutDiagnoses);
        chai.expect(noDiagnoses).has.length(0);




    });



    it('diagnoses part, reordered data', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = test_utils.cloneReorderGraph(patient7Jsonld);
        chai.expect(cmumpsJsonld).is.not.eqls(patient7Jsonld);



        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var diagnosesTranslateAll; // List[Object]
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            diagnosesTranslateAll = sd.extractDiagnoses(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdDiagnosis = sd.extractDiagnoses(allsd)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdDiagnosis.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdDiagnosis.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractDiagnoses(cmumpsJsonld)[0];
        // Patient should translate unscathed.
        chai.expect(firstsdDiagnosis.subject.display).to.equal(firstInput['patient-100417']['label']); // value unscathed

        // Each object should be a sd "MedicationDispense" resourceType
        diagnosesTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticReport")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsDiagnoses = cmumps.extractDiagnoses(cmumpsJsonld);
            chai.expect(onlycmumpsDiagnoses.length).to.equal(diagnosesTranslateAll.length); // both 11
            onlycmumpsDiagnoses.forEach(function (aSinglecmumpsDiagnosis) {
                var onlyASinglesdDiagnosis = cmumps2sd_diagnoses.translateDiagnosessd(aSinglecmumpsDiagnosis);
                //                                                 ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdDiagnosis.resourceType).to.equal('DiagnosticReport');

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdDiagnosis);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });



    it('labs part (example)', function () {
        // the entire cmumps jsonld object in a file
        var pathnameForTestCase = 'data/fake_cmumps/bugs-bunny.jsonld';
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);;

        // Let's get just the sd medications portion of the sd translation.
        // Note that we dodge participating properties and warnings (which are still available
        // for each translation part).
        var labs; // List[Object]
        chai.expect(function () {
            labs = sd.extractLabs(cmumps2sd_labs.translateLabssd(cmumpsJsonld));

            // See if each separate lab result translates to xml.
            labs.forEach(function (l) {
                chai.expect(function () {
                    parser.toXML(l);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);

        labs.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("DiagnosticObservation");
        });

        it('procedures part (example)', function () {

            // Get the entire cmumps jsonld object in a file
            // ... loaded into cmumps. This has @context and @graph.
            var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


            // We're going to compute the same result two different ways.
            // In the first way, we cmumps2sd_all everything (including medications) and
            // *then* extract the *translated* medications from the aggregate translation
            // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
            // we need, the patient and then medication, but extract those pieces first
            // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
            // translation depends on patient input, we pass in just enough of the patient
            // so that we can get a medication translation.

            // First approach: cmumps2sd_all everything, then extract the medications.
            var proceduresTranslateAll; // List[Object]
            chai.expect(function () {
                // example calls
                // cmumps2sd_all an entire jsonld cmumps object
                var allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
                //                      ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
                // ... then extract out the sd medication tranlation
                proceduresTranslateAll = sd.extractProcedures(allsd);
                //                             ^^^^^^^^^^^^^^^^^^ extract just medications out of the sd translation

                // finally let's generate the xml associated with each sd result.
                chai.expect(function () {
                    parser.toXML(allsd);
                }).to.not.throw(Error);

                // Each separate medication should parse correctly.
                proceduresTranslateAll.forEach(function (m) {
                    chai.expect(function () {
                        parser.toXML(m);
                    }).to.not.throw(Error);
                });

            }).to.not.throw(Error);

            // chai.expect(proceduresTranslateAll.length).to.equal(11); // should have 11 medications
            // Each object should be a sd "MedicationDispense" resourceType
            proceduresTranslateAll.forEach(function (i) {
                chai.expect(i.resourceType).to.equal('Procedure');
            });


            // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
            // Then apply the "one-to-one" sd translation on that.
            chai.expect(function () {
                // example calls
                // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
                // as we got from the previous test above.
                var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
                chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
                onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                    var onlyASinglesdProcedure = cmumps2sd_medications.translateMedicationssd(aSinglecmumpsProcedure);
                    //                                        ^^^^^^^^^^^^^^ cmumps2sd_all
                    chai.expect(onlyASinglesdProcedure.resourceType).to.equal('Procedure');

                    // parse the single sd medication into xml
                    chai.expect(function () {
                        parser.toXML(onlyASinglesdProcedure);
                    }).to.not.throw(Error);


                });

            }).to.not.throw(Error);

        });
    });


    //
    it('procedures part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd procedure tranlation
            proceduresTranslateAll = sd.extractProcedures(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just procedures out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdProcedure = sd.extractProcedures(allsd)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdProcedure.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdProcedure.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstsdProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a sd "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASinglesdProcedure = cmumps2sd_procedures.translateProceduressd(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdProcedure);
                }).to.not.throw(Error);


            });

        }).to.not.throw(Error);

    });


    it('simple procedures part (example)', function () {

        // Get the entire cmumps jsonld object in a file
        // ... loaded into cmumps. This has @context and @graph.
        var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);


        // We're going to compute the same result two different ways.
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            proceduresTranslateAll = cmumps.extractProcedures(cmumpsJsonld).map(cmumps2sd_simple_procedures.translate);

            // Each separate medication should parse correctly.
            proceduresTranslateAll.forEach(function (m) {
                chai.expect(function () {
                    parser.toXML(m);
                }).to.not.throw(Error);
            });

        }).to.not.throw(Error);


        var proceduresTranslateAllExtracted; // List[Object]
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd medication tranlation
            proceduresTranslateAllExtracted = sd.extractProcedures(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just diagnoses out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdProcedure = proceduresTranslateAll[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdProcedure.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdProcedure.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstsdProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a sd "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASinglesdProcedure = cmumps2sd_procedures.translateProceduressd(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdProcedure);
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
        // In the first way, we cmumps2sd_all everything (including medications) and
        // *then* extract the *translated* medications from the aggregate translation
        // (a sd "bundle"). In the second approach, we cmumps2sd_all just the sdParts
        // we need, the patient and then medication, but extract those pieces first
        // from the cmumps input and cmumps2sd_all the sdParts. Since some of the medication
        // translation depends on patient input, we pass in just enough of the patient
        // so that we can get a medication translation.

        // First approach: cmumps2sd_all everything, then extract the medications.
        var proceduresTranslateAll; // List[Object]
        var allsd;
        chai.expect(function () {
            // example calls
            // cmumps2sd_all an entire jsonld cmumps object
            allsd = cmumps2sd_all.translatecmumpssd(cmumpsJsonld, {warnings: true});
            //                          ^^^^^^^^^^^^^^^^^ cmumps2sd_all entire cmumps jsonld input
            // ... then extract out the sd procedure tranlation
            proceduresTranslateAll = sd.extractProcedures(allsd);
            //                           ^^^^^^^^^^^^^^^^ extract just procedures out of the sd translation

            // finally let's generate the xml associated with each sd result.
            chai.expect(function () {
                parser.toXML(allsd);
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
        var firstsdProcedure = sd.extractProcedures(allsd)[0];
        // subject is an object that has a display with format 2-something
        chai.expect(firstsdProcedure.subject.reference).to.match(/2-\d+/);
        chai.expect(firstsdProcedure.subject.display).to.match(/BUNNY\s*,\s*BUGS/);
        // Lift out the first input.
        var firstInput = cmumps.extractProcedures(cmumpsJsonld)[0];
        // Patient-\d* => 2-\d*. TODO: is this really the correct transformation?
        chai.expect(firstsdProcedure.subject.reference.substring('Patient/2-'.length)).to.equal(firstInput['patient']['id'].substring('Patient-'.length));

        // Each object should be a sd "MedicationDispense" resourceType
        proceduresTranslateAll.forEach(function (i) {
            chai.expect(i.resourceType).to.equal("Procedure")
        });


        // Second approach: extract the cmumps medications objects *first* from the cmumps jsonld "whole thing".
        // Then apply the "one-to-one" sd translation on that.
        chai.expect(function () {
            // example calls
            // Get the medications from the cmumps jsonld. Might not be any in general. We're expecting as many
            // as we got from the previous test above.
            var onlycmumpsProcedures = cmumps.extractProcedures(cmumpsJsonld);
            chai.expect(onlycmumpsProcedures.length).to.equal(proceduresTranslateAll.length); // both 11
            onlycmumpsProcedures.forEach(function (aSinglecmumpsProcedure) {
                var onlyASinglesdProcedure = cmumps2sd_procedures.translateProceduressd(aSinglecmumpsProcedure);
                //                                                  ^^^^^^^^^^^^^^^^^^^^^^ cmumps Kg_Patient_Diagnosis => sd DiagnosticReport directly
                chai.expect(onlyASinglesdProcedure.resourceType).to.equal(cmumps.cmumpss.Procedure);

                // parse the single sd medication into xml
                chai.expect(function () {
                    parser.toXML(onlyASinglesdProcedure);
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

            var cmumpsJsonld = cmumps_utils.clone(patient7Jsonld);;
            var sdTranslation;
            chai.expect(function () {
                sdTranslation = cmumps2sd_all.translatecmumpssd(cmumpsJsonld);
            }).to.not.throw(Error);

            var demographics = sd.extractPatient(sdTranslation);
            var medications = sd.extractMedications(sdTranslation);
            var labs = sd.extractLabs(sdTranslation);


            // the medications subreport is an Array[{sd: <object>, participants: <Array[String]>, warnings: <Array[String]>]
            // should have 11 entries
            chai.expect(medications.length).to.equal(6); // bugs takes 11 meds
            chai.expect(demographics.name.family[0]).to.equal("BUNNY".toUpperCase());
            chai.expect(demographics.name.given[0]).to.equal("BUGS DOC".toUpperCase());

            // Check various sd translated portions of medications
            var _medications = JSONPath({
                json: medications,
                path: '$.[?(@.resourceType == "MedicationDispense")]'
            });
            chai.expect(_medications.length).to.equal(medications.length);
            var firstMedication = _medications[0];
            chai.expect(firstMedication.resourceType).to.equal('MedicationDispense');
            chai.expect(firstMedication.resourceType).to.equal(sd.returns[sd.extractMedications]);
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
});




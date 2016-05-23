/**
 * Translate cmumps Prescription objects to fhir MedicationDispense resources.
 */

var cmumps = require('./cmumps');
// Abbreviations to shorten functions
var pattern = cmumps.cmumpssJsonPattern;
var cmumpss = cmumps.cmumpss;
var fhir = require('./fhir');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require('./cmumps2fhir_datatypes');
// https://www.npmjs.com/package/node-html-encoder
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');
var cmumps2fhir_simple_prescriptions = require('./cmumps2fhir_simple_prescriptions');




/**
 * Translate a cmumpsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {http://hl7-fhir.github.io/medicationdispense.html}
 *
 *  Implementation notes:
 *
 *  - db.schema.find_one({fmDD:'fmdd:52'}) will find the mongodb document that enumerates the cmumps fields available.
 *  - db['52'].find({}) will find instances of Prescription-52.
 */

function translatePrescriptionsFhir(cmumpsPrescriptionObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsPrescriptionObject. The fetcher will get data values from
    // input cmumpsPrescriptionObject, remembering those that actually have values in list participatingProperties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPrescriptionObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."

    var fhirMedication = cmumps2fhir_simple_prescriptions.translate(cmumpsPrescriptionObject);

    if (options.participants) fhir.addParticipants(fhirMedication, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirMedication, warnings);

    // The FHIR spec indicates that well-formed MedicationDispenses are required to have one of these two values.
    // Generally the medicationReference will be the key that's populated.
    if (!_.has(fhirMedication, 'medicationReference') && !_.has(fhirMedication, 'medicationCodeableConcept')) {
        throw new Error(format("FHIR medication '{id}' contains neither a medicationReference nor a medicationCodeableConcept.", {id: fhirMedication.value}));
    }
    return fhirMedication;
}

// short form
var translate = translatePrescriptionsFhir;

[translatePrescriptionsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });


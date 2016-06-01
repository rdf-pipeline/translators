/**
 * Translate cmumps Prescription objects to sd MedicationDispense resources.
 */

'use strict';
var prefix = '../translate/';
var cmumps = require(prefix + 'cmumps');
// Abbreviations to shorten functions
var pattern = cmumps.cmumpssJsonPattern;
var cmumpss = cmumps.cmumpss;
var sd = require('./sd');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require('./cmumps2sd_datatypes');
// https://www.npmjs.com/package/node-html-encoder
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');
var cmumps2sd_simple_prescriptions = require('./cmumps2sd_simple_prescriptions');




/**
 * Translate a cmumpsPrescriptionObject into a sd_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @returns {object} -- sd translation, a MedicationDispense resource
 * @see {http://hl7-sd.github.io/medicationdispense.html}
 *
 *  Implementation notes:
 *
 *  - db.schema.find_one({fmDD:'fmdd:52'}) will find the mongodb document that enumerates the cmumps fields available.
 *  - db['52'].find({}) will find instances of Prescription-52.
 */

function translatePrescriptionssd(cmumpsPrescriptionObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsPrescriptionObject. The fetcher will get data values from
    // input cmumpsPrescriptionObject, remembering those that actually have values in list participatingProperties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPrescriptionObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-sd.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-sd.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."

    var sdMedication = cmumps2sd_simple_prescriptions.translate(cmumpsPrescriptionObject);

    if (options.participants) sd.addParticipants(sdMedication, participatingProperties);
    if (options.warnings) sd.addWarnings(sdMedication, warnings);

    // The sd spec indicates that well-formed MedicationDispenses are required to have one of these two values.
    // Generally the medicationReference will be the key that's populated.
    if (!_.has(sdMedication, 'medicationReference') && !_.has(sdMedication, 'medicationCodeableConcept')) {
        throw new Error(format("sd medication '{id}' contains neither a medicationReference nor a medicationCodeableConcept.", {id: sdMedication.value}));
    }
    return sdMedication;
}

// short form
var translate = translatePrescriptionssd;

[translatePrescriptionssd, translate].forEach(function(f) { module.exports[f.name] = f; });


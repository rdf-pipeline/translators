/**
 * Translate a cmumps Patient objects to sd Patient object.
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
var cmumps2sd_simple_demographics = require('./cmumps2sd_simple_demographics');





/**
 * Translate a cmumpsPatientObject into a sd_Patient resource using JSONPath.
 * @param {object} cmumpsPatientObject
 * @returns {object} -- sd Patient resource object
 * @see {http://hl7-sd.github.io/patient.html}
 */

function translateDemographicssd(cmumpsPatientObject, options) {
    var options = options || { participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
    // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // Translate each key/value pair at once. See the "shape" of the result.
    // var resourceType = 'Patient';
    var sdPatient = cmumps2sd_simple_demographics.translate(cmumpsPatientObject, fetch1);

    if (options.participants) sd.addParticipants(sdPatient, participatingProperties);
    if (options.warnings) sd.addWarnings(sdPatient, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(sdPatient);
    // Add additional semantic processing here.

    return sdPatient;
}


// short form
var translate = translateDemographicssd;

// Export the actual functions here. Make sure the names are always consistent.
[translateDemographicssd, translate].forEach(function(f) { module.exports[f.name] = f; });

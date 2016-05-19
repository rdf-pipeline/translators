/**
 * Translate a cmumps Patient objects to fhir Patient object.
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
var cmumps2fhir_simple_demographics = require('./cmumps2fhir_simple_demographics');





/**
 * Translate a cmumpsPatientObject into a fhir_Patient resource using JSONPath.
 * @param {object} cmumpsPatientObject
 * @returns {object} -- fhir Patient resource object
 * @see {http://hl7-fhir.github.io/patient.html}
 */

function translateDemographicsFhir(cmumpsPatientObject, options) {
    var options = options || { participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
    // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // Translate each key/value pair at once. See the "shape" of the result.
    // var resourceType = 'Patient';
    var fhirPatient = cmumps2fhir_simple_demographics.translate(cmumpsPatientObject, fetch1);

    if (options.participants) fhir.addParticipants(fhirPatient, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirPatient, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirPatient);
    // Add additional semantic processing here.

    return fhirPatient;
}


// short form
var translate = translateDemographicsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translateDemographicsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

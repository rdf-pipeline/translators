/**
 * Translate cmumps Kg_Patient_Diagnosis object to fhir DiagnosticReport resource.
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
var cmumps2fhir_simple_diagnoses = require('./cmumps2fhir_simple_diagnoses');


/**
 * Translate cmumps Kg_Patient_Diagnosis object to fhir DiagnosticReport resource. Optionally you can track which
 * input fields participated in the translation and an warnings along the way (you must turn those options on explicitly).
 * @param {object} cmumpsPatientDiagnosisObject -- input for the translation
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {{resourceType: 'DiagnosticReport', ... }}
 * @see {http://hl7-fhir.github.io/diagnosticreport.html}
 */
function translateDiagnosesFhir(cmumpsPatientDiagnosisObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsPatientDiagnosisObject. The fetcher will get data values from
    // input cmumpsPatientDiagnosisObject, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientDiagnosisObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/diagnosticreport.html:
    // "The diagnostic service returns a "report" which may contain a "narrative" - a written summary of the outcomes, and/or "results" -
    // the individual pieces of atomic data which each are "observations". The results are assembled in "groups" which are nested structures of
    // Observations (traditionally referred to as "panels" or " batteries" by laboratories) that can be used to represent relationships
    // between the individual data items."

    // TODO mike@carif.io: Will I need to group all the cmumps KG_Patient_Diagnosis-100417 objects into a single fhir DiagnosisReport with
    // a list of fhir Observations?

    
    var fhirDiagnoses = cmumps2fhir_simple_diagnoses.translate(cmumpsPatientDiagnosisObject);
    
    if (options.participants) fhir.addParticipants(fhirDiagnoses, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirDiagnoses, warnings);
    fdt.clean(fhirDiagnoses);
    // Additional semantic processing here
    return fhirDiagnoses;
}

// short form
var translate = translateDiagnosesFhir;

[translateDiagnosesFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

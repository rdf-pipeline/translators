/**
 * Translate entire cmumps Procedure object at fhir Procedure resource.
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
var cmumps2fhir_simple_procedures = require('./cmumps2fhir_simple_procedures');
var cmumps_utils = require('./util/cmumps_utils');



/**
 * Translate a cmumpsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {http://hl7-fhir.github.io/medicationdispense.html}
 */
function translateProceduresFhir(cmumpsProcedureObject, options) {
    var options = cmumps_utils.merge(options, {participants: false, warnings: false, policy: false});
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsProcedureObject. The fetcher will get data values from
    // input cmumpsProcedureObject, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsProcedureObject, participatingProperties); // returns function fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var fhirProcedure = cmumps2fhir_simple_procedures.translate(cmumpsProcedureObject);

    if (options.participants) fhir.addParticipants(fhirProcedure, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirProcedure, warnings);
    fdt.clean(fhirProcedure);
    // Additional semantic processing here
    return fhirProcedure;
}

// short form
translateProceduresFhir.resourceType = cmumps2fhir_simple_procedures.translate.resourceType;
var translate = translateProceduresFhir;

[translateProceduresFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

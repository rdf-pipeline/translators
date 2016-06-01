/**
 * Translate entire cmumps Procedure object at sd Procedure resource.
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
var cmumps2sd_simple_procedures = require('./cmumps2sd_simple_procedures');
var cmumps_utils = require('./util/cmumps_utils');



/**
 * Translate a cmumpsPrescriptionObject into a sd_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {object} -- sd translation, a MedicationDispense resource
 * @see {http://hl7-sd.github.io/medicationdispense.html}
 */
function translateProceduressd(cmumpsProcedureObject, options) {
    var options = cmumps_utils.merge(options, {participants: false, warnings: false, policy: false});
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsProcedureObject. The fetcher will get data values from
    // input cmumpsProcedureObject, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsProcedureObject, participatingProperties); // returns function fetch1(json_pattern[, transformation])

    // http://hl7-sd.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var sdProcedure = cmumps2sd_simple_procedures.translate(cmumpsProcedureObject);

    if (options.participants) sd.addParticipants(sdProcedure, participatingProperties);
    if (options.warnings) sd.addWarnings(sdProcedure, warnings);
    fdt.clean(sdProcedure);
    // Additional semantic processing here
    return sdProcedure;
}

// short form
var translate = translateProceduressd;

[translateProceduressd, translate].forEach(function(f) { module.exports[f.name] = f; });

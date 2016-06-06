/**
 * Translate a synthesized Diagnosis into a cmumps Diagnosis.
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
var cmumps2sd_simple_diagnoses = require('./cmumps2sd_simple_diagnoses');


function translate(sdPatientDiagnosisObject, options) {
    var options = utils.merge(options, {participants: false, warnings: false});
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientDiagnosisObject, participatingProperties);
    var cmumpsDiagnoses = sd2cmumps_simple_diagnoses.translate(cmumpsPatientDiagnosisObject);
    
    if (options.participants) sd.addParticipants(cmumpsDiagnoses, participatingProperties);
    if (options.warnings) sd.addWarnings(cmumpsDiagnoses, warnings);
    fdt.clean(cmumpsDiagnoses);
    // Additional semantic processing here
    return cmumpsDiagnoses;
}

[translate].forEach(function(f) { module.exports[f.name] = f; });

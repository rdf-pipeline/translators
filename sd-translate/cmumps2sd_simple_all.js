/**
 * Translate an entire cmumps object to a sd bundle.
 */

'use strict';
var prefix = '../translate/';
var cmumps = require(prefix + 'cmumps');// Abbreviations to shorten functions
var pattern = cmumps.cmumpssJsonPattern;
var cmumpss = cmumps.cmumpss;
var sd = require('./sd');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require('./cmumps2sd_datatypes');

// for each piece
var demographics = require('./cmumps2sd_simple_demographics');
var prescriptions = require('./cmumps2sd_simple_prescriptions');
// var labs = require('./cmumps2sd_labs');
var diagnoses = require('./cmumps2sd_simple_diagnoses');
var procedures = require('./cmumps2sd_simple_procedures');
var cmumps_utils = require('./util/cmumps_utils');




/**
 * Given a cmumps jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} cmumpsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the sd translation and a bundle containing a "composition".
 */


function translate(cmumpsJsonldObject, date, token) {
    var token = token || 'cmumpss'
    // If the caller is confused an passes an array of cmumpsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(cmumpsJsonldObject)) {
        // return translateHelper(cmumpsJsonldObject[0]);
        return cmumpsJsonldObject.map(function(i) {return translateHelper(i, date, token); })
    } else {
        // A single object, translate it.
        return translateHelper(cmumpsJsonldObject, date, token);
    }
}


/**
 * translateHelper is the real function, it expects a *single* cmumps object.
 * and returns the translation.
 * @param {object} cmumpsJsonldObject -- the input
 * @param {participants: boolean, warnings: boolean} options
 * @param {string} date -- use this date instead of now(). Useful to diff output.
 * @returns {{resourceType: string, type: string, entry: *[]}}
 */
function translateHelper(cmumpsJsonldObject, date, token) {

    return fdt.clean({
        resourceType: 'Bundle', // The cmumps translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date || sd.now(), // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: fdt.sdCodeableConcept('cmumps'), // ... originating with cmumps ...
            resource: Array.prototype.concat(
                [ demographics.translate(JSONPath(pattern(cmumpss.Patient, token), cmumpsJsonldObject)[0]) ],
                JSONPath(pattern(cmumpss.Prescription, token), cmumpsJsonldObject).map(prescriptions.translate),
                JSONPath(pattern(cmumpss.Kg_Patient_Diagnosis, token), cmumpsJsonldObject).map(diagnoses.translate),
                JSONPath(cmumps.jsonPattern(cmumpss.Procedure), cmumpsJsonldObject).map(procedures.translate)
            )
        }]
    });
}


// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

/**
 * Manipulate the cmumps jsonld object in understandable ways
 */

var format = require('string-format');
var jsonpath = require('jsonpath');
var _ = require('underscore');

var Demographics = require('./cmumps2fhir_demographics');
var Diagnoses = require('./cmumps2fhir_diagnoses');
var Labs = require('./cmumps2fhir_labs');
var Prescriptions = require('./cmumps2fhir_prescriptions');
var Procedures = require('./cmumps2fhir_procedures');

/**
 * A set of predicates to recognize types of cmumps objects
 */

/**
 * Returns true iff object 'candidate' is a cmumps type matched by 'regular_expression' without regard to whitespace.
 * @param {object} candidate - has candidate.type object attribute
 * @param {string} cmumpsTypeName - how to match the 'type' tag, type is wrapped as regex 'cmumpss:{{cmumpsTypeName}' effectively.
 * @returns {boolean} - true iff regular expression matches candidate.type
 *
 * Note: this function is private. All the other predicates eventually call it.
 */


var cmumpsPrefixPattern = 'c(hc|mump)ss';

function isCmumpsType(candidate, cmumpsTypeName, token) {
    var token = token || cmumpsPrefixPattern;
    return typeof candidate == 'object'
        && candidate['type']
        && candidate['type'].match(format(token + '\s*:\s*{}\s*', cmumpsTypeName));
}


// Sequence of iscmumps{{cmumpsType}}(candidate) => boolean. These predicates tell you that you have a cmumps object of a
// certain type. They all work by looking for a type tag and matching a regular expression.

/**
 * Exported type predicate, returns true iff candidate is a cmumps Patient.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Patient
 */
function isCmumpsPatient(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Patient, token);
}

/**
 * Exported type predicate, returns true iff candidate is a cmumps Prescription.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Prescription
 */
function isCmumpsPrescription(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Prescription);
}

/**
 * Exported type predicate, returns true iff candidate is a cmumps Lab_Result.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Lab_Result
 */
function isCmumpsLabResult(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Lab_Result);
}

/**
 * Exported type predicate, returns true iff candidate is a cmumps Patient_Diagnosis.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Procedure
 */
function isCmumpsDiagnosis(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Kg_Patient_Diagnosis);
}

/**
 * Exported type predicate, returns true iff candidate is a cmumps Procedure.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Procedure
 */
function isCmumpsProcedure(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Procedure);
}

/**
 * Convert a cmumpss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching.
 *
 * The expression syntax is a little magical right now. I had to experiment my way into the expression below.
 *
 * @param {string} i  - use cmumps.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
function cmumpssJsonPattern(i, token) {
    var token = token || cmumpsPrefixPattern;
    return format("$['@graph'][?((@.type).match(/^\\s*{}:{}\\s*/))]", token, i);
    //return format("$['@graph'][?((@.type).match(/^\\s*cmumpss\\s*:\\s*{}\\s*/))]", i);
}

/**
 * Convert a cmumpss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching.
 *
 * The expression syntax is a little magical right now. I had to experiment my way into the expression below.
 *
 * @param {string} i  - use cmumps.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
// function cmumpssSimpleJsonPattern(i, token) {
//     var token = token || cmumpsPrefixPattern;
//     // return format("$['@graph'][?((@.type).match(/^\s*cmumpss\s*:\s*{}\s*/))]", i);
//     return format("$['@graph'][?(@.type=='{}:{}')]", token, i);
// }


/**
 * Convert a cmumpss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching. Note that the regex pattern string is a little different.
 * Non-cmumps mongo documents do return with a type field, but do *not* have the cmumpss: prefix on their
 * value.
 *
 * @param {string} i  - use cmumps.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
function jsonPattern(i) {
    return format("$['@graph'][?((@.type).match(/^\s*{}\s*/))]", i);
}

// cmumps microparsers. A microparser takes a cmumps data value, usually as a string, and reformulates into an
// analog value while preserving the semantics. For example, the cmumps date format is a little different from
// the fhir one. Sometimes the translation is direct. Other times, I "lift" the value into a small, self-contained
// object and then serialize that object downstream.

/**
 * cmumps property value microparsers.
 */

/**
 * cmumps string for date, 'yy{yy}?-mm-dd' => {'year': yyyy, 'month': mm, 'day': dd }
 * @param {string} acmumpsDate
 * @returns {year: string, day: string, month: string}
 */
function cmumpsDate(acmumpsDate) {
    var m = acmumpsDate.match(/((\d{2})(\d{2})?)-(\d{2})-(\d{2})/);
    if (m) {
        var year = m[1]; // year group in re, only 2 or 4 digits
        if (year.length == 2) year = '19' + year; // fix up yy
        var month = m[4]; // month group in re
        var day = m[5]; // day group in re

        return { 'year': year, 'day': day, 'month': month };
    }
    throw new Error("Bad cmumps date: '" + acmumpsDate + "'"); // assume stacktrace
}

/**
 * Translate a cmumps name format 'LAST, FIRST MI TITLE' to fhir HumanName
 * @param acmumpsPersonName
 * @returns {{resourceType: string, use: string}}
 * @see {http://hl7-fhir.github.io/datatypes.html#HumanName}
 */
function cmumpsPatientName(acmumpsPersonName) {

    var parts = acmumpsPersonName.split(/\s*,\s*/); // last, first mi title; split off the last name

    // Name should have had a comma in it, so there should be two fhirParts and the second part should have contents.
    if (parts.length == 1 || parts[1].length == 0) {
        throw new Error("Bad cmumps name, no first name in '" + acmumpsPersonName + "'");
    }
    if (parts[0].length == 0) {
        throw new Error("Bad cmumps name, no last name in '" + acmumpsPersonName + "'");
    }


    var afterComma = parts[1].split(/\s+/); // the second part should ahve first mi? title?

    var lastFirstMiTitle = {
        'last': parts[0].trim(),
        'first': afterComma[0],

    };

    if (afterComma.length > 1) {// middle initial mi
        lastFirstMiTitle.mi = afterComma[1];
    }

    if (afterComma.length > 2) { // title
        lastFirstMiTitle.title = afterComma[2];
    }

    return lastFirstMiTitle;
}



// Export the actual functions here.
[isCmumpsPatient,
    cmumpssJsonPattern,
    // cmumpssSimpleJsonPattern,
    jsonPattern,
    cmumpsDate,
    cmumpsPatientName
].forEach(function(f) { module.exports[f.name] = f; });

module.exports.cmumpss = {};
// Their whole names in LDR. Drop the integer suffixes.
['Patient-2', 'Prescription-52', 'Lab_Result-63', 'Kg_Patient_Diagnosis-100417', 'Procedure'].forEach(function(cmumpss) {
    var name = cmumpss.split('-')[0];
    module.exports.cmumpss[name] = cmumpss;
});


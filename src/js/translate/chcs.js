/**
 * Manipulate the chcs jsonld object in understandable ways
 */

var format = require('string-format');
var jsonpath = require('jsonpath');
var _ = require('underscore');

var Demographics = require('./chcs2fhir_demographics');
var Diagnoses = require('./chcs2fhir_diagnoses');
var Labs = require('./chcs2fhir_labs');
var Prescriptions = require('./chcs2fhir_prescriptions');
var Procedures = require('./chcs2fhir_procedures');

/**
 * A set of predicates to recognize types of chcs objects
 */

/**
 * Returns true iff object 'candidate' is a chcs type matched by 'regular_expression' without regard to whitespace.
 * @param {object} candidate - has candidate.type object attribute
 * @param {string} chcsTypeName - how to match the 'type' tag, type is wrapped as regex 'chcss:{{chcsTypeName}' effectively.
 * @returns {boolean} - true iff regular expression matches candidate.type
 *
 * Note: this function is private. All the other predicates eventually call it.
 */


var chcsPrefixPattern = 'c(hc|mump)ss';

function isChcsType(candidate, chcsTypeName, token) {
    var token = token || chcsPrefixPattern;
    return typeof candidate == 'object'
        && candidate['type']
        && candidate['type'].match(format(token + '\s*:\s*{}\s*', chcsTypeName));
}


// Sequence of ischcs{{chcsType}}(candidate) => boolean. These predicates tell you that you have a chcs object of a
// certain type. They all work by looking for a type tag and matching a regular expression.

/**
 * Exported type predicate, returns true iff candidate is a chcs Patient.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a chcs Patient
 */
function isChcsPatient(candidate, token) {
    var token = token || chcsPrefixPattern;
    return isChcsType(candidate, module.exports.chcss.Patient, token);
}

/**
 * Exported type predicate, returns true iff candidate is a chcs Prescription.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a chcs Prescription
 */
function isChcsPrescription(candidate, token) {
    var token = token || chcsPrefixPattern;
    return isChcsType(candidate, module.exports.chcss.Prescription);
}

/**
 * Exported type predicate, returns true iff candidate is a chcs Lab_Result.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a chcs Lab_Result
 */
function isChcsLabResult(candidate, token) {
    var token = token || chcsPrefixPattern;
    return isChcsType(candidate, module.exports.chcss.Lab_Result);
}

/**
 * Exported type predicate, returns true iff candidate is a chcs Patient_Diagnosis.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a chcs Procedure
 */
function isChcsDiagnosis(candidate, token) {
    var token = token || chcsPrefixPattern;
    return isChcsType(candidate, module.exports.chcss.Kg_Patient_Diagnosis);
}

/**
 * Exported type predicate, returns true iff candidate is a chcs Procedure.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a chcs Procedure
 */
function isChcsProcedure(candidate, token) {
    var token = token || chcsPrefixPattern;
    return isChcsType(candidate, module.exports.chcss.Procedure);
}

/**
 * Convert a chcss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching.
 *
 * The expression syntax is a little magical right now. I had to experiment my way into the expression below.
 *
 * @param {string} i  - use chcs.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
function chcssJsonPattern(i, token) {
    var token = token || chcsPrefixPattern;
    return format("$['@graph'][?((@.type).match(/^\\s*{}:{}\\s*/))]", token, i);
    //return format("$['@graph'][?((@.type).match(/^\\s*chcss\\s*:\\s*{}\\s*/))]", i);
}

/**
 * Convert a chcss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching.
 *
 * The expression syntax is a little magical right now. I had to experiment my way into the expression below.
 *
 * @param {string} i  - use chcs.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
// function chcssSimpleJsonPattern(i, token) {
//     var token = token || chcsPrefixPattern;
//     // return format("$['@graph'][?((@.type).match(/^\s*chcss\s*:\s*{}\s*/))]", i);
//     return format("$['@graph'][?(@.type=='{}:{}')]", token, i);
// }


/**
 * Convert a chcss type into a JSONPath selector. Used to select the right object out of @graph
 * without a lot of recursive searching. Note that the regex pattern string is a little different.
 * Non-chcs mongo documents do return with a type field, but do *not* have the chcss: prefix on their
 * value.
 *
 * @param {string} i  - use chcs.module.exports.chccs.* values
 * @return {string} - a JSONPath selector
 */
function jsonPattern(i) {
    return format("$['@graph'][?((@.type).match(/^\s*{}\s*/))]", i);
}

// chcs microparsers. A microparser takes a chcs data value, usually as a string, and reformulates into an
// analog value while preserving the semantics. For example, the chcs date format is a little different from
// the fhir one. Sometimes the translation is direct. Other times, I "lift" the value into a small, self-contained
// object and then serialize that object downstream.

/**
 * chcs property value microparsers.
 */

/**
 * chcs string for date, 'yy{yy}?-mm-dd' => {'year': yyyy, 'month': mm, 'day': dd }
 * @param {string} achcsDate
 * @returns {year: string, day: string, month: string}
 */
function chcsDate(achcsDate) {
    var m = achcsDate.match(/((\d{2})(\d{2})?)-(\d{2})-(\d{2})/);
    if (m) {
        var year = m[1]; // year group in re, only 2 or 4 digits
        if (year.length == 2) year = '19' + year; // fix up yy
        var month = m[4]; // month group in re
        var day = m[5]; // day group in re

        return { 'year': year, 'day': day, 'month': month };
    }
    throw new Error("Bad chcs date: '" + achcsDate + "'"); // assume stacktrace
}

/**
 * Translate a chcs name format 'LAST, FIRST MI TITLE' to fhir HumanName
 * @param achcsPersonName
 * @returns {{resourceType: string, use: string}}
 * @see {http://hl7-fhir.github.io/datatypes.html#HumanName}
 */
function chcsPatientName(achcsPersonName) {

    var parts = achcsPersonName.split(/\s*,\s*/); // last, first mi title; split off the last name

    // Name should have had a comma in it, so there should be two fhirParts and the second part should have contents.
    if (parts.length == 1 || parts[1].length == 0) {
        throw new Error("Bad chcs name, no first name in '" + achcsPersonName + "'");
    }
    if (parts[0].length == 0) {
        throw new Error("Bad chcs name, no last name in '" + achcsPersonName + "'");
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
[isChcsPatient,
    chcssJsonPattern,
    // chcssSimpleJsonPattern,
    jsonPattern,
    chcsDate,
    chcsPatientName
].forEach(function(f) { module.exports[f.name] = f; });

module.exports.chcss = {};
// Their whole names in LDR. Drop the integer suffixes.
['Patient-2', 'Prescription-52', 'Lab_Result-63', 'Kg_Patient_Diagnosis-100417', 'Procedure'].forEach(function(chcss) {
    var name = chcss.split('-')[0];
    module.exports.chcss[name] = chcss;
});


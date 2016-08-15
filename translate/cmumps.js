/**
 * Manipulate the cmumps jsonld object in understandable ways
 */

var format = require('string-format');
var JSONPath = require('jsonpath-plus');
var _ = require('underscore');

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

/* istanbul ignore next */
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
/* istanbul ignore next */
function isCmumpsPatient(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Patient, token);
}

/**
 * Exported type predicate, returns true iff candidate is a cmumps Prescription.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Prescription
 */
/* istanbul ignore next */
function isCmumpsPrescription(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Prescription);
}


/**
 * Exported type predicate, returns true iff candidate is a cmumps Lab_Result.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Lab_Result
 */
/* istanbul ignore next */
function isCmumpsLabResult(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Lab_Result);
}


/**
 * Exported type predicate, returns true iff candidate is a cmumps Patient_Diagnosis.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Procedure
 */
/* istanbul ignore next */
function isCmumpsDiagnosis(candidate, token) {
    var token = token || cmumpsPrefixPattern;
    return isCmumpsType(candidate, module.exports.cmumpss.Kg_Patient_Diagnosis);
}


/**
 * Exported type predicate, returns true iff candidate is a cmumps Procedure.
 * @param {object} candidate - input
 * @returns {boolean} - true iff candidate is a cmumps Procedure
 */
/* istanbul ignore next */
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


// An "extractor" takes an entire cmumps input object and extracts out the relevant types of
// (sub) object from the @graph array using JSONPath. Abstracts away some of the details of
// the type names, etc. They take the entire cmumps object as input and return an array of objects
// of that type, *including* extractPatient. It is assumed the LDR endpoint returns an 'all' document
// for a *single* patient. I don't enforce that constraint.

/**
 * Extract the single patient from the cmumpsJsonldObject using JSONPath.
 * @param cmumpsJsonldObject
 * @returns {*}
 */

function extractPatient(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern ;
    return JSONPath({json: cmumpsJsonldObject, path: cmumpssJsonPattern(module.exports.cmumpss.Patient, token)});
}

function extractDemographics(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    return extractPatient(cmumpsJsonldObject, token);
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 * 
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
  */
function removePatient(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    var result = [];
    var paths = JSONPath({json: cmumpsJsonldObject,
        path: cmumpssJsonPattern(module.exports.cmumpss.Patient, token),
        resultType: 'path'});
    // istanbul ignore else
    if (_.isArray(paths)) {
        paths.forEach(function (path) {
            var theMatch = path.match(/^\$\['@graph'\]\[(\d+)\]/);
            // istanbul ignore else
            if (theMatch) {
                var index = theMatch[1] - result.length;
                result.push(cmumpsJsonldObject['@graph'][index]);
                cmumpsJsonldObject['@graph'].splice(index, 1);
            }
        });
    }
    return result;
}

// istanbul ignore next
function removeDemographics(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    removePatient(cmumpsJsonldObject, token);
}



/**
 * Extract the Prescriptions from the cmumpsJsonldObject.
 * @param cmumpsJsonldObject
 * @returns {Array[object]} -- the medications
 */

function extractPrescriptions(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    return JSONPath({json: cmumpsJsonldObject, path: cmumpssJsonPattern(module.exports.cmumpss.Prescription, token)});
}

function extractMedications(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    return extractPrescriptions(cmumpsJsonldObject);
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */

function removePrescriptions(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    var result = [];
    var paths = JSONPath({json: cmumpsJsonldObject,
        path: cmumpssJsonPattern(module.exports.cmumpss.Prescription, token),
        resultType: 'path'});
    paths.forEach(function(path) {
        var theMatch = path.match(/^\$\['@graph'\]\[(\d+)\]/);
        // istanbul ignore else
        if (theMatch) {
            var index = theMatch[1] - result.length;
            result.push(cmumpsJsonldObject['@graph'][index]);
            cmumpsJsonldObject['@graph'].splice(index, 1);
        }
    });
    return result;
}


// istanbul ignore next
function removeMedications(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    return removePrescriptions(cmumpsJsonldObject);
}

/**
 * Extract the labs from a cmumpsJsonldObject.
 * @param cmumpsJsonldObject
 * @returns {Array[object]} -- the labs
 */
function extractLabs(cmumpsJsonldObject, token) {
    // return JSONPath({json: cmumpsJsonldObject, path: cmumpssJsonPattern(module.exports.cmumpss.Lab_Result)});
    var token = token || cmumpsPrefixPattern;
    return JSONPath({json: cmumpsJsonldObject, path: cmumpssJsonPattern(module.exports.cmumpss.Lab_Result, token)});
}


/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove all lab records from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */
// istanbul ignore next
function removeLabs(cmumpsJsonldObject) {
    var token = token || cmumpsPrefixPattern;
    var result = [];
    var paths = JSONPath({json: cmumpsJsonldObject,
        path: cmumpssJsonPattern(module.exports.cmumpss.Lab_Result, token),
        resultType: 'path'});
    paths.forEach(function(path) {
        var theMatch = path.match(/^\$\['@graph'\]\[(\d+)\]/);
        // istanbul ignore else
        if (theMatch) {
            var index = theMatch[1] - result.length;
            result.push(cmumpsJsonldObject['@graph'][index]);
            cmumpsJsonldObject['@graph'].splice(index, 1);
        }
    });
    return result;
}

/**
 * Extract the diagnoses from a cmumpsJsonldObject
 * @param cmumpsJsonldObject
 * @returns {Array[object]} -- the diagnoses
 */
function extractDiagnoses(cmumpsJsonldObject, token) {
    var token = token || cmumpsPrefixPattern;
    return JSONPath({json: cmumpsJsonldObject, path: cmumpssJsonPattern(module.exports.cmumpss.Kg_Patient_Diagnosis, token)});
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */

function removeDiagnoses(cmumpsJsonldObject) {
    var token = token || cmumpsPrefixPattern;
    var result = [];
    var paths = JSONPath({json: cmumpsJsonldObject,
        path: cmumpssJsonPattern(module.exports.cmumpss.Kg_Patient_Diagnosis, token),
        resultType: 'path'});
    paths.forEach(function(path) {
        var theMatch = path.match(/^\$\['@graph'\]\[(\d+)\]/);
        if (theMatch) {
            var index = theMatch[1] - result.length;
            result.push(cmumpsJsonldObject['@graph'][index]);
            cmumpsJsonldObject['@graph'].splice(index, 1);
        }
    });
    return result;
}



/**
 * Extract the procedures from a cmumpsJsonldObject
 * @param cmumpsJsonldObject
 * @returns {Array[object]} -- the procedures
 */

// istanbul ignore next
function extractProcedures(cmumpsJsonldObject) {
    return JSONPath({json: cmumpsJsonldObject, path: "$['@graph'][?(@.type=='Procedure')]"});
}


/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */
function removeProcedures(cmumpsJsonldObject) {
    var result = [];
    var paths = JSONPath({json: cmumpsJsonldObject,
        path: "$['@graph'][?(@.type=='Procedure')]",
        resultType: 'path'});
    paths.forEach(function(path) {
        var theMatch = path.match(/^\$\['@graph'\]\[(\d+)\]/);
        if (theMatch) {
            var index = theMatch[1] - result.length;
            result.push(cmumpsJsonldObject['@graph'][index]);
            cmumpsJsonldObject['@graph'].splice(index, 1);
        }
    });
    return result;
}


// Export the actual functions here.
[isCmumpsPatient,
    cmumpssJsonPattern,
    // cmumpssSimpleJsonPattern,
    jsonPattern,
    cmumpsDate,
    cmumpsPatientName,
    extractPatient,
    removePatient,
    extractPrescriptions,
    removePrescriptions,
    extractLabs,
    extractDiagnoses,
    removeDiagnoses,
    extractProcedures,
    removeProcedures].forEach(function(f) { module.exports[f.name] = f; });

module.exports.cmumpss = {};
// Their whole names in LDR. Drop the integer suffixes.
['Patient-2', 'Prescription-52', 'Lab_Result-63', 'Kg_Patient_Diagnosis-100417', 'Procedure'].forEach(function(cmumpss) {
    var name = cmumpss.split('-')[0];
    module.exports.cmumpss[name] = cmumpss;
});

// parts, the parts of cmumps knows how to extract
module.exports.parts = {};
[extractDemographics, extractPatient, extractMedications, extractLabs, extractDiagnoses, extractProcedures].forEach(function(f) {
    module.exports.parts[f.name.substring('extract'.length).toLowerCase()] = f;
    module.exports[f.name] = f;
});

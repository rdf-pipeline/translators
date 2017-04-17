/**
 * Manipulate the fhir json object in understandable ways.
 * TODO mike@carif.io: can this module be generated from the fhir artifacts in some way?
 */

const _ = require('underscore');
const Jsonpath = require('jsonpath');

/**
 * Generate "now" as a timestamp parsable by fhir. There are several acceptible formats.
 * Using a single function throughout gives us consistent treatment.
 * @returns {string} -- the timestamp "now" as a local time.
 */
function now() {
    return new Date().toISOString();
}



/**
 * A set of predicates to recognize types of cmumps objects
 */

/**
 * Extract the *single* patient from the fhirObject using Jsonpath.
 * @param {object} fhirObject
 * @returns {Patient}
 */

function extractPatient(fhirObject) {
    return Jsonpath.query(fhirObject, '$.entry[0].resource[?(@.resourceType=="Patient")]')[0];
}


/**
 * Fronts extractPatient because the terminology is confusing.
 * @param {object} fhirObject
 * @returns {Patient}
 */
function extractDemographics(fhirObject) {
    return [ extractPatient(fhirObject) ];
}

/**
 * Extract all medications from the fhirObject using Jsonpath.
 * @param {object} fhirObject
 * @returns {Array[MedicationDispense]}
 */
function extractMedications(fhirObject) {
    return Jsonpath.query(fhirObject, '$.entry[0].resource[?(@.resourceType=="MedicationDispense")]');
}

/**
 * Extract all labs from the fhirObject using Jsonpath.
 * @param fhirObject
 * @returns {Array[Observation]}
 */
function extractLabs(fhirObject) {
    return Jsonpath.query( fhirObject, '$.entry[0].resource[?(@.resourceType=="DiagnosticObservation")]');
}

/**
 * Extract all Diagnoses from the fhirObject using Jsonpath.
 * @param fhirObject
 * @returns {Array[DiagosticReport]}
 */
function extractDiagnoses(fhirObject) {
    return Jsonpath.query( fhirObject, '$.entry[0].resource[?(@.resourceType=="DiagnosticReport")]');
}

/**
 * Extract all Procedures from the fhirObject using Jsonpath.
 * @param {object} fhirObject
 * @returns {Array[Procedure]}
 */
function extractProcedures(fhirObject) {
    return Jsonpath.query(fhirObject, '$.entry[0].resource[?(@.resourceType=="Procedure")]');
}


/**
 * Add the cmumps participating properties, described as JSON path expressions, rooted at prefix object (if passed).
 * @param {object} fhirResult, SIDE EFFECTS fhirResult
 * @param {List[String]} participatingProperties
 * @param {String} [prefix=undefined] -- the prefix of the JSON Path expression
 */
function addParticipants(fhirResult, participatingProperties, prefix) {
    // Don't create an extension unless there are participating properties to actually report.
    if (participatingProperties.length > 0) {
        fhirResult.extension = [
            {url: 'cmumps', extension: participatingProperties.map(function(i) { 
                return {url: 'cmumps', valueString: prefix ? prefix + i.substring(1) : i};
            })}
        ];
    }
}


/**
 * Add the cmumps translation warnings as strings. The strings are messages for a human reader.
 * @param {object} fhirResult, SIDE EFFECTS fhirResult
 * @param {Array[String]} warnings
 */
function addWarnings(fhirResult, warnings) {
    // Don't create or augment an extension unless there are warnings to actually report.
    if (warnings.length > 0) {
        // Array[String] => Array[{url, valueString}]
        var warningsAsExtensions = warnings.map(function(i) { return {url: 'cmumps', valueString: i}});
        if (fhirResult.extension) {
            // If there are already some extensions, add this to the list.
            fhirResult.extension.push({url: 'cmumps', extension: warningsAsExtensions});
        } else {
            // Create an extension and populate it.
            fhirResult.extension = [
                {url: 'cmumps', extension: warningsAsExtensions}
            ];
        }
    }
}


/**
 * Given an arbitrary javascript Object, encoded it as a list of fhirExtensions using
 * the directions at https://hl7-fhir.github.io/extensibility.html
 * @param jsObject
 * @returns {null}
 */

// Leave this as a placeholder.

// function js2fhirExtension(jsObject) {
//     return jsObject.map(_.pairs(jsObject), js2fhir)
// }
//
// function js2fhir(key, value) {
//
// }

// Export the actual functions here.
[now, extractPatient, extractDemographics,
    extractMedications, extractLabs, extractDiagnoses,
    extractProcedures, extractLabs,
    addParticipants, addWarnings].forEach(function(f) { module.exports[f.name] = f; });

// Given a resourceType, e.g. 'MedicationDispense', return the function that will extract out that resource type.
// This is redundant, but can be useful if you come to this API with prior knowledge of the FHIR resourceTypes.
// Note that _.keys(module.exports.resourceTypes) will enumerate the "covered" FHIR resourceTypes.
module.exports.resourceTypes = {
    Patient: extractPatient,
    MedicationDispense: extractMedications,
    DiagnosticObservation: extractLabs,
    DiagnosticReport: extractDiagnoses,
    Procedure: extractProcedures,
    DiagnosticObservation: extractLabs
};

module.exports.returns = {};
// reverse the resourceTypes mapping, should report the FHIR return type for an extractor as a string, e.g.
// var fhir = require('fhir); fhir.returns['extractMedications'] => 'MedicationDispense'
// Useful for mocha tests.
_.pairs(module.exports.resourceTypes).forEach(function(p) { module.exports.returns[p[1]] = p[0]; });


// parts, the parts of fhir knows how to extract
module.exports.parts = {};
[extractDemographics, extractMedications, extractLabs, extractDiagnoses, extractProcedures].forEach(function(f) {
    module.exports.parts[f.name.substring('extract'.length).toLowerCase()] = f;
});

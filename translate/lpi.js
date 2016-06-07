/**
 * Manipulate the cmumps jsonld object in understandable ways
 */

var format = require('string-format');
var JSONPath = require('jsonpath-plus');
var cmumps_utils = require('./util/cmumps_utils');
var fdt = require('./cmumps2fhir_datatypes');

/**
 *
 * @param {string} fhirTargetResource -- the kind of FHIR resource to eventually translate, e.g. 'DiagnosticReport' or 'MedicationDispense'
 * @param {Function || string} translatorFunction -- the source translator inserting this defer (marker).
 * @param {string} sourceNode -- ?
 * @param {string} id of the source object to that it can be obtained again
 * @param {string matching /urn:local:fhir:Patient:2-\d+/} patientId
 * @param {string} patientName, cmumps format 'LAST, FIRST MIDDLE?'
 * @returns {Object} deferred translation marker
 */
function defer(fhirTargetResource, translatorFunction, sourceNode, id, patientId, patientName) {
    // Key for this value will be 't:translatedBy'
    var expectedPatientFormat = /urn:local:fhir:Patient:2-\d+/;
    if (! patientId.match(expectedPatientFormat)) {
        throw new Error('patientId not in expected format ' + expectedPatientFormat);
    }


    return {
        '@id': 'urn:local:' + fhirTargetResource + '/' + id,
        'resourceType': fhirTargetResource,
        'id': id,
        'fhir:patientName': patientName,
        't:translatedBy': {
            // Are these values all required?
            't:translator': 't:translators:' + translatorFunction.name,
            't:sourceNode': 'urn:local:' + sourceNode,
            't:patientId': patientId, // urn:local:fhir:Patient:2-\d+
            't:patientName': patientName,  // cmumps 'name' or if undefined 'label'
        }
    };
}


// place in cmumps_utils
function makeTranslator(translator) {

    
    return function (inputObject, options, prefix) {
        var options = cmumps_utils.merge(options, /* defaults */ {
            warnings: false,
            policy: false,
            eat: false
        });

        var participatingProperties = ["['type']"]; // no participants yet
        var warnings = []; // no warnings yet
        // the magic is here
        // var marked = Marked.prototype.create(inputObject, fdt.fetch1(marked, participatingProperties));
        // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
        // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
        var fetch1 = fdt.makeJsonFetcher1(inputObject, participatingProperties);
        // fetch1(json_pattern[, transformation])

        var translated = translator(inputObject, fetch1);

        if (options.participants) fhir.addParticipants(translated, participatingProperties, prefix);
        if (options.warnings) fhir.addWarnings(translated, warnings);
        fdt.clean(translated);

        return {
            // marked: marked,
            options: options,
            participants: participatingProperties,
            warnings: warnings,
            fhir: translated
        };
    };
}


// parts, the parts of cmumps knows how to extract
module.exports = {};
[defer, makeTranslator].forEach(function(f) {
    module.exports[f.name] = f;
});

/**
 * Manipulate the cmumps jsonld object in understandable ways
 */

var format = require('string-format');
var JSONPath = require('jsonpath-plus');
var cmumps_utils = require('./util/cmumps_utils');
var fdt = require('./cmumps2fhir_datatypes');
var _ = require('underscore');

/**
 * Defer creates a marker to be inserted in a translation. This marker indicates that a translator knows a translation
 * must be inserted here, but can't do it. It marks metadata about what the translation should be, e.g. its FHIR resourceType
 * 'Patient' or 'DiagnosticReport' and what the source object should be.
 * @param {required string} fhirTargetResource -- the kind of FHIR resource to eventually translate, e.g. 'DiagnosticReport' or 'MedicationDispense'
 * @param {required Function || string} translatorFunction -- the source translator inserting this Defer (marker).
 * @param {required Object || string} sourceNode -- input for translation.
 * @param {required string} id of the source object so that it can be obtained again (in theory)
 * @param {required string, matching /urn:local:fhir:Patient:2-\d+/} patientId
 * @param {required string} patientName, cmumps format 'LAST, FIRST MIDDLE?'
 * @returns {Object} deferred translation marker
 *
 * usage as a function:  var d = Defer(); // d instanceOf Object
 * // usage as a constructor: var d = new Defer(); // d instanceOf Defer, commented out
 *                                 ^^^
 */



function fhirDefer(fhirTargetResource, translatorFunction, sourceNode, id, patientId, patientName) {

    var expectedPatientFormat = /urn:local:fhir:Patient:2-\d+/;
    if (! patientId.match(expectedPatientFormat)) {
        throw new Error('patientId not in expected format ' + expectedPatientFormat);
    }

    var d = {
        '@id': 'urn:local:' + fhirTargetResource + '/' + id,
        resourceType: fhirTargetResource,
        _deferred: true, 
        id: id,
        'fhir:patientName': patientName,
        't:translatedBy': {
            // Are these values all required?
            't:translator': 't:translators:' + _.isFunction(translatorFunction) ? translatorFunction.name : translatorFunction,
            // if the sourceNode comes in serialized as a string, attach a prefix. Otherwise its an object and preserve the object
            't:sourceNode': (typeof sourceNode == 'string') ? 'urn:local:' + sourceNode : sourceNode,
            't:patientId': patientId, // urn:local:fhir:Patient:2-\d+
            't:patientName': patientName,  // cmumps 'name' or if undefined 'label'
        }
    };

    // http://www.2ality.com/2012/08/underscore-extend.html
    // Apparently _.extend can be fooled in certain cases.
    // TODO carif: retain this expression,
    // return (this instanceof fhirDefer) ? _.extend(this, d) : d;
    return d;
}

// fhirDefer.prototype.method here...




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
[fhirDefer, makeTranslator].forEach(function(f) {
    module.exports[f.name] = f;
});

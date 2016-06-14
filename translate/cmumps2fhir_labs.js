/**
 * Translate cmumps Lab object to fhir Observation.
 */

'use strict';

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
var cmumps_utils = require('./util/cmumps_utils');
var lpi = require('./lpi');






/**
 * Deferred translation of a cmumps lab.
 * @param {required object} cmumpsLabResultObject - javascript object with type 'cmumpss:Lab_Result-63'
 * @returns {object} -- fhirDefer translation
 * @see {http://hl7-fhir.github.io/observation.html}
 * @see {./test/translate-parts-mocha.js} for example uses in the context of unittests.
 * @usage { var result = cmumps2fhir_labs.translateLabsFhir(cmumpsLabeResultObject); }
 *
 *  Implementation notes:
 *
 *  - mongodb query db.schema.find_one({fmDD: 'fmdd:63'}, {'properties.id':true})
 *    will find the mongodb document that enumerates the cmumps fields available. They are:
 *
 *  - mongodb query db['63'].find({}) will find instances of 'Lab_Result-63'.
 */


function translateLabsFhir(cmumpsLabResultObject) {

    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = fdt.makeGetter(cmumpsLabResultObject);

    // These values are useful multiple times. Compute them once.
    var id = get('$._id').split('-')[1];
    // arguments.callee unavailable when 'use strict'. Var 'this', as usual, is bound to a global outside a method.
    // Neither works. Pick your battles.
    var resourceType = translateLabsFhir.resourceType;
    var patientName = get('$.patient-63.label');

    return fdt.clean({
        '@id': 'urn:local:' + resourceType + '/' + id,
        resourceType: resourceType,
        _deferred: true,
        id: id,
        'fhir:patientName': patientName,
        't:translatedBy': {
            // Are these values all required?
            't:translator': 't:translators:' + module.name + '.' + translateLabsFhir.name,
                't:sourceNode': cmumpsLabResultObject,
            't:patientId': 'urn:local:fhir:Patient:' + get('$.patient-63.id'), // urn:local:fhir:Patient:2-\d+
            't:patientName': patientName,  // cmumps 'name' or if undefined 'label'
        }
    });
}


// Each translator "knows" what FHIR resource it will generate. This is useful to the caller and for lpi.Defer().
translateLabsFhir.resourceType = 'DiagnosticReport';
translateLabsFhir.deferred = true;
var translate = translateLabsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translateLabsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

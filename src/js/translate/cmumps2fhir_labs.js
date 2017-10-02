/**
 * Translate cmumps Lab object to fhir Observation.
 */

'use strict';

const _ = require('underscore');
var Path=require('path');
const Fdt = require('./cmumps2fhir_datatypes');

const RESOURCE_TYPE = "DiagnosticOrder";   // David, Eric - is this right? 

/**
 * Extracts CMUMPS Patient Lab results from a CMUMPS JSON-LD object
 *
 * @param cmumpsJsonldObject a CMUMPS JSON-LD object
 *
 * @return an array of CMUMPS patient labs if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractLabs(cmumpsJsonldObject) {
    if (_.isUndefined(cmumpsJsonldObject)) {
        throw Error("Cannot extract CMUMPS labs because patient data object is undefined!");
    }

    return _.filter(cmumpsJsonldObject['@graph'],
        function(json) {
            return /c(hc|mump)ss:Lab_Result-63/.test(json.type);
    });
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove all lab records from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */
function removeLabs(cmumpsJsonldObject) {
    cmumpsJsonldObject['@graph'] =  _.filter(cmumpsJsonldObject['@graph'], function(json) {
            return !/c(hc|mump)ss:Lab_Result-63/.test(json.type);
    });
    return cmumpsJsonldObject;
}

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
    var get = Fdt.makeGetter(cmumpsLabResultObject);

    // These values are useful multiple times. Compute them once.
    var id = get('$._id'); 
    // arguments.callee unavailable when 'use strict'. Var 'this', as usual, is bound to a global outside a method.
    // Neither works. Pick your battles.
    var resourceType = translateLabsFhir.resourceType;
    var patientName = get("$['patient-63'].label");

    return Fdt.clean({
        '@id': 'urn:local:' + this.resourceType + ':' + id,
        resourceType: RESOURCE_TYPE,
        _deferred: true,
        id: id,
        'fhir:patientName': patientName,
        't:translatedBy': {
            // Are these values all required?
            't:translator': 't:translators:' + this.name + '.' + translateLabsFhir.name,
                't:sourceNode': cmumpsLabResultObject,
            't:patientId': 'urn:local:fhir:Patient:' + get("$['patient-63'].id"), // urn:local:fhir:Patient:2-\d+
            't:patientName': patientName,  // cmumps 'name' or if undefined 'label'
        }
    });
}

module.exports = {
    deferred: true,
    extractLabs: extractLabs,
    name: Path.basename(__filename, '.js'),
    removeLabs: removeLabs,
    resourceType: RESOURCE_TYPE,
    translateLabsFhir: translateLabsFhir
};

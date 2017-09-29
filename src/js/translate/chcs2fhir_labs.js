/**
 * Translate chcs Lab object to fhir Observation.
 */

'use strict';

const _ = require('underscore');
var Path=require('path');
const Fdt = require('./chcs2fhir_datatypes');

const RESOURCE_TYPE = "DiagnosticOrder";   // David, Eric - is this right? 

/**
 * Extracts CHCS Patient Lab results from a CHCS JSON-LD object
 *
 * @param chcsJsonldObject a CHCS JSON-LD object
 *
 * @return an array of CHCS patient labs if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractLabs(chcsJsonldObject) {
    if (_.isUndefined(chcsJsonldObject)) {
        throw Error("Cannot extract CHCS labs because patient data object is undefined!");
    }

    return _.filter(chcsJsonldObject['@graph'],
        function(json) {
            return /c(hc|mump)ss:Lab_Result-63/.test(json.type);
    });
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove all lab records from @graph of that object.
 * MODIFIES chcsJsonldObject.
 *
 * @param chcsJsonldObject
 * @return {Array[object]} -- the items removed
 */
function removeLabs(chcsJsonldObject) {
    chcsJsonldObject['@graph'] =  _.filter(chcsJsonldObject['@graph'], function(json) {
            return !/c(hc|mump)ss:Lab_Result-63/.test(json.type);
    });
    return chcsJsonldObject;
}

/**
 * Deferred translation of a chcs lab.
 * @param {required object} chcsLabResultObject - javascript object with type 'chcss:Lab_Result-63'
 * @returns {object} -- fhirDefer translation
 * @see {http://hl7-fhir.github.io/observation.html}
 * @see {./test/translate-parts-mocha.js} for example uses in the context of unittests.
 * @usage { var result = chcs2fhir_labs.translateLabsFhir(chcsLabeResultObject); }
 *
 *  Implementation notes:
 *
 *  - mongodb query db.schema.find_one({fmDD: 'fmdd:63'}, {'properties.id':true})
 *    will find the mongodb document that enumerates the chcs fields available. They are:
 *
 *  - mongodb query db['63'].find({}) will find instances of 'Lab_Result-63'.
 */
function translateLabsFhir(chcsLabResultObject) {

    // The get function knows how to get values from chcsPatientObject using JSONPath.
    var get = Fdt.makeGetter(chcsLabResultObject);

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
                't:sourceNode': chcsLabResultObject,
            't:patientId': 'urn:local:fhir:Patient:' + get("$['patient-63'].id"), // urn:local:fhir:Patient:2-\d+
            't:patientName': patientName,  // chcs 'name' or if undefined 'label'
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

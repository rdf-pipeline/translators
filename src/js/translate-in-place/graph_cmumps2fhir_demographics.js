/**
 * Translate a cmumps Patient objects to fhir Patient object.
 */

var prefix = '../translate/';
var cmumps = require(prefix + 'cmumps');
// Abbreviations to shorten functions
var pattern = cmumps.cmumpssJsonPattern;
var cmumpss = cmumps.cmumpss;
var fhir = require(prefix + 'fhir');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require(prefix + 'cmumps2fhir_datatypes');
var cmumps_utils = require(prefix + 'util/cmumps_utils');
var Av = require('autovivify');



/**
 * Translate a cmumpsPatientObject into a fhir_Patient resource using JSONPath.
 * @param {object} cmumpsPatientObjectModified
 * @param {string} cmumpsPatientObjectModified.type -- has value "cmumpss:Patient-2", an error is thrown iff options.policy == true.
 * @param {{policy: boolean, warnings: boolean, eat: boolean}} [_options={policy: false, warnings: false, eat: true}]
 * @returns {{used: object, fhir: object, participants: Array[String]}} -- .used, the input that actually generated .fhir, the FHIR translation,
 * @see {@link http://hl7-fhir.github.io/patient.html}
 */
function translateDemographicsFhir(cmumpsPatientObjectModified, _options, prefix) {
    // Assign the default options, then override what the caller wants. At the end you have the right options.
    var options = {
        participants: false,
        warnings: false, // capture warnings
        policy: false, // enforce policy. throw exceptions as they occur
        eat: true, // modify cmumpsPatientObjectModified
    };
    for (k in _options) {
        if (_options.hasOwnProperty(k)) options[k] = _options[k];
    }

    var participatingProperties = ["$['type']"]; // type is always used, it's how we got here
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
    // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
    //noinspection Eslint
    // var fetch1 = fdt.peek(cmumpsPatientObjectModified, participatingProperties);
    // fetch1(json_pattern[, transformation])
    var peek = fdt.peek(cmumpsPatientObjectModified, participatingProperties);
    var eat = fdt.eat(cmumpsPatientObjectModified, participatingProperties);


    // Translate each key/value pair at once. See the "shape" of the result.
    var resourceType = 'Patient';
    var fhirPatient = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, eat('$._id')),
        //"active" : true, // Whether this patient's record is in active use
        identifier: fdt.fhirIdentifier(eat('$.ssn-2'), eat('$.dod_id-2')),
        name: eat('$.name-2', fdt.fhirHumanName) || peek('$.label', fdt.fhirHumanName),  // first value wins
        // fhir telecon
        gender: eat('$.sex-2', function (i) {
            // return i.label.toLowerCase()
            if (_.has(i, 'label') && typeof(i.label) == 'string') {
                return i.label.toLowerCase();
            } else if (typeof(i) == 'string') {
                return i.toLowerCase();
            } else {
                return '';
            }
        }),
        birthDate: eat('$.dob-2', function (bd) {
            return fdt.fhirDate(bd.value);
        }),
        // fhir deceased
        // fhir address
        address: [fdt.clean(fdt.fhirAddress({
            street1: eat('$.street_address-2'),
            street2: eat('$.street_address-2-2'),
            street3: eat('$.street-address-2-3'),
            city: eat('$.city-2'),
            state: eat('$.state-2', function (s) {
                if (_.has(s, 'label') && typeof(s.label) == 'string') return s.label.split('/')[0];
            }),
            country: eat('$.state-2', function (s) {
                if (_.has(s, 'label') && typeof(s.label) == 'string') {
                    var a = s.label.split('/');
                    if (a.length > 1) return a[1];
                }
            }),
            county: eat('$.county-2'),
            zip: eat('$.zip-code-2')
        }))],
        maritalStatus: eat('$.marital_status-2', fdt.fhirMaritalStatus)
        // fhir multipleBirth // twins
        // fhir photo
        // fhir contact
        // fhir animal -- skip
        // fhir communication
        // fhir careProvider
        // fhir managingOrganization -- VA
        // fhir link
    };


    // TODO carif: here the participatingProperties are somewhat misleading since
    // there are JSON path expressions relative to the Patient object, *not* the @graph.
    if (options.participants) fhir.addParticipants(fhirPatient, participatingProperties, prefix);
    if (options.warnings) fhir.addWarnings(fhirPatient, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirPatient);
    // Add additional semantic processing here.

    // var used = new Av();
    // participatingProperties.forEach(function (p) {
    //     var prop = p.substring(1);
    //     eval('used' + prop + '= cmumpsPatientObjectModified' + prop);
    // });
    // var object_used = cmumps_utils.devivify(used);
    //
    // if (options.eat) {
    //     participatingProperties.forEach(function(p){
    //         var prop = p.substring(1);
    //         eval('delete cmumpsPatientObjectModified' + prop);
    //     });
    // }

    return {
        // used: object_used,
        fhir: fhirPatient,
        participants: participatingProperties,
        options: options
    };
}

// short form
var translate = translateDemographicsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translateDemographicsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

/**
 * Translate a cmumps Patient objects to fhir Patient object.
 */

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






/**
 * Translate a cmumpsPatientObject into a fhir_Patient resource using JSONPath.
 * @param {object} cmumpsPatientObject
 * @returns {object} -- fhir Patient resource object
 * @see {http://hl7-fhir.github.io/patient.html}
 */

function translateDemographicsFhir(cmumpsPatientObject, options) {
    var options = options || { participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
    // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // Translate each key/value pair at once. See the "shape" of the result.
    var resourceType = 'Patient';
    var fhirPatient = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, fetch1('$._id')),
        //"active" : true, // Whether this patient's record is in active use
        identifier: fdt.fhirIdentifier(fetch1('$.ssn-2'), fetch1('$.dod_id-2')),
        name: fetch1('$.name-2', fdt.fhirHumanName) || fetch1('$.label', fdt.fhirHumanName),  // first value wins
        // fhir telecon
        gender: fetch1('$.sex-2', function (i) {
            // return i.label.toLowerCase()
            if (_.has(i, 'label') && typeof(i.label) == 'string') {
                return i.label.toLowerCase();
            } else if (typeof(i) == 'string') {
                return i.toLowerCase();
            } else {
                return '';
            }
        }),
        birthDate: fetch1('$.dob-2', function (bd) {
            return fdt.fhirDate(bd.value);
        }),
        // fhir deceased
        // fhir address
        address: [fdt.clean(fdt.fhirAddress({
            street1: fetch1('$.street_address-2'),
            street2: fetch1('$.street_address-2-2'),
            street3: fetch1('$.street-address-2-3'),
            city: fetch1('$.city-2'),
            state: fetch1('$.state-2', function (s) {
                if (_.has(s, 'label') && typeof(s.label) == 'string') return s.label.split('/')[0];
            }),
            country: fetch1('$.state-2', function (s) {
                if (_.has(s, 'label') && typeof(s.label) == 'string') {
                    var a = s.label.split('/');
                    if (a.length > 1) return a[1];
                }
            }),
            county: fetch1('$.county-2'),
            zip: fetch1('$.zip-code-2')
        }))],
        maritalStatus: fetch1('$.marital_status-2', fdt.fhirMaritalStatus)
        // fhir multipleBirth // twins
        // fhir photo
        // fhir contact
        // fhir animal -- skip
        // fhir communication
        // fhir careProvider
        // fhir managingOrganization -- VA
        // fhir link
    };


    if (options.participants) fhir.addParticipants(fhirPatient, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirPatient, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirPatient);
    // Add additional semantic processing here.

    return fhirPatient;
}


// short form
var translate = translateDemographicsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translateDemographicsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

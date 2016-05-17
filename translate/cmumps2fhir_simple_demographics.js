/**
 * Translate a cmumps Patient objects to FHIR Patient object.
 */

// FHIR "microparsers" that are cmumps specific.
var fdt = require('./cmumps2fhir_datatypes');


/**
 *
 * @param cmumpsPatientObject -- a cmumps Patient object
 * @returns {Object} -- a FHIR translation
 */
function translate(cmumpsPatientObject) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = fdt.makeGetter(cmumpsPatientObject);

    // Translate the structure. FHIR keys that aren't translated are
    // retained as comments. They may be included later as the author
    // learns more.
    var resourceType = 'Patient';
    return fdt.clean({
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, get('$._id')),
        //"active" : true, // Whether this patient's record is in active use
        identifier: fdt.fhirIdentifier(get('$.ssn-2'), get('$.dod_id-2')),
        name: fdt.fhirHumanName(get('$.name-2') || get('$.label')),  // first value wins
        // fhir telecon
        gender: fdt.fhirPatientGender(get('$.sex-2')),
        birthDate: fdt.fhirPatientBirthDate(get('$.dob-2')),
        // fhir deceased
        // fhir address
        address: [fdt.clean(fdt.fhirAddress({
            street1: get('$.street_address-2'),
            street2: get('$.street_address-2-2'),
            street3: get('$.street-address-2-3'),
            city: get('$.city-2'),
            state: fdt.fhirPatientState(get('$.state-2')),
            country: fdt.fhirPatientCountry(get('$.state-2')),
            county: get('$.county-2'),
            zip: get('$.zip-code-2')
        }))],
        maritalStatus: fdt.fhirMaritalStatus(get('$.marital_status-2'))
        // fhir multipleBirth // twins
        // fhir photo
        // fhir contact
        // fhir animal -- skip
        // fhir communication
        // fhir careProvider
        // fhir managingOrganization -- VA
        // fhir link
    });
}



// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

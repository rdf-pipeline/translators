/**
 * Translate a chcs Patient objects to fhir Patient object.
 */

const _ = require('underscore');

const Fdt = require('./chcs2fhir_datatypes');
const Fhir = require('./fhir');

const RESOURCE_TYPE = 'Patient';

/**
 * Extracts CHCS Patient demographics from a CHCS JSON-LD object
 * 
 * @param chcsJsonldObject a CHCS JSON-LD object
 *
 * @return an array of CHCS patient demographics if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractDemographics(chcsJsonldObject) {
    if (_.isUndefined(chcsJsonldObject)) {
        throw Error("Cannot extract CHCS demographics because patient data object is undefined!");
    }

    return _.filter(chcsJsonldObject['@graph'],
        function(json) {
            return /c(hc|mump)ss:Patient-2/.test(json.type);
    });
}

function extractPatient(chcsJsonldObject) {
    var demographics = extractDemographics(chcsJsonldObject);
    return !_.isEmpty(demographics) ? demographics[0] : demographics;
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES chcsJsonldObject.
 *
 * @param chcsJsonldObject
 * @return {Array[object]} -- the items removed
  */
function removeDemographics(chcsJsonldObject) {
    chcsJsonldObject['@graph'] =  _.filter(chcsJsonldObject['@graph'], function(json) {
            return !/c(hc|mump)ss:Patient-2/.test(json.type);
    });
    return chcsJsonldObject;
}

function removePatient(chcsJsonldObject) {
    return removeDemographics(chcsJsonldObject);
}

/**
 * Simple translation of CHCS demographics to a FHIR Patient resource. 
 *
 * @param chcsPatientObject -- a chcs Patient object
 * @returns {Object} -- a FHIR translation
 */
function simpleTranslate(chcsPatientObject, get) {
    // The get function knows how to get values from chcsPatientObject using JSONPath.
    var get = get || Fdt.makeGetter(chcsPatientObject);

    // Translate the structure. FHIR keys that aren't translated are
    // retained as comments. They may be included later as the author
    // learns more.
    
    // According to the chcs collection 'schema', a chcs patient can have 224 different
    // keys. The code stanza below was generated with the mongodb expression:

    // db.schema.findOne({fmDD: {$regex: /fmdd:2/}}).properties.forEach(function(i) { print("// get('$." + i.id + "') // " + i.label + ", " + i.description); })

    // and then mapped to FHIR. This can be considered a "source to FHIR" mapping strategy starting with data you (potentially)
    // have and finding a "good place" to put it. Note that many of these data items are optional. To see if your
    // data source actually has records/documents/objects/structures with some data, you can issue this query in
    // mongo:

    // function findAny(key) { return db['2'].find({key: {$exists: true}}, {key:true}); }
    // findAny('phone-2')  // for example
    // Or brute force: db['2'].find({'phone-2': {$exists: true}})

    var result = Fdt.clean({
        resourceType: RESOURCE_TYPE,
        id: Fdt.fhirId(RESOURCE_TYPE, get('$._id')),
        active: true, // if the patient's chcs record is available, it's active
        identifier: Fdt.fhirIdentifier(get("$['ssn-2']"), get("$['dod_id_-2']")),
        name: Fdt.fhirHumanName(get("$['name-2']") || get('$.label')),  
        // fhir telecom
        telecom: [
            Fdt.fhirContactPoint({system: 'phone', use: 'home', value: get("$['phone-2']") }),
            Fdt.fhirContactPoint({system: 'phone', use: 'office', value: get("$['office_phone-2']")}),
            Fdt.fhirContactPoint({system: 'phone', use: 'mobile', value: get("$['cell_phone-2']")}),
            Fdt.fhirContactPoint({system: 'phone', use: 'temp', value: get("$['temporary_phone-2']")}), // no data in chcs database
            Fdt.fhirContactPoint({system: 'fax', value: get("$['fax_number-2']")}), // no data in chcs database
            Fdt.fhirContactPoint({system: 'email', value: get("$['email_address-2']")}) // no data in chcs
        ],
        gender: Fdt.fhirPatientGender(get("$['sex-2']")),
        birthDate: Fdt.fhirPatientBirthDate(get("$['dob-2']")),
        // fhir deceased NO MAP?
        // fhir address
        address: [ Fdt.fhirAddress({
            street1: get("$['street_address-2']"),
            street2: get("$['street_address-2-2']"),
            street3: get("$['street-address-2-3']"),
            city: get("$['city-2']"),
            state: Fdt.fhirPatientState(get("$['state-2']")),
            country: Fdt.fhirPatientCountry(get("$['state-2']")),
            county: get("$['county-2']"),
            zip: get("$['zip_code-2']")
        }) ],
        maritalStatus: Fdt.fhirMaritalStatus(get("$['marital_status-2']")),
        // fhir multipleBirthBoolean|Integer NO MAP?// twins
        // fhir photo NO MAP?
        // fhir contact
        // TODO: outer clean should do this correctly
        contact: Fdt.clean([
            { // A contact party (e.g. guardian, partner, friend) for the patient
                relationship : [ Fdt.fhirCodeableConcept(get("$['erelationship-2']")) ], // The kind of relationship
                name: Fdt.fhirHumanName(get("$['emergency_contact-2']")), // A name associated with the contact person
                telecom: [ Fdt.fhirContactPoint({system: 'phone', value: get("$['ephone-2']")}) ], // A contact detail for the person
                address: Fdt.fhirAddress({
                    street1: get("$['estreet_address-2']"),
                    street2: get("$['estreet_address_2-2']"),
                    street3: get("$['estreet_address_3-2']"),
                    city: get("$['ecity-2']"),
                    state: get("$['estate-2']"),
                    zip: get("$['ezip-2']")
                }) // Address for the contact person
                // gender: "<code>", // male | female | other | unknown
                // organization: { Reference(Organization) }, // C? Organization that is associated with the contact
            }
        ]),
        // fhir animal NO MAP
        // fhir communication [{language: Fdt.CodeableConcept()} ...]
        communication: [ Fdt.fhirCodeableConcept('English')],
        // fhir careProvider
        careProvider: [Fdt.fhirReferencePractioner(get("$['health_care_provider-2']"))],
        // fhir managingOrganization -- VA
        managingOrganization: Fdt.fhirReferenceOrganization({
            name: get("$['health_care_provider-2']")
        }),
        // fhir link
        link: [ {other: Fdt.fhirReferencePatient(get("$['correct_patient-2']")), type: 'replace'} ]
    });
    return result;
}

/**
 * Translate a chcsPatientObject into a fhir_Patient resource 
 *
 * @param {object} chcsPatientObject
 * @returns {object} -- fhir Patient resource object
 * @see {http://hl7-fhir.github.io/patient.html}
 */

function translateDemographicsFhir(chcsPatientObject, options) {
    var options = options || { participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for chcs_patient_object. The fetcher will get data values from
    // input chcs_patient_object, remembering those that actually have values in list participating_properties.
    var fetch1 = Fdt.makeJsonFetcher1(chcsPatientObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // Translate each key/value pair at once. See the "shape" of the result.
    // var resourceType = 'Patient';
    var fhirPatient = simpleTranslate(chcsPatientObject, fetch1);

    if (options.participants) Fhir.addParticipants(fhirPatient, participatingProperties);
    if (options.warnings) Fhir.addWarnings(fhirPatient, warnings);

    // Remove keys that have undefined/null/[] values.
    Fdt.clean(fhirPatient);
    // Add additional semantic processing here.

    return fhirPatient;
}


module.exports = {
    extractDemographics: extractDemographics,
    extractPatient: extractPatient,
    removeDemographics: removeDemographics,
    removePatient: removePatient,
    resourceType: RESOURCE_TYPE,
    translate: simpleTranslate,
    translateDemographicsFhir: translateDemographicsFhir
};

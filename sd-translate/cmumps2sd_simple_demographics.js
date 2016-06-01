/**
 * Translate a cmumps Patient objects to sd Patient object.
 */

// sd "microparsers" that are cmumps specific.
var fdt = require('./cmumps2sd_datatypes');


/**
 *
 * @param cmumpsPatientObject -- a cmumps Patient object
 * @returns {Object} -- a sd translation
 */
function translate(cmumpsPatientObject, get) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = get || fdt.makeGetter(cmumpsPatientObject);

    // Translate the structure. sd keys that aren't translated are
    // retained as comments. They may be included later as the author
    // learns more.
    
    // According to the cmumps collection 'schema', a cmumps patient can have 224 different
    // keys. The code stanza below was generated with the mongodb expression:

    // db.schema.findOne({fmDD: {$regex: /fmdd:2/}}).properties.forEach(function(i) { print("// get('$." + i.id + "') // " + i.label + ", " + i.description); })

    // and then mapped to sd. This can be considered a "source to sd" mapping strategy starting with data you (potentially)
    // have and finding a "good place" to put it. Note that many of these data items are optional. To see if your
    // data source actually has records/documents/objects/structures with some data, you can issue this query in
    // mongo:

    // function findAny(key) { return db['2'].find({key: {$exists: true}}, {key:true}); }
    // findAny('phone-2')  // for example
    // Or brute force: db['2'].find({'phone-2': {$exists: true}})


    var resourceType = 'Patient';
    var result = fdt.clean({
        resourceType: resourceType,
        id: fdt.sdId(resourceType, get('$._id')),
        active: true, // if the patient's cmumps record is available, it's active
        identifier: fdt.sdIdentifier(get('$.ssn-2'), get('$.dod_id-2')),
        name: fdt.sdHumanName(get('$.name-2') || get('$.label')),  // first value wins
        // sd telecom
        telecom: [
            fdt.sdContactPoint({system: 'phone', use: 'home', value: get('$.phone-2') }),
            fdt.sdContactPoint({system: 'phone', use: 'office', value: get('$.office_phone-2')}),
            fdt.sdContactPoint({system: 'phone', use: 'mobile', value: get('$.cell_phone-2')}),
            fdt.sdContactPoint({system: 'phone', use: 'temp', value: get('$.temporary_phone-2')}), // no data in cmumps database
            fdt.sdContactPoint({system: 'fax', value: get('$.fax_number-2')}), // no data in cmumps database
            fdt.sdContactPoint({system: 'email', value: get('$.email_address-2')}) // no data in cmumps
        ],
        gender: fdt.sdPatientGender(get('$.sex-2')),
        birthDate: fdt.sdPatientBirthDate(get('$.dob-2')),
        // sd deceased NO MAP?
        // sd address
        address: [ fdt.sdAddress({
            street1: get('$.street_address-2'),
            street2: get('$.street_address-2-2'),
            street3: get('$.street-address-2-3'),
            city: get('$.city-2'),
            state: fdt.sdPatientState(get('$.state-2')),
            country: fdt.sdPatientCountry(get('$.state-2')),
            county: get('$.county-2'),
            zip: get('$.zip-code-2')
        }) ],
        maritalStatus: fdt.sdMaritalStatus(get('$.marital_status-2')),
        // sd multipleBirthBoolean|Integer NO MAP?// twins
        // sd photo NO MAP?
        // sd contact
        // TODO: outer clean should do this correctly
        contact: fdt.clean([
            { // A contact party (e.g. guardian, partner, friend) for the patient
                relationship : [ fdt.sdCodeableConcept(get('$.erelationship-2')) ], // The kind of relationship
                name: fdt.sdHumanName(get('$.emergency_contact-2')), // A name associated with the contact person
                telecom: [ fdt.sdContactPoint({system: 'phone', value: get('$.ephone-2')}) ], // A contact detail for the person
                address: fdt.sdAddress({
                    street1: get('$.estreet_address-2'),
                    street2: get('$.estreet_address_2-2'),
                    street3: get('$.estreet_address_3-2'),
                    city: get('$.ecity-2'),
                    state: get('$.estate-2'),
                    zip: get('$.ezip-2')
                }) // Address for the contact person
                // gender: "<code>", // male | female | other | unknown
                // organization: { Reference(Organization) }, // C? Organization that is associated with the contact
            }
        ]),
        // sd animal NO MAP
        // sd communication [{language: fdt.CodeableConcept()} ...]
        communication: [ fdt.sdCodeableConcept('English')],
        // sd careProvider
        careProvider: [fdt.sdReferencePractioner(get('$.health_care_provider-2'))],
        // sd managingOrganization -- VA
        managingOrganization: fdt.sdReferenceOrganization({
            name: get('$.health_care_provider-2')
        }),
        // sd link
        link: [ {other: fdt.sdReferencePatient(get('$.correct_patient-2')), type: 'replace'} ]
    });
    return result;
}



// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

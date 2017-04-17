/**
 * Translate cmumps Prescription objects to fhir MedicationDispense resources.
 */

const _ = require('underscore');

const Fdt = require('./cmumps2fhir_datatypes');
const Fhir = require('./fhir');

const RESOURCE_TYPE =  'MedicationDispense';

/**
 * Extracts CMUMPS Patient prescriptions from a CMUMPS JSON-LD object
 *
 * @param cmumpsJsonldObject a CMUMPS JSON-LD object
 *
 * @return an array of CMUMPS patient prescriptions if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractPrescriptions(cmumpsJsonldObject) {
    if (_.isUndefined(cmumpsJsonldObject)) {
        throw Error("Cannot extract CMUMPS prescriptions because patient data object is undefined!");
    }

    return _.filter(cmumpsJsonldObject['@graph'],
        function(json) {
            return /c(hc|mump)ss:Prescription-52/.test(json.type);
    });
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the prescriptions from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */
function removePrescriptions(cmumpsJsonldObject) {
    cmumpsJsonldObject['@graph'] =  _.filter(cmumpsJsonldObject['@graph'], function(json) {
            return !/c(hc|mump)ss:Prescription-52/.test(json.type);
    });
    return cmumpsJsonldObject;
}

/**
 *
 * @param cmumpsPrescriptionObject -- a cmumps Patient object
 * @returns {Object} -- a FHIR translation
 */
function simpleTranslate(cmumpsPrescriptionObject) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = Fdt.makeGetter(cmumpsPrescriptionObject);

    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."

    var whenPrepared = get("$['login_date-52'].value");
    var expandedSig = get("$['expanded_sig-52']");
    var asNeeded = false;
    if (expandedSig) asNeeded = (/as needed/i).test(expandedSig);
    return Fdt.clean({
        resourceType: RESOURCE_TYPE,
        id: Fdt.fhirId(RESOURCE_TYPE, get('$._id')),
        active: true, // Whether this patient's record is in active use
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: Fdt.fhirExternalIdentifier(get('$._id'), 'Prescription'),
        status: 'completed', // in-progress | on-hold | completed | entered-in-error | stopped, NOT MAPPED
        // medication[x]: What medication was supplied. One of these 2:
        medicationCodeableConcept: Fdt.fhirCodeableConcept(get("$['drug-52'].label")), // Reference(Medication)
        medicationReference: Fdt.fhirReferenceMedication(get("$['drug-52']")), // Reference(Medication)
        patient: Fdt.fhirReferencePatient(get("$['patient-52']")),
        dispenser: Fdt.fhirReferencePractioner(get("$['provider-52']")), // Reference(Practitioner), Practitioner responsible for dispensing medication
        authorizingPrescription: [ Fdt.fhirReferenceMedicationOrder(get("$['order_pointer-52']")) ], // Medication order that authorizes the dispense, TODO: cross ref?
        type: Fdt.fhirCodeableConcept(get("$['status-52']")), // Trial fill, partial fill, emergency fill, etc., NOT FOUND
        quantity: Fdt.fhirQuantity(get("$['qty-52']")), // { Quantity(SimpleQuantity) }, // Amount dispensed
        daysSupply: Fdt.fhirQuantity(get("$['days_supply-52']")), // { Quantity(SimpleQuantity) }, // Amount of medication expressed as a timing amount
        whenPrepared: whenPrepared, // Dispense processing time
        whenHandedOver: whenPrepared, // When product was given out
        destination: Fdt.fhirReferenceLocation(get("$['outpatient_site-52']")), // Where the medication was sent
        // receiver: [{ Reference(Patient|Practitioner) }], // Who collected the medication
        note: [{ text: get("$['comments-52']") }], // Information about the dispense
        dosageInstruction: [ // Medicine administration instructions to the patient/caregiver
            {
                text: Fdt.htmlEncode(get("$['sig-52']")), // "text" : "<string>", // Free text dosage instructions e.g. SIG
                additionalInstructions: Fdt.fhirCodeableConcept(Fdt.htmlEncode(get("$['expanded_sig-52']"))), // E.g. "Take with food"
                timing: Fdt.fhirTiming(Fdt.htmlEncode(get("$['sig-52']")), whenPrepared), // When medication should be administered
                //    // asNeeded[x]: Take "as needed" f(or x). One of these 2:
                asNeededBoolean: asNeeded, //    "asNeededBoolean" : <boolean>,
                //    "asNeededCodeableConcept" : { CodeableConcept },
                //    site[x]: Body site to administer to. One of these 2:
                //    "siteCodeableConcept" : { CodeableConcept },
                //    "siteReference" : { Reference(BodySite) },
                //    "route" : { CodeableConcept }, // How drug should enter body
                //    "method" : { CodeableConcept }, // Technique for administering medication
                // dose[x]: Amount of medication per dose. One of these 2:
                //    "doseRange" : { Range },
                //    "doseQuantity" : { Quantity(SimpleQuantity) },
                // rate[x]: Amount of medication per unit of time. One of these 2://    "rateRatio" : { Ratio },
                //    "rateRange" : { Range },
                //    "maxDosePerPeriod" : { Ratio } // Upper limit on medication per unit of time
            }],
        // substitution: { // Deals with substitution of one medicine for another
        // R!  Code signifying whether a different drug was dispensed from what was prescribed
        //     reason: [{CodeableConcept}], // Why was substitution made
        //     responsibleParty: [{Reference(Practitioner)}] // Who is responsible for the substitution
    });
}

/**
 * Translate a cmumpsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {http://hl7-fhir.github.io/medicationdispense.html}
 *
 *  Implementation notes:
 *
 *  - db.schema.find_one({fmDD:'fmdd:52'}) will find the mongodb document that enumerates the cmumps fields available.
 *  - db['52'].find({}) will find instances of Prescription-52.
 */

function translatePrescriptionsFhir(cmumpsPrescriptionObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsPrescriptionObject. The fetcher will get data values from
    // input cmumpsPrescriptionObject, remembering those that actually have values in list participatingProperties.
    var fetch1 = Fdt.makeJsonFetcher1(cmumpsPrescriptionObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."

    var fhirMedication = simpleTranslate(cmumpsPrescriptionObject);

    // addParticipants doesn't create a FHIR extension yet.
    if (options.participants) Fhir.addParticipants(fhirMedication, participatingProperties);
    if (options.warnings) Fhir.addWarnings(fhirMedication, warnings);

    // The FHIR spec indicates that well-formed MedicationDispenses are required to have one of these two values.
    // Generally the medicationReference will be the key that's populated.
    if (!_.has(fhirMedication, 'medicationReference') && !_.has(fhirMedication, 'medicationCodeableConcept')) {
        throw new Error(format("FHIR medication '{id}' contains neither a medicationReference nor a medicationCodeableConcept.", {id: fhirMedication.value}));
    }
    return fhirMedication;
}

module.exports = {
    extractMedications: extractPrescriptions,
    extractPrescriptions: extractPrescriptions,
    removeMedications: removePrescriptions,
    removePrescriptions: removePrescriptions,
    resourceType: RESOURCE_TYPE,
    translate: simpleTranslate,
    translatePrescriptionsFhir: translatePrescriptionsFhir
};

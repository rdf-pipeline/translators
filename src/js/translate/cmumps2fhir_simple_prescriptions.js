/**
 * Translate a cmumps Patient objects to FHIR Patient object.
 */

// FHIR "microparsers" that are cmumps specific.
var fdt = require('./cmumps2fhir_datatypes');

/**
 *
 * @param cmumpsPrescriptionObject -- a cmumps Patient object
 * @returns {Object} -- a FHIR translation
 */

function translate(cmumpsPrescriptionObject) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = fdt.makeGetter(cmumpsPrescriptionObject);

    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."

    var resourceType = 'MedicationDispense';
    var whenPrepared = get('$.login_date-52.value');
    var expandedSig = get('$.expanded_sig-52');
    var asNeeded = false;
    if (expandedSig) asNeeded = (/as needed/i).test(expandedSig);
    return fdt.clean({
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, get('$._id')),
        active: true, // Whether this patient's record is in active use
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: fdt.fhirExternalIdentifier(get('$._id'), 'Prescription'),
        status: 'completed', // in-progress | on-hold | completed | entered-in-error | stopped, NOT MAPPED
        // medication[x]: What medication was supplied. One of these 2:
        medicationCodeableConcept: fdt.fhirCodeableConcept(get('$.drug-52.label')), // Reference(Medication)
        medicationReference: fdt.fhirReferenceMedication(get('$.drug-52')), // Reference(Medication)
        patient: fdt.fhirReferencePatient(get('$.patient-52')),
        dispenser: fdt.fhirReferencePractioner(get('$.provider-52')), // Reference(Practitioner), Practitioner responsible for dispensing medication
        authorizingPrescription: [ fdt.fhirReferenceMedicationOrder(get('order_pointer-52')) ], // Medication order that authorizes the dispense, TODO: cross ref?
        type: fdt.fhirCodeableConcept(get('$.status-52')), // Trial fill, partial fill, emergency fill, etc., NOT FOUND
        quantity: fdt.fhirQuantity(get('$.qty-52')), // { Quantity(SimpleQuantity) }, // Amount dispensed
        daysSupply: fdt.fhirQuantity(get('$.days_supply-52')), // { Quantity(SimpleQuantity) }, // Amount of medication expressed as a timing amount
        whenPrepared: whenPrepared, // Dispense processing time
        whenHandedOver: whenPrepared, // When product was given out
        destination: fdt.fhirReferenceLocation(get('$.outpatient_site-52')), // Where the medication was sent
        // receiver: [{ Reference(Patient|Practitioner) }], // Who collected the medication
        note: [{ text: get('$.comments-52') }], // Information about the dispense
        dosageInstruction: [ // Medicine administration instructions to the patient/caregiver
            {
                text: fdt.htmlEncode(get('$.sig-52')), // "text" : "<string>", // Free text dosage instructions e.g. SIG
                additionalInstructions: fdt.fhirCodeableConcept(fdt.htmlEncode(get('$.expanded_sig-52'))), // E.g. "Take with food"
                timing: fdt.fhirTiming(fdt.htmlEncode(get('$.sig-52')), whenPrepared), // When medication should be administered
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

translate.resourceType = 'MedicationDispense';


// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

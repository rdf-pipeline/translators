/**
 * Translate cmumps Prescription objects to fhir MedicationDispense resources.
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
// https://www.npmjs.com/package/node-html-encoder
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');




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
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPrescriptionObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."
    var resourceType = 'MedicationDispense';
    // var whenPrepared = fetch1('$.fill_dates-52[0].fill_dates-52_01.value');
    var whenPrepared = fetch1('$.login_date-52.value');
    var fhirMedication = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, fetch1('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: fetch1('$._id', function(i) { return fdt.fhirExternalIdentifier(i, 'Prescription'); }),
        status: 'completed', // in-progress | on-hold | completed | entered-in-error | stopped, NOT MAPPED
        // medication[x]: What medication was supplied. One of these 2:
        medicationCodeableConcept: fetch1('$.drug-52.label', fdt.fhirCodeableConcept), // Reference(Medication)
        medicationReference: fetch1('$.drug-52', fdt.fhirReferenceMedication), // Reference(Medication)
        patient: fetch1('$.patient-52', fdt.fhirReferencePatient),
        dispenser: fetch1('$.provider-52', fdt.fhirReferencePractioner), // Reference(Practitioner), Practitioner responsible for dispensing medication
        authorizingPrescription: fetch1('order_pointer-52', function (p) { return [ fdt.fhirReferenceMedicationOrder(p) ]; }), // Medication order that authorizes the dispense, TODO: cross ref?
        // type: fetch1("$.type", fhirCodeableConcept), // Trial fill, partial fill, emergency fill, etc., NOT FOUND
        quantity: fetch1('$.qty-52', fdt.fhirQuantity), // { Quantity(SimpleQuantity) }, // Amount dispensed
        daysSupply: fetch1('$.days_supply-52', fdt.fhirQuantity), // { Quantity(SimpleQuantity) }, // Amount of medication expressed as a timing amount
        whenPrepared: whenPrepared, // Dispense processing time
        whenHandedOver: whenPrepared, // When product was given out
        destination: fetch1('$.outpatient_site-52', fdt.fhirReferenceLocation), // Where the medication was sent
        // receiver: [{ Reference(Patient|Practitioner) }], // Who collected the medication
        note: fetch1('$.comments-52', function(c) { return [{ text: c }]; }), // Information about the dispense
        dosageInstruction: [ // Medicine administration instructions to the patient/caregiver
           {
               text: fetch1('$.sig-52', function(t) { return encoder.htmlEncode(t); }),  // "text" : "<string>", // Free text dosage instructions e.g. SIG
               additionalInstructions: fetch1('$.expanded_sig-52', function(ai) { return fdt.fhirCodeableConcept(encoder.htmlEncode(ai)); }), // E.g. "Take with food"
               timing: fetch1('$.sig-52', function(sig) {return fdt.fhirTiming(encoder.htmlEncode(sig), whenPrepared); }), // When medication should be administered
               //    // asNeeded[x]: Take "as needed" f(or x). One of these 2:
               // asNeededBoolean: fetch1('$.expanded_sig-52', function(s) { return s.match(/as needed/i); }), //    "asNeededBoolean" : <boolean>,
               asNeededBoolean: fetch1('$.expanded_sig-52', function(s) { return (/as needed/i).test(s); }) || false, //    "asNeededBoolean" : <boolean>,
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
    };



    if (options.participants) fhir.addParticipants(fhirMedication, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirMedication, warnings);
    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirMedication);

    // The FHIR spec indicates that well-formed MedicationDispenses are required to have one of these two values.
    // Generally the medicationReference will be the key that's populated.
    if (!_.has(fhirMedication, 'medicationReference') && !_.has(fhirMedication, 'medicationCodeableConcept')) {
        throw new Error(format("FHIR medication '{id}' contains neither a medicationReference nor a medicationCodeableConcept.", {id: fhirMedication.value}));
    }
    return fhirMedication;
}

// short form
var translate = translatePrescriptionsFhir;

[translatePrescriptionsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });


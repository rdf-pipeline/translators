/**
 * Translate cmumps Prescription objects to fhir MedicationDispense resources.
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
// https://www.npmjs.com/package/node-html-encoder
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');
var cmumps_utils = require(prefix + 'util/cmumps_utils');
var Av = require('autovivify');




/**
 * Translate a cmumpsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} cmumpsPrescriptionObjectModified -- input object
 * @param {{policy: boolean, warnings: boolean, eat: boolean}} [_options={policy: false, warnings: false, eat: true}]
  * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {http://hl7-fhir.github.io/medicationdispense.html}
 *
 *  Implementation notes:
 *
 *  - db.schema.find_one({fmDD:'fmdd:52'}) will find the mongodb document that enumerates the cmumps fields available.
 *  - db['52'].find({}) will find instances of Prescription-52.
 */

function translatePrescriptionsFhir(cmumpsPrescriptionObjectModified, _options, prefix) {
    // Assign the default options, then override what the caller wants. At the end you have the right options.
    var options = {
        warnings: false, 
        policy: false, 
        eat: true
    };
    for (k in _options) {
        // istanbul ignore else
        if (_options.hasOwnProperty(k)) { options[k] = _options[k]; }
    }

    // var participatingProperties = ["$['type']"]; // no participants yet
    var participatingProperties = []; // no participants yet
    // Create a fetcher for cmumpsPrescriptionObject. The fetcher will get data values from
    // input cmumpsPrescriptionObject, remembering those that actually have values in list participatingProperties.
    // var fetch1 = fdt.peek(cmumpsPrescriptionObjectModified, participatingProperties); // => fetch1(json_pattern[, transformation])
    var peek = fdt.peek(cmumpsPrescriptionObjectModified, participatingProperties); // => fetch1(json_pattern[, transformation])
    var eat = fdt.eat(cmumpsPrescriptionObjectModified, participatingProperties); // => fetch1(json_pattern[, transformation])

    eat('$.type');
    var warnings = []; // no warnings yet


    // http://hl7-fhir.github.io/medication.html:
    // "This resource is primarily used for the identification and definition of a medication. It covers the ingredients
    // and the packaging for a medication."

    // http://hl7-fhir.github.io/medicationdispense.html:
    // "Indicates that a medication product is to be or has been dispensed for a named person/patient. This includes a
    // description of the medication product (supply) provided and the instructions for administering the medication.
    // The medication dispense is the result of a pharmacy system responding to a medication order."
    var resourceType = 'MedicationDispense';
    // var whenPrepared = fetch1('$.fill_dates-52[0].fill_dates-52_01.value');
    var whenPrepared = eat('$.login_date-52.value');
    var fhirMedication = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, peek('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: eat('$._id', function(i) { return fdt.fhirExternalIdentifier(i, 'Prescription'); }),
        status: 'completed', // in-progress | on-hold | completed | entered-in-error | stopped, NOT MAPPED
        // medication[x]: What medication was supplied. One of these 2:
        medicationCodeableConcept: eat('$.drug-52.label', fdt.fhirCodeableConcept), // Reference(Medication)
        medicationReference: eat('$.drug-52', fdt.fhirReferenceMedication), // Reference(Medication)
        patient: eat('$.patient-52', fdt.fhirReferencePatient),
        dispenser: eat('$.provider-52', fdt.fhirReferencePractioner), // Reference(Practitioner), Practitioner responsible for dispensing medication
        authorizingPrescription: eat('order_pointer-52', function (p) { return [ fdt.fhirReferenceMedicationOrder(p) ]; }), // Medication order that authorizes the dispense, TODO: cross ref?
        // type: fetch1("$.type", fhirCodeableConcept), // Trial fill, partial fill, emergency fill, etc., NOT FOUND
        quantity: eat('$.qty-52', fdt.fhirQuantity), // { Quantity(SimpleQuantity) }, // Amount dispensed
        daysSupply: eat('$.days_supply-52', fdt.fhirQuantity), // { Quantity(SimpleQuantity) }, // Amount of medication expressed as a timing amount
        whenPrepared: whenPrepared, // Dispense processing time
        whenHandedOver: whenPrepared, // When product was given out
        destination: eat('$.outpatient_site-52', fdt.ReferenceLocation), // Where the medication was sent
        // receiver: [{ Reference(Patient|Practitioner) }], // Who collected the medication
        note: eat('$.comments-52', function(c) { return [{ text: c }]; }), // Information about the dispense
        dosageInstruction: [ // Medicine administration instructions to the patient/caregiver
           {
               text: peek('$.sig-52', function(t) { return encoder.htmlEncode(t); }),  // "text" : "<string>", // Free text dosage instructions e.g. SIG
               additionalInstructions: eat('$.expanded_sig-52', function(ai) { return fdt.fhirCodeableConcept(encoder.htmlEncode(ai)); }), // E.g. "Take with food"
               timing: eat('$.sig-52', function(sig) {return fdt.fhirTiming(encoder.htmlEncode(sig), whenPrepared); }), // When medication should be administered
               //    // asNeeded[x]: Take "as needed" f(or x). One of these 2:
               // asNeededBoolean: fetch1('$.expanded_sig-52', function(s) { return s.match(/as needed/i); }), //    "asNeededBoolean" : <boolean>,
               asNeededBoolean: eat('$.expanded_sig-52', function(s) { return s.match(/as needed/i) ? true : false; }), //    "asNeededBoolean" : <boolean>,
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


    // istanbul ignore if
    if (options.participants) fhir.addParticipants(fhirMedication, participatingProperties, prefix);
    // istanbul ignore if
    if (options.warnings) fhir.addWarnings(fhirMedication, warnings);
    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirMedication);

    // The FHIR spec indicates that well-formed MedicationDispenses are required to have one of these two values.
    // Generally the medicationReference will be the key that's populated.
    // istanbul ignore if
    if (options.policy && !_.has(fhirMedication, 'medicationReference') && !_.has(fhirMedication, 'medicationCodeableConcept')) {
        throw new Error(format("FHIR medication '{id}' contains neither a medicationReference nor a medicationCodeableConcept.", {id: fhirMedication.value}));
    }

    // var used = new Av(); // {};
    // participatingProperties.forEach(function (p) {
    //     var prop = p.substring(1);
    //     eval('used' + prop + '= cmumpsPrescriptionObjectModified' + prop);
    // });
    // var object_used = cmumps_utils.devivify(used);
    //
    // if (options.eat) {
    //     participatingProperties.forEach(function(p){
    //         var prop = p.substring(1);
    //         eval('delete cmumpsPrescriptionObjectModified' + prop);
    //     });
    // }

    return {
        // used: object_used,
        options: options,
        participants: participatingProperties,
        fhir: fhirMedication
    };
}

// short form
var translate = translatePrescriptionsFhir;

[translatePrescriptionsFhir, translate].forEach(function(f) { module.exports[f.name] = f; });


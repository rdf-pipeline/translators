/**
 * Translate entire cmumps Procedure object at fhir Procedure resource.
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
 * Translate a cmumpsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} cmumpsPrescriptionObject -- input object
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {http://hl7-fhir.github.io/medicationdispense.html}
 */
function translateProceduresFhir(cmumpsProcedureObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsProcedureObject. The fetcher will get data values from
    // input cmumpsProcedureObject, remembering those that actually have values in list participating_properties.
    var fetch1 = fdt.makeJsonFetcher1(cmumpsProcedureObject, participatingProperties); // returns function fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var resourceType = 'Procedure';
    // TODO mike@carif.io: the 'Patient-' prefix breaks with the cmumps naming conventions. Check this.
    var thePatient = fetch1('$.patient.id', function(p) {return '2-' + p.substring('Patient-'.length); });
    var theProcedure = fetch1('$._id', function(p) { return p.substring('Procedure-'.length); });
    var theLabel = fetch1('$.patient.label');
    var fhirProcedure = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, fetch1('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: theProcedure && fdt.fhirIdentifierList(theProcedure, 'Procedure'), // External Identifiers for this procedure
        subject: thePatient && theLabel && fdt.fhirReferencePatient({id: thePatient, label: theLabel}), // { Reference(Patient|Group) }, // R!  Who the procedure was performed on
        status: 'completed', // R!  in-progress | aborted | completed | entered-in-error
        category: fetch1('$.source.id', fdt.fhirCodeableConcept), // { CodeableConcept }, // Classification of the procedure
        code: fetch1('$.source.id', fdt.fhirCodeableConcept), // { CodeableConcept }, // R!  Identification of the procedure
        // notPerformed: false, // <boolean>, // True if procedure was not performed as scheduled
        // reasonNotPerformed: // [{ CodeableConcept }], // C? Reason procedure was not performed
        // bodySite: fetch1('', fdt.fhirCodeableConcept), // [{ CodeableConcept }], // Target body sites
        // reason[x]: Reason procedure performed. One of these 2:
        // reasonCodeableConcept: fetch1('', fdt.fhirCodeableConcept), // { CodeableConcept },
        // reasonReference: { Reference(Condition) },
        // dbooth
        // performer: fetch1('$.provider', function (p) {
        //        return [{ // The people who performed the procedure
        //            actor: fdt.fhirReferencePractioner(p), // { Reference(Practitioner|Organization|Patient|RelatedPerson) }, // The reference to the practitioner
        //            role: fdt.fhirCodeableConcept(p) // { CodeableConcept } // The role the actor was in
        //        }];
        //    }),
        // performed[x]: Date/Period the procedure was performed. One of these 2:

        performedDateTime: fetch1('$.dateReported.value'), // "<dateTime>",
        // performedPeriod: { Period },
        encounter: fetch1('$.comments', function (e) { return { display: e }; }), // The encounter associated with the procedure
        // location: fetch1('', fdt.fhirReferenceLocation), // { Reference(Location) }, // Where the procedure happened
        // outcome: fetch1('', fdt.fhirCodeableConcept), // { CodeableConcept }, // The result of procedure
        // report: fetch1('', function (r) { return [ producingThisDiagnosticReport || fdt.ReferenceDiagnosticReport(r) ]; }), // { Reference(DiagnosticReport) }], // Any report resulting from the procedure
        // complication: fetch1('', fdt.CodeableConceptList), // Complication following the procedure
        // followUp: fetch1('', fdt.CodeableConceptList), // Instructions for follow up
        // request: { Reference(CarePlan|DiagnosticOrder|ProcedureRequest|ReferralRequest) }, // A request for this procedure
        // notes: fetch1('', function(a) { return [a]; }), // [{ Annotation }], // Additional information about the procedure
        // focalDevice: [{ // Device changed in procedure
        // action: { CodeableConcept }, // Kind of change to device
        // manipulated: { Reference(Device) } // R!  Device that was changed
        // }],
        // used: [{ Reference(Device|Medication|Substance) }] // Items used during procedure
    };

    if (options.participants) fhir.addParticipants(fhirProcedure, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirProcedure, warnings);
    fdt.clean(fhirProcedure);
    // Additional semantic processing here
    return fhirProcedure;
}

// short form
var translate = translateProceduresFhir;

[translateProceduresFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

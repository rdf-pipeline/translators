/**
 * Translate entire chcs Procedure object at fhir Procedure resource.
 */

var prefix = '../translate/';
var chcs = require(prefix + 'chcs');
// Abbreviations to shorten functions
var pattern = chcs.chcssJsonPattern;
var chcss = chcs.chcss;
var fhir = require(prefix + 'fhir');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require(prefix + 'chcs2fhir_datatypes');
var chcs_utils = require(prefix + 'util/chcs_utils');
var Av = require('autovivify');


/**
 * Translate a chcsPrescriptionObject into a fhir_MedicationDispense.
 * @param {object} chcsPrescriptionObject -- input object
 * @param {{policy: boolean, warnings: boolean, eat: boolean}} [_options={policy: false, warnings: false, eat: true}]
 * @returns {object} -- fhir translation, a MedicationDispense resource
 * @see {@link http://hl7-fhir.github.io/procedure.html}
 */
function translateProceduresFhir(chcsProcedureObjectModified, _options, prefix) {
    // Assign the default options, then override what the caller wants. At the end you have the right options.
    var options = {
        participants: false,
        warnings: false,
        policy: false,
        eat: true
    };
    for (k in _options) {
        if (_options.hasOwnProperty(k)) {
            options[k] = _options[k];
        }
    }

    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for chcsProcedureObject. The fetcher will get data values from
    // input chcsProcedureObject, remembering those that actually have values in list participating_properties.
    // var fetch1 = fdt.peek(chcsProcedureObjectModified, participatingProperties); // returns function fetch1(json_pattern[, transformation])
    var peek = fdt.peek(chcsProcedureObjectModified, participatingProperties); // returns function fetch1(json_pattern[, transformation])
    var eat = fdt.eat(chcsProcedureObjectModified, participatingProperties); // returns function fetch1(json_pattern[, transformation])
    eat('$.type');

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var resourceType = 'Procedure';
    // TODO mike@carif.io: the 'Patient-' prefix breaks with the chcs naming conventions. Check this.
    var thePatient = eat('$.patient.id', function(p) { return '2-' + p.substring('Patient-'.length); });
    var theProcedure = eat('$._id', function(p) { return p.substring('Procedure-'.length); });
    var theLabel = eat('$.patient.label');
    var fhirProcedure = {
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, eat('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: theProcedure && fdt.fhirIdentifierList(theProcedure, 'Procedure'), // External Identifiers for this procedure
        subject: thePatient && theLabel && fdt.fhirReferencePatient({id: thePatient, label: theLabel}), // { Reference(Patient|Group) }, // R!  Who the procedure was performed on
        status: 'completed', // R!  in-progress | aborted | completed | entered-in-error
        category: peek('$.source.id', fdt.fhirCodeableConcept), // { CodeableConcept }, // Classification of the procedure
        code: eat('$.source.id', fdt.fhirCodeableConcept), // { CodeableConcept }, // R!  Identification of the procedure
        // notPerformed: false, // <boolean>, // True if procedure was not performed as scheduled
        // reasonNotPerformed: // [{ CodeableConcept }], // C? Reason procedure was not performed
        // bodySite: fetch1('', fdt.fhirCodeableConcept), // [{ CodeableConcept }], // Target body sites
        // reason[x]: Reason procedure performed. One of these 2:
        // reasonCodeableConcept: fetch1('', fdt.fhirCodeableConcept), // { CodeableConcept },
        // "reasonReference" : { Reference(Condition) },
        // performer: fetch1('$.provider', function (p) {
        //         return [{ // The people who performed the procedure
        //             actor: fdt.fhirReferencePractioner(p.id), // { Reference(Practitioner|Organization|Patient|RelatedPerson) }, // The reference to the practitioner
        //             role: fdt.fhirCodeableConcept(p) // { CodeableConcept } // The role the actor was in
        //         }];
        //     }),
        // // performed[x]: Date/Period the procedure was performed. One of these 2:
        performedDateTime: eat('$.dateReported.value'), // "<dateTime>",
        // "performedPeriod" : { Period },
        encounter: eat('$.comments', function (e) { return { display: e }; }), // The encounter associated with the procedure
        // location: fetch1('', fdt.fhirReferenceLocation), // { Reference(Location) }, // Where the procedure happened
        // outcome: fetch1('', fdt.fhirCodeableConcept), // { CodeableConcept }, // The result of procedure
        // report: fetch1('', function (r) { return [ producingThisDiagnosticReport || fdt.ReferenceDiagnosticReport(r) ]; }), // { Reference(DiagnosticReport) }], // Any report resulting from the procedure
        // complication: fetch1('', fdt.CodeableConceptList), // Complication following the procedure
        // followUp: fetch1('', fdt.CodeableConceptList), // Instructions for follow up
        // "request" : { Reference(CarePlan|DiagnosticOrder|ProcedureRequest|ReferralRequest) }, // A request for this procedure
        // notes: fetch1('', function(a) { return [a]; }), // [{ Annotation }], // Additional information about the procedure
        // "focalDevice" : [{ // Device changed in procedure
        // "action" : { CodeableConcept }, // Kind of change to device
        // "manipulated" : { Reference(Device) } // R!  Device that was changed
        // }],
        //"used" : [{ Reference(Device|Medication|Substance) }] // Items used during procedure
    };

    if (options.participants) fhir.addParticipants(fhirProcedure, participatingProperties, prefix);
    if (options.warnings) fhir.addWarnings(fhirProcedure, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirProcedure);
    // Additional semantic processing here

    // var used = new Av();
    // participatingProperties.forEach(function (p) {
    //     var prop = p.substring(1);
    //     eval('used' + prop + '= chcsProcedureObjectModified' + prop);
    // });
    //
    // if (options.eat) {
    //     participatingProperties.forEach(function(p){
    //         var prop = p.substring(1);
    //         eval('delete chcsProcedureObjectModified' + prop);
    //     });
    // }
    // var object_used = chcs_utils.devivify(used);
    //
    return {
        // used: object_used,
        fhir: fhirProcedure,
        participants: participatingProperties,
        options: options
    };
}

// short form
var translate = translateProceduresFhir;

[translateProceduresFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

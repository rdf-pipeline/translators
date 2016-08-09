/**
 * Translate a cmumps Patient objects to FHIR Procedure object.
 */

// FHIR "microparsers" that are cmumps specific.
var fdt = require('./cmumps2fhir_datatypes');

/**
 *
 * @param cmumpsProcedureObject -- a cmumps Patient object
 * @returns {Object} -- a FHIR translation
 */
function translate(cmumpsProcedureObject) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = fdt.makeGetter(cmumpsProcedureObject);

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var resourceType = 'Procedure';
    var thePatient = get('$.patient.id');
    // istanbul ignore else
    if (thePatient) thePatient = '2-' + thePatient.substring('Patient-'.length);
    var theProcedure = get('$._id');
    // istanbul ignore else
    if (theProcedure) theProcedure = theProcedure.substring('Procedure-'.length);
    var theLabel = get('$.patient.label');
    var provider = get('$.provider'); var thePreformer = undefined;
    // istanbul ignore else
    if (provider) thePreformer = [{
        actor: fdt.fhirReferencePractioner(provider), // { Reference(Practitioner|Organization|Patient|RelatedPerson) }, // The reference to the practitioner
        role:fdt.fhirCodeableConcept('provider') // { CodeableConcept } // The role the actor was in
    }];

    return fdt.clean({
        resourceType: resourceType,
        id: fdt.fhirId(resourceType, get('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: fdt.fhirIdentifierList(theProcedure, 'Procedure'), // External Identifiers for this procedure
        subject: fdt.fhirReferencePatient({id: thePatient, label: theLabel}), // { Reference(Patient|Group) }, // R!  Who the procedure was performed on
        status: 'completed', // R!  in-progress | aborted | completed | entered-in-error
        category: fdt.fhirCodeableConcept(get('$.source.id')), // { CodeableConcept }, // Classification of the procedure
        code: fdt.fhirCodeableConcept(get('$.source.id')), // { CodeableConcept }, // R!  Identification of the procedure
        // notPerformed: false, // <boolean>, // True if procedure was not performed as scheduled
        // reasonNotPerformed: // [{ CodeableConcept }], // C? Reason procedure was not performed
        // bodySite: fetch1('', fdt.fhirCodeableConcept), // [{ CodeableConcept }], // Target body sites
        // reason[x]: Reason procedure performed. One of these 2:
        // reasonCodeableConcept: fetch1('', fdt.fhirCodeableConcept), // { CodeableConcept },
        // reasonReference: { Reference(Condition) },
        // dbooth
        performer: thePreformer,
        // performed[x]: Date/Period the procedure was performed. One of these 2:

        performedDateTime: get('$.dateReported.value'), // "<dateTime>",
        // performedPeriod: { Period },
        encounter: { display: get('$.comments') }, // The encounter associated with the procedure
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
    });
}

translate.resourceType = 'Procedure';

// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

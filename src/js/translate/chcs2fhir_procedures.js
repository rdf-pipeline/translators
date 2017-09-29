/**
 * Translate entire chcs Procedure object at fhir Procedure resource.
 */

const _ = require('underscore');

const Fhir = require('./fhir');
const Fdt = require('./chcs2fhir_datatypes');
const Chcs_utils = require('./util/chcs_utils');

/**
 * Extracts CHCS Patient procedures from a CHCS JSON-LD object
 *
 * @param chcsJsonldObject a CHCS JSON-LD object
 *
 * @return an array of CHCS patient procedures if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractProcedures(chcsJsonldObject) {
    if (_.isUndefined(chcsJsonldObject)) {
        throw Error("Cannot extract CHCS procedures because patient data object is undefined!");
    }

    return _.filter(chcsJsonldObject['@graph'],
        function(json) {
            return /Procedure/.test(json.type);
    });
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the procedures from @graph of that object.
 * MODIFIES chcsJsonldObject.
 *
 * @param chcsJsonldObject
 * @return {Array[object]} -- the items removed
 */
function removeProcedures(chcsJsonldObject) {
    chcsJsonldObject['@graph'] =  _.filter(chcsJsonldObject['@graph'], function(json) {
            return !/Procedure/.test(json.type);
    });
    return chcsJsonldObject;
}

/**
 *
 * @param chcsProcedureObject -- a chcs Patient object
 * @returns {Object} -- a FHIR translation
 */
function simpleTranslate(chcsProcedureObject) {
    // The get function knows how to get values from chcsPatientObject using JSONPath.
    var get = Fdt.makeGetter(chcsProcedureObject);

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var resourceType = 'Procedure';
    var thePatient = get('$.patient.id');
    if (thePatient) thePatient = '2-' + thePatient.substring('Patient-'.length);
    var theProcedure = get('$._id');
    if (theProcedure) theProcedure = theProcedure.substring('Procedure-'.length);
    var theLabel = get('$.patient.label');
    var provider = get('$.provider'); var thePreformer = undefined;
    if (provider) thePreformer = [{
        actor: Fdt.fhirReferencePractioner(provider), // { Reference(Practitioner|Organization|Patient|RelatedPerson) }, // The reference to the practitioner
        role:Fdt.fhirCodeableConcept('provider') // { CodeableConcept } // The role the actor was in
    }];

    return Fdt.clean({
        resourceType: resourceType,
        id: Fdt.fhirId(resourceType, get('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: Fdt.fhirIdentifierList(theProcedure, 'Procedure'), // External Identifiers for this procedure
        subject: Fdt.fhirReferencePatient({id: thePatient, label: theLabel}), // { Reference(Patient|Group) }, // R!  Who the procedure was performed on
        status: 'completed', // R!  in-progress | aborted | completed | entered-in-error
        category: Fdt.fhirCodeableConcept(get('$.source.id')), // { CodeableConcept }, // Classification of the procedure
        code: Fdt.fhirCodeableConcept(get('$.source.id')), // { CodeableConcept }, // R!  Identification of the procedure
        // notPerformed: false, // <boolean>, // True if procedure was not performed as scheduled
        // reasonNotPerformed: // [{ CodeableConcept }], // C? Reason procedure was not performed
        // bodySite: fetch1('', Fdt.fhirCodeableConcept), // [{ CodeableConcept }], // Target body sites
        // reason[x]: Reason procedure performed. One of these 2:
        // reasonCodeableConcept: fetch1('', Fdt.fhirCodeableConcept), // { CodeableConcept },
        // reasonReference: { Reference(Condition) },
        // dbooth
        performer: thePreformer,
        // performed[x]: Date/Period the procedure was performed. One of these 2:

        performedDateTime: get('$.dateReported.value'), // "<dateTime>",
        // performedPeriod: { Period },
        encounter: { display: get('$.comments') }, // The encounter associated with the procedure
        // location: fetch1('', Fdt.fhirReferenceLocation), // { Reference(Location) }, // Where the procedure happened
        // outcome: fetch1('', Fdt.fhirCodeableConcept), // { CodeableConcept }, // The result of procedure
        // report: fetch1('', function (r) { return [ producingThisDiagnosticReport || Fdt.ReferenceDiagnosticReport(r) ]; }), // { Reference(DiagnosticReport) }], // Any report resulting from the procedure
        // complication: fetch1('', Fdt.CodeableConceptList), // Complication following the procedure
        // followUp: fetch1('', Fdt.CodeableConceptList), // Instructions for follow up
        // request: { Reference(CarePlan|DiagnosticOrder|ProcedureRequest|ReferralRequest) }, // A request for this procedure
        // notes: fetch1('', function(a) { return [a]; }), // [{ Annotation }], // Additional information about the procedure
        // focalDevice: [{ // Device changed in procedure
        // action: { CodeableConcept }, // Kind of change to device
        // manipulated: { Reference(Device) } // R!  Device that was changed
        // }],
        // used: [{ Reference(Device|Medication|Substance) }] // Items used during procedure
    });
}


/**
 * Translate a chcsProcedureObject into a FHIR Procedure.
 * @param {object} chcsProcedureObject -- input object
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {object} -- fhir translation, a Procedure resource
 */
function translateProceduresFhir(chcsProcedureObject, options) {
    var options = Chcs_utils.merge(options, {participants: false, warnings: false, policy: false});
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for chcsProcedureObject. The fetcher will get data values from
    // input chcsProcedureObject, remembering those that actually have values in list participating_properties.
    var fetch1 = Fdt.makeJsonFetcher1(chcsProcedureObject, participatingProperties); // returns function fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/procedure.html:
    // "This resource is used to record the details of procedures performed on a patient. A procedure is an activity
    // that is performed with or on a patient as part of the provision of care. Examples include surgical procedures,
    // diagnostic procedures, endoscopic procedures, biopsies, counseling, physiotherapy, exercise, etc.
    // Procedures may be performed by a healthcare professional, a friend or relative or in some cases
    // by the patient themselves."

    var fhirProcedure = simpleTranslate(chcsProcedureObject);

    if (options.participants) Fhir.addParticipants(fhirProcedure, participatingProperties);
    if (options.warnings) Fhir.addWarnings(fhirProcedure, warnings);
    Fdt.clean(fhirProcedure);
    // Additional semantic processing here
    return fhirProcedure;
}

module.exports = {
    extractProcedures: extractProcedures,
    removeProcedures: removeProcedures,
    resourceType: 'Procedure',
    translate: simpleTranslate,
    translateProceduresFhir: translateProceduresFhir
};

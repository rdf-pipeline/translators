/**
 * Translate cmumps Kg_Patient_Diagnosis object to fhir DiagnosticReport resource.
 */

const _ = require('underscore');

const Fhir = require('./fhir');
const Fdt = require('./cmumps2fhir_datatypes');

/**
 * Extracts CMUMPS Patient Diagnoses from a CMUMPS JSON-LD object
 *
 * @param cmumpsJsonldObject a CMUMPS JSON-LD object
 *
 * @return an array of CMUMPS patient diagnoses if any exist
 * @exception if input JSON-LD object is undefined
 */
function extractDiagnoses(cmumpsJsonldObject) {
    if (_.isUndefined(cmumpsJsonldObject)) {
        throw Error("Cannot extract CMUMPS diagnoses because patient data object is undefined!");
    }

    return _.filter(cmumpsJsonldObject['@graph'],
        function(json) {
            return /c(hc|mump)ss:Kg_Patient_Diagnosis-100417/.test(json.type);
    });
}

/**
 * Given a JSON LD input object <code>cmumptsJsonldObject</code>, remove the patient record from @graph of that object.
 * MODIFIES cmumpsJsonldObject.
 *
 * @param cmumpsJsonldObject
 * @return {Array[object]} -- the items removed
 */

function removeDiagnoses(cmumpsJsonldObject) {
    cmumpsJsonldObject['@graph'] =  _.filter(cmumpsJsonldObject['@graph'], function(json) {
            return !/c(hc|mump)ss:Kg_Patient_Diagnosis-100417/.test(json.type);
    });
    return cmumpsJsonldObject;
}

/**
 *
 * @param cmumpsDiagnosisObject -- a cmumps Patient object
 * @returns {Object} -- a FHIR translation
 */
function simpleTranslate(cmumpsDiagnosisObject) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var get = Fdt.makeGetter(cmumpsDiagnosisObject);

    // http://hl7-fhir.github.io/diagnosticreport.html:
    // "The diagnostic service returns a "report" which may contain a "narrative" - a written summary of the outcomes, and/or "results" -
    // the individual pieces of atomic data which each are "observations". The results are assembled in "groups" which are nested structures of
    // Observations (traditionally referred to as "panels" or " batteries" by laboratories) that can be used to represent relationships
    // between the individual data items."


    // These fields have cmumps sources, but don't seem to have a map to a FHIR DiagnosticReport.
    // get('$.acuity-100417') // Acuity, Indicate whether the acuity of this problem is currently Acute or Chronic.
    // get('$.problem-100417') // Problem, Problem that is assigned to a patient.
    // get('$.entering_user-100417') // Entering User, This field stores the user who made this entry to the problem list.
    // get('$.condition-100417') // Condition, This field stores whether the problem is permanent, hidden or transcribed.
    // get('$.modified_date-100417') // Modified Date, This field stores the date on which a modification was made to a problem.
    // get('$.modifying_user-100417') // Modifying User, This field stores the user who made each modification to a problem.
    // get('$.status-100417') // Status, Indicate whether this problem is currently active or inactive (resolved).
    // get('$.number-100417') // Number, This field accepts a number between 1 and 99. (gibberish)
    // get('$.comment-100417') // Comment, This is a word processing field.  The comments that you associate with this
    //    problem may be as long as you need.  Once entered they can be viewed but not
    //modified.  Additional comments may be added at any time.
    // get('$.note-100417') // Note, this field is to allow us to associate a comment with a note.


    var resourceType = 'DiagnosticReport';
    return Fdt.clean({
        resourceType : resourceType,
        id: Fdt.fhirId(resourceType, get('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier : [ Fdt.fhirIdentifierList(get('$.type')) ], // TODO: Array of Array?
        status: 'final', // R!  registered | partial | final | corrected | appended | cancelled | entered-in-error, http://hl7-fhir.github.io/valueset-diagnostic-report-status.html
        category: Fdt.fhirDiagnosticReportCategory(get("$['diagnosis-100417']")), // Service category
        code: Fdt.fhirCodeableConcept(get("$['diagnosis-100417']")), // R!  Name/Code for this diagnostic report
        subject: Fdt.fhirReferencePatient(get("$['patient-100417']")), // { Reference(Patient|Group|Device|Location) }, // R!  The subject of the report, usually, but not always, the patient
        // encounter: { Reference(Encounter) }, // { Reference(Encounter) }, // Health care event when test ordered
        // effective[x]: Clinically Relevant time/time-period for report. One of these 2:
        effectiveDateTime: Fdt.fhirDate(get("$['diagnosis-100417.date_of_onset-100417.value']")),
        // effectivePeriod: { Period },
        issued: get("$['date_entered-100417']"), // R!  DateTime this version was released
        performer: Fdt.fhirPractioner(get("$['provider-100417']")), // { Reference(Practitioner|Organization) }, // R!  Responsible Diagnostic Service
        // request: [{ Reference(DiagnosticOrder|ProcedureRequest|ReferralRequest) }], // What was requested
        // specimen: [{ Reference(Specimen) }], // Specimens this report is based on
        // result: [{ Reference(Observation) }], // Observations - simple, or complex nested groups
        // imagingStudy: [{ Reference(ImagingStudy|ImagingObjectSelection) }], // Reference to full details of imaging associated with the diagnostic report
        // image: [{ // Key images associated with this report
        // comment: "<string>", // Comment about the image (e.g. explanation)
        // link: { Reference(Media) } // R!  Reference to the image source
        conclusion: get("$['resolved_comment-100417']") || get("$['diagnosis-100417']"), // Clinical Interpretation of test results
        codedDiagnosis: Fdt.fhirCodeableConcept(get("$['diagnosis-100417']")), // Codes for the conclusion
        presentedForm: [cmumpsDiagnosisObject] // Entire report as issued
    });
}


/**
 * Translate cmumps Kg_Patient_Diagnosis object to fhir DiagnosticReport resource. Optionally you can track which
 * input fields participated in the translation and an warnings along the way (you must turn those options on explicitly).
 * @param {object} cmumpsPatientDiagnosisObject -- input for the translation
 * @param {{participants: boolean, default false, warnings: boolean, default false}} options -- ask for additional processing
 * @returns {{resourceType: 'DiagnosticReport', ... }}
 * @see {http://hl7-fhir.github.io/diagnosticreport.html}
 */
function translateDiagnosesFhir(cmumpsPatientDiagnosisObject, options) {
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for cmumpsPatientDiagnosisObject. The fetcher will get data values from
    // input cmumpsPatientDiagnosisObject, remembering those that actually have values in list participating_properties.
    var fetch1 = Fdt.makeJsonFetcher1(cmumpsPatientDiagnosisObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/diagnosticreport.html:
    // "The diagnostic service returns a "report" which may contain a "narrative" - a written summary of the outcomes, and/or "results" -
    // the individual pieces of atomic data which each are "observations". The results are assembled in "groups" which are nested structures of
    // Observations (traditionally referred to as "panels" or " batteries" by laboratories) that can be used to represent relationships
    // between the individual data items."

    // TODO mike@carif.io: Will I need to group all the cmumps KG_Patient_Diagnosis-100417 objects into a single fhir DiagnosisReport with
    // a list of fhir Observations?

    
    var fhirDiagnoses = simpleTranslate(cmumpsPatientDiagnosisObject);
    
    if (options.participants) Fhir.addParticipants(fhirDiagnoses, participatingProperties);
    if (options.warnings) Fhir.addWarnings(fhirDiagnoses, warnings);
    Fdt.clean(fhirDiagnoses);
    // Additional semantic processing here
    return fhirDiagnoses;
}

module.exports = {
    extractDiagnoses: extractDiagnoses,
    removeDiagnoses: removeDiagnoses,
    resourceType: 'DiagnosticReport',
    translate: simpleTranslate,
    translateDiagnosesFhir: translateDiagnosesFhir
};

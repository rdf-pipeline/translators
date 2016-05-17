/**
 * Translate cmumps Kg_Patient_Diagnosis object to fhir DiagnosticReport resource.
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
    var fetch1 = fdt.makeJsonFetcher1(cmumpsPatientDiagnosisObject, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/diagnosticreport.html:
    // "The diagnostic service returns a "report" which may contain a "narrative" - a written summary of the outcomes, and/or "results" -
    // the individual pieces of atomic data which each are "observations". The results are assembled in "groups" which are nested structures of
    // Observations (traditionally referred to as "panels" or " batteries" by laboratories) that can be used to represent relationships
    // between the individual data items."

    // TODO mike@carif.io: Will I need to group all the cmumps KG_Patient_Diagnosis-100417 objects into a single fhir DiagnosisReport with
    // a list of fhir Observations?

    
    var resourceType = 'DiagnosticReport';
    var fhirDiagnoses = {
        resourceType : resourceType,
        id: fdt.fhirId(resourceType, fetch1('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier : fetch1('$.type', function (t) { return [ fdt.fhirIdentifier(t) ]; }), // type -> identifier
        status: 'final', // R!  registered | partial | final | corrected | appended | cancelled | entered-in-error, http://hl7-fhir.github.io/valueset-diagnostic-report-status.html
        category: fetch1('$.diagnosis-100417', fdt.fhirDiagnosticReportCategory), // Service category
        code: fetch1('$.diagnosis-100417', fdt.fhirCodeableConcept), // R!  Name/Code for this diagnostic report
        subject: fetch1('$.patient-100417', fdt.fhirReferencePatient), // { Reference(Patient|Group|Device|Location) }, // R!  The subject of the report, usually, but not always, the patient
        // encounter: { Reference(Encounter) }, // { Reference(Encounter) }, // Health care event when test ordered
        // effective[x]: Clinically Relevant time/time-period for report. One of these 2:
        effectiveDateTime: fetch1('$.diagnosis-100417.date_of_onset-100417.value', fdt.fhirDate),
        // effectivePeriod: { Period },
        issued: fetch1('$.date_entered-100417'), // R!  DateTime this version was released
        performer: fetch1('$.provider-100417', fhir.fhirPractioner), // { Reference(Practitioner|Organization) }, // R!  Responsible Diagnostic Service
        // request: [{ Reference(DiagnosticOrder|ProcedureRequest|ReferralRequest) }], // What was requested
        // specimen: [{ Reference(Specimen) }], // Specimens this report is based on
        // result: [{ Reference(Observation) }], // Observations - simple, or complex nested groups
        // imagingStudy: [{ Reference(ImagingStudy|ImagingObjectSelection) }], // Reference to full details of imaging associated with the diagnostic report
        // image: [{ // Key images associated with this report
        // comment: "<string>", // Comment about the image (e.g. explanation)
        // link: { Reference(Media) } // R!  Reference to the image source
        conclusion: fetch1('$.diagnosis-100417'), // Clinical Interpretation of test results
        codedDiagnosis: fetch1('$.diagnosis-100417', fdt.fhirCodeableConcept), // Codes for the conclusion
        presentedForm: [cmumpsPatientDiagnosisObject] // Entire report as issued
    };

    if (options.participants) fhir.addParticipants(fhirDiagnoses, participatingProperties);
    if (options.warnings) fhir.addWarnings(fhirDiagnoses, warnings);
    fdt.clean(fhirDiagnoses);
    // Additional semantic processing here
    return fhirDiagnoses;
}

// short form
var translate = translateDiagnosesFhir;

[translateDiagnosesFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

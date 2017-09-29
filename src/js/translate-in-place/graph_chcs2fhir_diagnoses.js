/**
 * Translate chcs Kg_Patient_Diagnosis object to fhir DiagnosticReport resource.
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
 * Translate chcs Kg_Patient_Diagnosis object to fhir DiagnosticReport resource. Optionally you can track which
 * input fields participated in the translation and an warnings along the way (you must turn those options on explicitly).
 * @param {object} chcsPatientDiagnosisObjectModified -- input for the translation
 * @param {{policy: boolean, warnings: boolean, eat: boolean}} [_options={policy: false, warnings: false, eat: true}]
 * @returns {{resourceType: 'DiagnosticReport', ... }}
 * @see {http://hl7-fhir.github.io/diagnosticreport.html}
 */
function translateDiagnosesFhir(chcsPatientDiagnosisObjectModified, _options, prefix) {
    // Assign the default options, then override what the caller wants. At the end you have the right options.
    var options = {
        warnings: false, 
        policy: false, 
        eat: true
    };
    for (k in _options) {
        if (_options.hasOwnProperty(k)) { options[k] = _options[k]; }
    }

    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Create a fetcher for chcsPatientDiagnosisObject. The fetcher will get data values from
    // input chcsPatientDiagnosisObject, remembering those that actually have values in list participating_properties.
    // var fetch1 = fdt.peek(chcsPatientDiagnosisObjectModified, participatingProperties);
    var peek = fdt.peek(chcsPatientDiagnosisObjectModified, participatingProperties);
    var eat = fdt.eat(chcsPatientDiagnosisObjectModified, participatingProperties);
    // fetch1(json_pattern[, transformation])

    // http://hl7-fhir.github.io/diagnosticreport.html:
    // "The diagnostic service returns a "report" which may contain a "narrative" - a written summary of the outcomes, and/or "results" -
    // the individual pieces of atomic data which each are "observations". The results are assembled in "groups" which are nested structures of
    // Observations (traditionally referred to as "panels" or " batteries" by laboratories) that can be used to represent relationships
    // between the individual data items."

    // TODO mike@carif.io: Will I need to group all the chcs KG_Patient_Diagnosis-100417 objects into a single fhir DiagnosisReport with
    // a list of fhir Observations?

    
    var resourceType = 'DiagnosticReport';
    var fhirDiagnoses = {
        resourceType : resourceType,
        id: fdt.fhirId(resourceType, eat('$._id')),
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier : eat('$.type', function (t) { return [ fdt.fhirIdentifier(t) ]; }), // type -> identifier
        status: 'final', // R!  registered | partial | final | corrected | appended | cancelled | entered-in-error, http://hl7-fhir.github.io/valueset-diagnostic-report-status.html
        category: peek('$.diagnosis-100417', fdt.fhirDiagnosticReportCategory), // Service category
        code: peek('$.diagnosis-100417', fdt.fhirCodeableConcept), // R!  Name/Code for this diagnostic report
        subject: eat('$.patient-100417', fdt.fhirReferencePatient), // { Reference(Patient|Group|Device|Location) }, // R!  The subject of the report, usually, but not always, the patient
        // encounter: { Reference(Encounter) }, // { Reference(Encounter) }, // Health care event when test ordered
        // effective[x]: Clinically Relevant time/time-period for report. One of these 2:
        effectiveDateTime: eat('$.diagnosis-100417.date_of_onset-100417.value', fdt.fhirDate),
        // effectivePeriod: { Period },
        issued: eat('$.date_entered-100417'), // R!  DateTime this version was released
        performer: eat('$.provider-100417', fhir.fhirPractioner), // { Reference(Practitioner|Organization) }, // R!  Responsible Diagnostic Service
        // request: [{ Reference(DiagnosticOrder|ProcedureRequest|ReferralRequest) }], // What was requested
        // specimen: [{ Reference(Specimen) }], // Specimens this report is based on
        // result: [{ Reference(Observation) }], // Observations - simple, or complex nested groups
        // imagingStudy: [{ Reference(ImagingStudy|ImagingObjectSelection) }], // Reference to full details of imaging associated with the diagnostic report
        // image: [{ // Key images associated with this report
        // comment: "<string>", // Comment about the image (e.g. explanation)
        // link: { Reference(Media) } // R!  Reference to the image source
        conclusion: peek('$.diagnosis-100417'), // Clinical Interpretation of test results
        codedDiagnosis: eat('$.diagnosis-100417', fdt.fhirCodeableConcept), // Codes for the conclusion
        presentedForm: [chcsPatientDiagnosisObjectModified] // Entire report as issued
    };

    if (options.participants) fhir.addParticipants(fhirDiagnoses, participatingProperties, prefix);
    if (options.warnings) fhir.addWarnings(fhirDiagnoses, warnings);

    // Remove keys that have undefined/null/[] values.
    fdt.clean(fhirDiagnoses);
    // Additional semantic processing here

    // var used = new Av();
    // participatingProperties.forEach(function (p) {
    //     var prop = p.substring(1);
    //     eval('used' + prop + '= chcsPatientDiagnosisObjectModified' + prop);
    // });
    // var object_used = chcs_utils.devivify(used);
    
    // if (options.eat) {
    //     participatingProperties.forEach(function(p){
    //         var prop = p.substring(1);
    //         eval('delete chcsPatientDiagnosisObjectModified' + prop);
    //     });
    // }

    return {
        // used: object_used, 
        fhir: fhirDiagnoses,
        participants: participatingProperties,
        options: options};
}

// short form
var translate = translateDiagnosesFhir;

[translateDiagnosesFhir, translate].forEach(function(f) { module.exports[f.name] = f; });

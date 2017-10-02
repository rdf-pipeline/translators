/**
 * Translate an entire chcs object to a fhir bundle.
 */

const _ = require('underscore');
const Format = require('string-format');

const Fhir = require('./fhir');
const Fdt = require('./chcs2fhir_datatypes');

// for each piece
const Demographics = require('./chcs2fhir_demographics');
const Prescriptions = require('./chcs2fhir_prescriptions');
const Labs = require('./chcs2fhir_labs');
const Diagnoses = require('./chcs2fhir_diagnoses');
const Procedures = require('./chcs2fhir_procedures');
const Chcs_utils = require('./util/chcs_utils');


/**
 * Given a chcs jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} chcsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the fhir translation and a bundle containing a "composition".
 */
function translateChcsFhir(chcsJsonldObject, options, date) {
    // If the caller is confused an passes an array of chcsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(chcsJsonldObject)) {
        // return translateHelper(chcsJsonldObject[0]);
        return chcsJsonldObject.map(function(i) {return translateChcsFhirHelper(i, options, date); })
    } else {
        // A single object, translate it.
        return translateChcsFhirHelper(chcsJsonldObject, options, date);
    }
}


/**
 * translateHelper is the real function, it expects a *single* chcs object.
 * and returns the translation.
 * @param {object} chcsJsonldObject -- the input
 * @param {participants: boolean, warnings: boolean} options
 * @param {string} date -- use this date instead of now(). Useful to diff output.
 * @returns {{resourceType: string, type: string, entry: *[]}}
 */
function translateChcsFhirHelper(chcsJsonldObject, options, date) {

    var options = Chcs_utils.merge(options, {participants: false, warnings: false, policy: false});

    // Check policy?
    if (options.policy) {
        // Make sure you're receiving a translatable object
        if (!_.has(chcsJsonldObject, '@graph')) throw new Error("No expected field '@graph'.");
        if (!_.isArray(chcsJsonldObject['@graph'])) throw new Error("Expecting an array value for '@graph'");
        if (chcsJsonldObject['@graph'].length == 0) throw new Error("Field '@graph' contains no value.");
    }
    var date = date || Fhir.now();
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Check the input.
    // Using jsonpath, select the demographics fhirParts of @graph.
    var theDemographics = Demographics.extractDemographics(chcsJsonldObject);
    if (options.policy && theDemographics.length < 1) {
        throw new Error("Expecting a patient, none found.");
    }
    if (options.policy && theDemographics.length > 1) {
        throw new Error(Format("Expecting only one patient, {l} found.", {l: theDemographics}));
    }
    // Here: only one patient


    // In this next sequence of code, we try to translate each part.
    // We immediately throw an error if we can't translate a part, to simplify debugging.
    // But we will miss input with multiple errors. Also, since the input can potentially be
    // miss formed in many ways and almost all input fields are optional, the test cases
    // can spiral out of control, so we turn off coverage there.

    // chcs Patient-2
    var fhirDemographicsTranslation;
    if (theDemographics.length) {
        try {
            fhirDemographicsTranslation = Demographics.translateDemographicsFhir(theDemographics[0], options);
        } catch (err) {
            throw new Error("Can't translate demographics, " + err);
        }
    }

    // chcs Prescription-52
    var thePrescriptions = Prescriptions.extractPrescriptions(chcsJsonldObject);
    var fhirPrescriptionTranslations = thePrescriptions.map(function(i) {
        try {
            return Prescriptions.translatePrescriptionsFhir(i, options);
        } catch (err) {
            throw new Error("Can't translate a prescription, " + err);
        }
    });

    // chcs Lab_Results-63 will be handled elsewhere, we don't "know" how to do them.
    var theLabs = Labs.extractLabs(chcsJsonldObject);
    var fhirLabResultTranslations = theLabs.map(function(i) {
        try {
             return Labs.translateLabsFhir(i, options);
        } catch (err) {
             throw new Error("Can't translate lab " + err);
         }
    });

    // chcs Kg_Patient_Diagnosis-100417
    var theDiagnoses = Diagnoses.extractDiagnoses(chcsJsonldObject);
    var fhirDiagnosticReportTranslations = theDiagnoses.map(function (diagnosis) {
        try {
            return Diagnoses.translateDiagnosesFhir(diagnosis, options);
        } catch (err) {
            throw new Error("Can't translate diagnosis " + diagnosis._id + ' ' + err);
        }
    });

    // chcs Procedures
    // TODO mike@carif.io: Procedures will come from alhta20, a different database. Details tbs.
    var theProcedures = Procedures.extractProcedures(chcsJsonldObject);
    var fhirProcedureTranslations = theProcedures.map(function (procedure) {
        try {
            return Procedures.translateProceduresFhir(procedure, options);
        } catch (err) {
            throw new Error("Can't translate a procedure, " + err);
        }
    });

    // Build up a list of translated resources. This will populate the 'resource'
    // attributed of a fhir 'Composition' resource.
    var resources = [ fhirDemographicsTranslation ];

    // Add each translation part iff there's a translation to add.
    // TODO mike@carif.io: splice should work here?
    fhirPrescriptionTranslations.forEach(function(i) {resources.push(i); });
    // fhirLabResultTranslations.forEach(function(i) {resources.push(i); });
    fhirDiagnosticReportTranslations.forEach(function(i) {resources.push(i); });
    fhirProcedureTranslations.forEach(function(i) {resources.push(i); });

    // Add any warnings about this bundle.
    if (options.warnings) Fhir.addWarnings(resources, warnings);

    // A fhir bundle is a top-level resource. It can be signed (aka sha1 or md5).
    // XML translation expects a "top level" object to chcs2fhir_all.
    var bundle = {
        resourceType: 'Bundle', // The chcs translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date, // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: Fdt.fhirCodeableConcept('chcs'), // ... originating with chcs ...
            resource: resources // ... with these translated elements
        }]
    };

    Fdt.clean(bundle); // remove keys that have no useful values
    return bundle;
}


module.exports = {
    translate: translateChcsFhir,
    translateChcsFhir: translateChcsFhir 
};

/**
 * Translate an entire cmumps object to a fhir bundle.
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

// for each piece
var demographics = require('./cmumps2fhir_demographics');
var prescriptions = require('./cmumps2fhir_prescriptions');
var labs = require('./cmumps2fhir_labs');
var diagnoses = require('./cmumps2fhir_diagnoses');
var procedures = require('./cmumps2fhir_procedures');
var cmumps_utils = require('./util/cmumps_utils');




/**
 * Given a cmumps jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} cmumpsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the fhir translation and a bundle containing a "composition".
 */


function translatecmumpsFhir(cmumpsJsonldObject, options, date) {
    // If the caller is confused an passes an array of cmumpsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(cmumpsJsonldObject)) {
        // return translateHelper(cmumpsJsonldObject[0]);
        cmumpsJsonldObject.map(function(i) {return translatecmumpsFhirHelper(i, options, date); })
    } else {
        // A single object, translate it.
        return translatecmumpsFhirHelper(cmumpsJsonldObject, options, date);
    }
}


/**
 * translateHelper is the real function, it expects a *single* cmumps object.
 * and returns the translation.
 * @param {object} cmumpsJsonldObject -- the input
 * @param {participants: boolean, warnings: boolean} options
 * @param {string} date -- use this date instead of now(). Useful to diff output.
 * @returns {{resourceType: string, type: string, entry: *[]}}
 */
function translatecmumpsFhirHelper(cmumpsJsonldObject, options, date) {

    var options = cmumps_utils.merge(options, {participants: false, warnings: false, policy: false});

    // Check policy?
    if (options.policy) {
        // Make sure you're receiving a translatable object
        if (!_.has(cmumpsJsonldObject, '@graph')) throw new Error("No expected field '@graph'.");
        if (!_.isArray(cmumpsJsonldObject['@graph'])) throw new Error("Expecting an array value for '@graph'");
        if (cmumpsJsonldObject['@graph'].length == 0) throw new Error("Field '@graph' contains no value.");
    }
    var date = date || fhir.now();
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Check the input.
    // Using JSONPath, select the demographics fhirParts of @graph.
    var theDemographics = JSONPath(pattern(cmumpss.Patient), cmumpsJsonldObject);
    if (options.policy && theDemographics.length < 1) {
        throw new Error("Expecting a patient, none found.");
    }
    if (options.policy && theDemographics.length > 1) {
        throw new Error(format("Expecting only one patient, {l} found.", {l: theDemographics}));
    }
    // Here: only one patient

    // cmumps Patient-2
    var fhirDemographicsTranslation;
    if (theDemographics.length) {
        try {
            fhirDemographicsTranslation = demographics.translateDemographicsFhir(theDemographics[0], options);
        } catch (err) {
            throw new Error("Can't translate demographics, " + err);
        }
    }

    // cmumps Prescription-52
    var thePrescriptions = JSONPath(pattern(cmumpss.Prescription), cmumpsJsonldObject);
    var fhirPrescriptionTranslations = thePrescriptions.map(function(i) {
        try {
            return prescriptions.translatePrescriptionsFhir(i, options);
        } catch (err) {
            throw new Error("Can't translate a prescription, " + err);
        }
    });

    // cmumps Lab_Results-63 CURRENTLY HANDLED BY SHEX
    // var theLabs = JSONPath(pattern(cmumpss.Lab_Result), cmumpsJsonldObject);
    // var fhirLabResultTranslations = theLabs.map(function(i) {
    //     tries {
    //         return labs.translateLabsFhir(i, options);
    //     } catch (err) {
    //         throw new Error("Can't translate lab " + err);
    //     }
    // });

    // cmumps Kg_Patient_Diagnosis-100417
    var theDiagnoses = JSONPath(pattern(cmumpss.Kg_Patient_Diagnosis), cmumpsJsonldObject);
    var fhirDiagnosticReportTranslations = theDiagnoses.map(function (i) {
        try {
            return diagnoses.translateDiagnosesFhir(i, options);
        } catch (err) {
            throw new Error("Can't translate a diagnoses, " + err);
        }
    });

    // cmumps Procedures
    // TODO mike@carif.io: Procedures will come from alhta20, a different database. Details tbs.
    var theProcedures = JSONPath(cmumps.jsonPattern(cmumpss.Procedure), cmumpsJsonldObject);
    var fhirProcedureTranslations = theProcedures.map(function (i) {
        try {
            return procedures.translateProceduresFhir(i, options);
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
    if (options.warnings) fhir.addWarnings(resources, warnings);

    // A fhir bundle is a top-level resource. It can be signed (aka sha1 or md5).
    // XML translation expects a "top level" object to cmumps2fhir_all.
    var bundle = {
        resourceType: 'Bundle', // The cmumps translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date, // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: fdt.fhirCodeableConcept('cmumps'), // ... originating with cmumps ...
            resource: resources // ... with these translated elements
        }]
    };


    fdt.clean(bundle); // remove keys that have no useful values
    return bundle;
}

// TODO mike@carif.io: this got folded into translatecmumpsFhir above.
function translatecmumpsFhirArray(cmumpsJsonldObjectArray, options) {
    return cmumpsJsonldObjectArray.map(function(i) { return translatecmumpsFhir(i, options); });
}

// short form
var translate = translatecmumpsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translatecmumpsFhir, translatecmumpsFhirArray, translate].forEach(function(f) { module.exports[f.name] = f; });

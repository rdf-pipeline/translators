/**
 * Translate an entire cmumps object to a sd bundle.
 */

'use strict';
var prefix = '../translate/';
var cmumps = require(prefix + 'cmumps');
// Abbreviations to shorten functions
var pattern = cmumps.cmumpssJsonPattern;
var cmumpss = cmumps.cmumpss;
var sd = require('./sd');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require('./cmumps2sd_datatypes');

// for each piece
var demographics = require('./cmumps2sd_demographics');
var prescriptions = require('./cmumps2sd_prescriptions');
var labs = require('./cmumps2sd_labs');
var diagnoses = require('./cmumps2sd_diagnoses');
var procedures = require('./cmumps2sd_procedures');
var cmumps_utils = require('./util/cmumps_utils');




/**
 * Given a cmumps jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} cmumpsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the sd translation and a bundle containing a "composition".
 */


function translatecmumpssd(cmumpsJsonldObject, options, date) {
    // If the caller is confused an passes an array of cmumpsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(cmumpsJsonldObject)) {
        // return translateHelper(cmumpsJsonldObject[0]);
        cmumpsJsonldObject.map(function(i) {return translatecmumpssdHelper(i, options, date); })
    } else {
        // A single object, translate it.
        return translatecmumpssdHelper(cmumpsJsonldObject, options, date);
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
function translatecmumpssdHelper(cmumpsJsonldObject, options, date) {

    var options = cmumps_utils.merge(options, {participants: false, warnings: false, policy: false});

    // Check policy?
    if (options.policy) {
        // Make sure you're receiving a translatable object
        if (!_.has(cmumpsJsonldObject, '@graph')) throw new Error("No expected field '@graph'.");
        if (!_.isArray(cmumpsJsonldObject['@graph'])) throw new Error("Expecting an array value for '@graph'");
        if (cmumpsJsonldObject['@graph'].length == 0) throw new Error("Field '@graph' contains no value.");
    }
    var date = date || sd.now();
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet

    // Check the input.
    // Using JSONPath, select the demographics sdParts of @graph.
    var theDemographics = JSONPath(pattern(cmumpss.Patient), cmumpsJsonldObject);
    if (options.policy && theDemographics.length < 1) {
        throw new Error("Expecting a patient, none found.");
    }
    if (options.policy && theDemographics.length > 1) {
        throw new Error(format("Expecting only one patient, {l} found.", {l: theDemographics}));
    }
    // Here: only one patient

    // cmumps Patient-2
    var sdDemographicsTranslation;
    if (theDemographics.length) {
        try {
            sdDemographicsTranslation = demographics.translateDemographicssd(theDemographics[0], options);
        } catch (err) {
            throw new Error("Can't translate demographics, " + err);
        }
    }

    // cmumps Prescription-52
    var thePrescriptions = JSONPath(pattern(cmumpss.Prescription), cmumpsJsonldObject);
    var sdPrescriptionTranslations = thePrescriptions.map(function(i) {
        try {
            return prescriptions.translatePrescriptionssd(i, options);
        } catch (err) {
            throw new Error("Can't translate a prescription, " + err);
        }
    });

    // cmumps Lab_Results-63 CURRENTLY HANDLED BY SHEX
    // var theLabs = JSONPath(pattern(cmumpss.Lab_Result), cmumpsJsonldObject);
    // var sdLabResultTranslations = theLabs.map(function(i) {
    //     tries {
    //         return labs.translateLabssd(i, options);
    //     } catch (err) {
    //         throw new Error("Can't translate lab " + err);
    //     }
    // });

    // cmumps Kg_Patient_Diagnosis-100417
    var theDiagnoses = JSONPath(pattern(cmumpss.Kg_Patient_Diagnosis), cmumpsJsonldObject);
    var sdDiagnosticReportTranslations = theDiagnoses.map(function (i) {
        try {
            return diagnoses.translateDiagnosessd(i, options);
        } catch (err) {
            throw new Error("Can't translate a diagnoses, " + err);
        }
    });

    // cmumps Procedures
    // TODO mike@carif.io: Procedures will come from alhta20, a different database. Details tbs.
    var theProcedures = JSONPath(cmumps.jsonPattern(cmumpss.Procedure), cmumpsJsonldObject);
    var sdProcedureTranslations = theProcedures.map(function (i) {
        try {
            return procedures.translateProceduressd(i, options);
        } catch (err) {
            throw new Error("Can't translate a procedure, " + err);
        }
    });



    // Build up a list of translated resources. This will populate the 'resource'
    // attributed of a sd 'Composition' resource.
    var resources = [ sdDemographicsTranslation ];

    // Add each translation part iff there's a translation to add.
    // TODO mike@carif.io: splice should work here?
    sdPrescriptionTranslations.forEach(function(i) {resources.push(i); });
    // sdLabResultTranslations.forEach(function(i) {resources.push(i); });
    sdDiagnosticReportTranslations.forEach(function(i) {resources.push(i); });
    sdProcedureTranslations.forEach(function(i) {resources.push(i); });

    // Add any warnings about this bundle.
    if (options.warnings) sd.addWarnings(resources, warnings);

    // A sd bundle is a top-level resource. It can be signed (aka sha1 or md5).
    // XML translation expects a "top level" object to cmumps2sd_all.
    var bundle = {
        resourceType: 'Bundle', // The cmumps translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date, // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: fdt.sdCodeableConcept('cmumps'), // ... originating with cmumps ...
            resource: resources // ... with these translated elements
        }]
    };


    fdt.clean(bundle); // remove keys that have no useful values
    return bundle;
}

// TODO mike@carif.io: this got folded into translatecmumpssd above.
function translatecmumpssdArray(cmumpsJsonldObjectArray, options) {
    return cmumpsJsonldObjectArray.map(function(i) { return translatecmumpssd(i, options); });
}

// short form
var translate = translatecmumpssd;

// Export the actual functions here. Make sure the names are always consistent.
[translatecmumpssd, translatecmumpssdArray, translate].forEach(function(f) { module.exports[f.name] = f; });

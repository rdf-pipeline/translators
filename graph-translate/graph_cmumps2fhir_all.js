/**
 * Translate an entire cmumps object to a fhir bundle.
 */

var prefix = '../translate/';
var cmumps = require(prefix + 'cmumps');
// Abbreviations to shorten functions
var pattern = cmumps.cmumpssSimpleJsonPattern;
var cmumpss = cmumps.cmumpss;
var fhir = require(prefix + 'fhir');
var _ = require('underscore');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var assert = require('assert');
var fdt = require(prefix + 'cmumps2fhir_datatypes');
var cmumps_utils = require(prefix + 'util/cmumps_utils');

// for each piece
var siblings = './';
var demographics = require(siblings + 'graph_cmumps2fhir_demographics');
var prescriptions = require(siblings + 'graph_cmumps2fhir_prescriptions');
var labs = require(siblings + 'graph_cmumps2fhir_labs');
var diagnoses = require(siblings + 'graph_cmumps2fhir_diagnoses');
var procedures = require(siblings + 'graph_cmumps2fhir_procedures');
var Av = require('autovivify');


/**
 * Given a cmumps jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} cmumpsJsonldObjectModified -- input jsonld object containing an "@graph" key. THE PARAM IS (POTENTIALLY) MODIFIED IFF options.modified == true.
 * @param {object} cmumpsJsonldObjectModified['@graph'][] -- actual content to translate
 * @param {{policy: boolean, warnings: boolean, modified: boolean}} [options={policy: false, warnings: false, modified: false}] -- the options applied during the translation, policy: true
 *   enforces a translation policy, warnings: true adds an array of warnings to to the fhir result.
 * @param {(Date|string)} [date=Date.now()] -- the date to use for the translation. use string 'now' for reproduceable unit testing.
 * @returns {{used: object, fhir: object, options: object}} --  .used is the "subtree" in @graph[**] that generated the translation, .fhir
 * is the translation, a bundle containing a "Composition", .options is what options were actually used for the translation.
 * @see {@link https://hl7-fhir.github.io/composition.html)}
 */

function translatecmumpsFhir(cmumpsJsonldObjectModified, options, date) {
    // If the caller is confused and passes an array of cmumpsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track. TODO: add warning to result.
    if (_.isArray(cmumpsJsonldObjectModified)) {
        // return translateHelper(cmumpsJsonldObject[0]);
        return cmumpsJsonldObjectModified.map(function (i) {
            return translatecmumpsFhirHelper(i, options, date);
        })
    } else {
        // A single object, translate it.
        return translatecmumpsFhirHelper(cmumpsJsonldObjectModified, options, date);
    }
}


/**
 * translateHelper is the real function, it expects a *single* cmumps object. All parameters are as @see translatecmumpsFhir.
 */
function translatecmumpsFhirHelper(cmumpsJsonldObjectModified, _options, date) {

    var here = module.filename + ':' + arguments.callee.toString().match(/function\s+([^\s\(]+)/)[1];

    if (cmumpsJsonldObjectModified == undefined) {
        throw new Error(here + ": Expecting a cmumps object, received 'undefined'.");
    }

    // Assign the default options, then override what the caller wants. At the end you have the right options.
    var options = {
        warnings: false,
        policy: false,
        eat: true
    };
    for (k in _options) {
        if (_options.hasOwnProperty(k)) {
            options[k] = _options[k];
        }
    }

    var eat = options.eat;
    options.eat = false;

    // Enforce policy?
    if (options.policy) {
        // Caller wants you to make sure you're receiving a translatable object.
        if (!_.has(cmumpsJsonldObjectModified, '@graph')) throw new Error("Missing expected key '@graph'.");
        if (!_.isArray(cmumpsJsonldObjectModified['@graph'])) throw new Error("Expecting an array value for key '@graph'.");
        if (cmumpsJsonldObjectModified['@graph'].length == 0) throw new Error("Expecting nonempty array for key '@graph'.");
    }
    // Here: cmumpsJsonldObjectModified['@graph'] has contents. Translate it.

    var date = date || fhir.now();
    var participatingProperties = []; // no participants yet
    var warnings = []; // no warnings yet


    // Check the input, get a patient.
    // Using JSONPath, select the demographics fhirParts of @graph.
    var allDemographics, theDemographics;
    try {
        var thePattern = pattern(cmumpss.Patient); //pattern(cmumpss.Patient);
        allDemographics = JSONPath({resultType: 'all', path: thePattern, json: cmumpsJsonldObjectModified});
    } catch (err) {
        throw new Error(here + ": Can't match the patient ..." + err);
    }
    if (_.isArray(allDemographics)) {
        if (options.policy && allDemographics.length < 1) {
            throw new Error(here + ": No Patient-2 found.");
        } else if (options.policy && allDemographics.length > 1) {
            throw new Error(here + ": Many Patient-2's found.");
        }
        theDemographics = allDemographics.length > 0 ? allDemographics[0] : {used: {}, fhir: undefined, participants: [], options: options};
    } else {
        theDemographics = {used: {}, fhir: undefined, participants: [], options: options};
    }


    if (options.policy && theDemographics.value == undefined) {
        throw new Error(here + ": Expecting a patient, none found.");
    } else if (theDemographics.value == undefined) {
        warnings.push(here + ": Expecting a patient, none found.");
    }
    // Here: The patient was found in @graph

    // cmumps Patient-2
    var fhirDemographicsTranslation;
    if (theDemographics.value) {
        try {
            fhirDemographicsTranslation = demographics.translateDemographicsFhir(theDemographics.value, options);
            Array.prototype.push.apply(participatingProperties, fhirDemographicsTranslation.participants.map(function(p) {
                return theDemographics.path + p.substring(1);
            }));
        } catch (err) {
            throw new Error(here + ": Can't translate demographics, " + err);
        }
    }


    // cmumps Prescription-52
    var thePrescriptions;
    try {
        var thePattern = pattern(cmumpss.Prescription); // pattern(cmumpss.Prescription)
        thePrescriptions = JSONPath({
            resultType: 'all',
            path: thePattern,
            json: cmumpsJsonldObjectModified
        });
    } catch (err) {
        throw new Error(here + ": Can't match the prescriptions, " + err);
    }

    var fhirPrescriptionTranslations = thePrescriptions.map(function (i) {
        try {
            var result = prescriptions.translatePrescriptionsFhir(i.value, options);
            Array.prototype.push.apply(participatingProperties, result.participants.map(function(p) {
                return i.path + p.substring(1);
            }));
            return result;
        } catch (err) {
            throw new Error(here + ": Can't translate perscription, " + err);
        }
    });


    // cmumps Lab_Results-63 CURRENTLY HANDLED BY SHEX
    // var theLabs = JSONPath(pattern(cmumpss.Lab_Result), cmumpsJsonldObject);
    // var fhirLabResultTranslations = theLabs.map(function(i) {
    //     try {
    //         return labs.translateLabsFhir(i, options);
    //     } catch (err) {
    //         throw new Error("Can't translate lab " + err);
    //     }
    // });

    // cmumps Kg_Patient_Diagnosis-100417
    var theDiagnoses;
    try {
        var thePattern = pattern(cmumpss.Kg_Patient_Diagnosis); //pattern(cmumpss.Kg_Patient_Diagnosis)
        theDiagnoses = JSONPath({
            resultType: 'all',
            path: thePattern,
            json: cmumpsJsonldObjectModified
        });
    } catch (err) {
        throw new Error(here + ": Can't match the diagnoses, " + err);
    }

    var fhirDiagnosticReportTranslations = theDiagnoses.map(function (i) {
        try {
            var result = diagnoses.translateDiagnosesFhir(i.value, options);
            Array.prototype.push.apply(participatingProperties, result.participants.map(function(p) {
                return i.path + p.substring(1);
            }));
            return result;
        } catch (err) {
            throw new Error(here + ": Can't translate diagnoses, " + err);
        }
    });





    // cmumps Procedures
    // TODO mike@carif.io: Procedures will come from alhta20, a different database. Details tbs.
    var theProcedures;
    try {
        var thePattern = "$['@graph'][?(@.type=='Procedure')]"; // pattern(cmumpss.Procedure)
        theProcedures = JSONPath({
            resultType: 'all',
            path: thePattern,
            json: cmumpsJsonldObjectModified}
        );
    } catch (err) {
        throw new Error(here + ": Can't match the procedures, " + err);
    }

    var fhirProcedureTranslations = theProcedures.map(function (i) {
        try {
            var result = procedures.translateProceduresFhir(i.value, options);
            Array.prototype.push.apply(participatingProperties, result.participants.map(function(p) {
                return i.path + p.substring(1);
            }));
            return result;
        } catch (err) {
            throw new Error(here + ": Can't translate procedures, " + err);
        }
    });

    // Build up a list of translated resources. This will populate the 'resource'
    // attributed of a fhir 'Composition' resource.
    var resources = [];
    var used = {};
    if (fhirDemographicsTranslation && _.has(fhirDemographicsTranslation, 'fhir')) {
        resources.push(fhirDemographicsTranslation.fhir);
    }

    // Add each translation part iff there's a translation to add.
    // TODO mike@carif.io: splice should work here?
    fhirPrescriptionTranslations.forEach(function (i) {
        if (_.has(i, 'fhir') && i.fhir) {
            resources.push(i.fhir);
        }
        // if (_.has(i, 'used')) _.extend(used, i.used);
    });
    // fhirLabResultTranslations.forEach(function(i) {resources.push(i); });
    fhirDiagnosticReportTranslations.forEach(function (i) {
        if (_.has(i, 'fhir') && i.fhir) {
            resources.push(i.fhir);
        }
        // if (_.has(i, 'used')) _.extend(used, i.used);
    });
    fhirProcedureTranslations.forEach(function (i) {
        if (_.has(i, 'fhir') && i.fhir) {
            resources.push(i.fhir);
        }
        // if (_.has(i, 'used')) _.extend(used, i.used);
    });

    // Add any warnings about this bundle.
    if (options.warnings) fhir.addWarnings(resources, warnings);

    // A fhir bundle is a top-level resource. It can be signed (aka sha1 or md5).
    // XML translation expects a "top level" object to graph_cmumps2fhir_all.
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

    // var used = new Av();
    // participatingProperties.forEach(function (p) {
    //     var prop = p.substring(1);
    //     eval('used' + prop + '= cmumpsJsonldObjectModified' + prop);
    // });
    //
    //
    // var object_used = cmumps_utils.devivify(used);
    // object_used['@context']= cmumpsJsonldObjectModified['@context'];

    // "Eating" the input means removing it from the input object cmumpsJsonldObjectModified
    // at a fine grain level.
    // if (eat) {
    //     participatingProperties.forEach(function(p){
    //         var prop = p.substring(1);
    //         var deleteExpression = 'var result = delete cmumpsJsonldObjectModified' + prop + ';';
    //         eval(deleteExpression); // TODO: doesn't delete
    //         return result;
    //     });
    // }

    // fdt.clean(bundle); // remove keys that have no useful values
    return {
        // used: object_used,
        fhir: bundle,
        participants: participatingProperties,
        options: options
    };
}

// TODO mike@carif.io: this got folded into translatecmumpsFhir above.
function translatecmumpsFhirArray(cmumpsJsonldObjectArray, options) {
    return cmumpsJsonldObjectArray.map(function (i) {
        return translatecmumpsFhir(i, options);
    });
}

// short form
var translate = translatecmumpsFhir;

// Export the actual functions here. Make sure the names are always consistent.
[translatecmumpsFhir, translatecmumpsFhirArray, translate].forEach(function (f) {
    module.exports[f.name] = f;
});

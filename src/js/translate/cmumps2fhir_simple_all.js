/**
 * Translate an entire cmumps object to a fhir bundle.
 */

const _ = require('underscore');

const Fhir = require('./fhir');
const Fdt = require('./cmumps2fhir_datatypes');

// for each piece
const Demographics = require('./cmumps2fhir_demographics');
const Prescriptions = require('./cmumps2fhir_prescriptions');
// const Labs = require('./cmumps2fhir_labs');
const Diagnoses = require('./cmumps2fhir_diagnoses');
const Procedures = require('./cmumps2fhir_procedures');

/**
 * Given a cmumps jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} cmumpsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the fhir translation and a bundle containing a "composition".
 */
function translate(cmumpsJsonldObject, date, token) {
    var token = token || 'cmumpss'
    // If the caller is confused an passes an array of cmumpsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(cmumpsJsonldObject)) {
        return cmumpsJsonldObject.map(function(i) {return translateHelper(i, date, token); })
    } else {
        // A single object, translate it.
        return translateHelper(cmumpsJsonldObject, date, token);
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
function translateHelper(cmumpsJsonldObject, date, token) {

    return Fdt.clean({
        resourceType: 'Bundle', // The cmumps translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date || Fhir.now(), // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: Fdt.fhirCodeableConcept('cmumps'), // ... originating with cmumps ...
            resource: Array.prototype.concat(
                [ Demographics.translate(Demographics.extractDemographics(cmumpsJsonldObject)[0]) ],
                  Prescriptions.extractPrescriptions(cmumpsJsonldObject).map(Prescriptions.translate),
                  Diagnoses.extractDiagnoses(cmumpsJsonldObject).map(Diagnoses.translate),
                  Procedures.extractProcedures(cmumpsJsonldObject).map(Procedures.translate)
            )
        }]
    });
}

// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

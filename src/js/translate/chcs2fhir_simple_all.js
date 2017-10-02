/**
 * Translate an entire chcs object to a fhir bundle.
 */

const _ = require('underscore');

const Fhir = require('./fhir');
const Fdt = require('./chcs2fhir_datatypes');

// for each piece
const Demographics = require('./chcs2fhir_demographics');
const Prescriptions = require('./chcs2fhir_prescriptions');
// const Labs = require('./chcs2fhir_labs');
const Diagnoses = require('./chcs2fhir_diagnoses');
const Procedures = require('./chcs2fhir_procedures');

/**
 * Given a chcs jsonld object (containing both @context and @graph), return its translation section by section.
 * The sections are 'demographics', 'prescriptions', etc.
 *
 * @param {object} chcsJsonldObject -- input jsonld object containing an "@graph" key.
 * @returns {object} - the fhir translation and a bundle containing a "composition".
 */
function translate(chcsJsonldObject, date, token) {
    var token = token || 'chcss'
    // If the caller is confused an passes an array of chcsJsonldObjects, return the array of translations.
    // This way the caller doesn't have to keep track.
    if (_.isArray(chcsJsonldObject)) {
        return chcsJsonldObject.map(function(i) {return translateHelper(i, date, token); })
    } else {
        // A single object, translate it.
        return translateHelper(chcsJsonldObject, date, token);
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
function translateHelper(chcsJsonldObject, date, token) {

    return Fdt.clean({
        resourceType: 'Bundle', // The chcs translation is a "bundle" ...
        type: 'document', // ... composed at moment in time...
        entry: [{
            resourceType: 'Composition',
            date: date || Fhir.now(), // ... which is now ...
            title: module.name, // ... entited the name of this module ...
            status: 'final',
            subject: arguments.callee,
            type: Fdt.fhirCodeableConcept('chcs'), // ... originating with chcs ...
            resource: Array.prototype.concat(
                [ Demographics.translate(Demographics.extractDemographics(chcsJsonldObject)[0]) ],
                  Prescriptions.extractPrescriptions(chcsJsonldObject).map(Prescriptions.translate),
                  Diagnoses.extractDiagnoses(chcsJsonldObject).map(Diagnoses.translate),
                  Procedures.extractProcedures(chcsJsonldObject).map(Procedures.translate)
            )
        }]
    });
}

// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

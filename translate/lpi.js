/**
 * Manipulate the cmumps jsonld object in understandable ways
 */

var format = require('string-format');
var JSONPath = require('jsonpath-plus');
var cmumps_utils = require('./util/cmumps_utils');
var fdt = require('./cmumps2fhir_datatypes');

function promise() {
    return {};
}


// place in cmumps_utils
function makeTranslator(translator) {

    
    return function (inputObject, options, prefix) {
        var options = cmumps_utils.merge(options, /* defaults */ {
            warnings: false,
            policy: false,
            eat: false
        });

        var participatingProperties = ["['type']"]; // no participants yet
        var warnings = []; // no warnings yet
        // the magic is here
        // var marked = Marked.prototype.create(inputObject, fdt.fetch1(marked, participatingProperties));
        // Create a fetcher for cmumps_patient_object. The fetcher will get data values from
        // input cmumps_patient_object, remembering those that actually have values in list participating_properties.
        var fetch1 = fdt.makeJsonFetcher1(inputObject, participatingProperties);
        // fetch1(json_pattern[, transformation])

        var translated = translator(inputObject, fetch1);

        if (options.participants) fhir.addParticipants(translated, participatingProperties, prefix);
        if (options.warnings) fhir.addWarnings(translated, warnings);
        fdt.clean(translated);

        return {
            // marked: marked,
            options: options,
            participants: participatingProperties,
            warnings: warnings,
            fhir: translated
        };
    };
}


// parts, the parts of cmumps knows how to extract
module.exports = {};
[promise, makeTranslator].forEach(function(f) {
    module.exports[f.name] = f;
});

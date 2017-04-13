#!/usr/bin/env node

/**
 * Refactor of cmumps2, uses modules.
 *
 * Scaffolding stolen from http://shapeshed.com/command-line-utilities-with-nodejs/
 * Need it to run this file in webstorm under the debugger, a productivity boast.
 */

'use strict';

var _ = require('underscore');

//var log4js = require('log4js'); // https://github.com/nomiddlename/log4js-node
//var logger = log4js.getLogger(); // TODO mike@carif.io: scope?
// logger.setLevel(log4js.levels.OFF);
var program = require('commander'); // https://www.npmjs.com/package/commander
var cmumps_utils = require('./cmumps_utils');
var translate = require('./../cmumps2fhir_all');
var fhir2xml = require('fhir-json-to-xml');
var fhir = require('./../fhir');
var cmumps = require('./../cmumps');
var demographics = require('./../cmumps2fhir_demographics');
var format = require('string-format');
var util = require('util');
var fs = require('fs');  // node file system
var assert = require('assert');
var fdt = require('./../cmumps2fhir_datatypes');



/**
 * Process the cmumps jsonld file.
 * @param {string} filename
 * @returns {object}
 */


function process_file(filename) {
    try {

        // Read and then parse the cmumps input.
        var cmumpsInput;

        // Can you read the file?
        try {
            cmumpsInput = fs.readFileSync(filename, "utf8");
        } catch (err) {
            console.error(utils.format("Can't read '%s'", filename));
            process.exit(1);
        }

        // Get the input into cmumpsInput via JSON.load or eval.
        try {
            cmumpsInput = JSON.parse(cmumpsInput);
        } catch (err) {
            try {
                console.warn('Trying javascript eval...')
                eval('cmumpsInput = ' + cmumpsInput);
            } catch (err) {
                console.error(util.format("Can't JSON load or eval '%s'.", filename));
                process.exit(1);
            }
        }
        // Here: you have loaded a jsonld object into cmumpsInput.
        // cmumpsInput is a complete jsonld object with an "@context' and an "@graph".

        // Translate cmumpsInput
        var fhirTranslation = undefined;
        try {
            fhirTranslation = translate.translateCmumpsFhir(cmumpsInput, undefined, 'now');
        } catch (e) {
            console.error('translateCumpsFhir failed: ' + e.message);
            process.exit(1);
        }


        // Count up some things as a sanity check. The counts should currently correspond.
        var counts = {};
        var count = 0;
        for (var p in cmumps.parts) {
            if (p == 'patient') continue; // nickname for demographics
            if (p == 'labs') continue; // fhir translation skips labs by design
            count += counts[p] = cmumps.parts[p](cmumpsInput).length;
        }
        var untranslated = cmumpsInput['@graph'].length - count;
        if (untranslated > 0) console.warn(format('There were {c} untranslated input items.', {c: untranslated}));


        var translatedCounts = {};
        count = 0;
        for (var p in fhir.parts) {
            if (p == 'patient') continue; // nickname for demographics
            if (p == 'labs') continue; // fhir translation skips labs by design
            translatedCounts[p] = fhir.parts[p](fhirTranslation).length;
        }


        // No parts should be added or subtracted.
        for (var k in _.difference(_.keys(counts), _.keys(translatedCounts))) {
            console.warn(format("dropped part '{p}' from translation?", {p: k}));
        }
        for (var k in _.difference(_.keys(translatedCounts), _.keys(counts))) {
            console.warn(format("added part '{p}' to translation?", {p: k}));
        }



        // --xref user asked to see the cross tab counts by parts
        if (program.xref) {
            // Translations currently aways preserved 1-1. A single cmumps 'Patient-2' should
            // translate into a single fhir 'Patient', a single cmumps'Kg_Patient_Diagnosis-100417' to a
            // single fhir 'DiagnosticReport' and so forth. Therefore you can compare the counts to see
            // if something is wrong.
            console.log('parts\t\t\t\tcmumps\tfhir\tok?')
            // all_same records if any translation part is dropped. --xref exits 0 or 1 iff no translations are dropped.
            var all_same = true;
            for (var p in counts) {
                if (p == 'patient') continue; // nickname for demographics
                if (p == 'labs') continue; // fhir translation skips labs by design
                var same = counts[p] == translatedCounts[p];
                all_same = all_same && same;
                var line = util.format('%s\t\t%d\t\t%d\t\t%s',
                    ("            " + p).slice(-12), ("    " + counts[p]).slice(-4), ("          " + translatedCounts[p]).slice(-10), same ? 'ok' : '!OK');
                console.log(line);
            }
            console.log("\n");
            process.exit(!all_same);
        }


        if (program.part != 'all') {
            try {
                fhirTranslation = fhir.parts[program.part](fhirTranslation);
            } catch(err) {
                // logger.error(format("unknown part '{part}'", { part: program.part }));
                // logger.error(format("Known fhir parts: {parts}", { parts: _.keys(fhir.parts) }));
                console.error(err);
                process.exit(1);
            }
        }

        if (program.max && _.isArray(fhirTranslation)) {
            // logger.warn(format('max: {m}, length: {l}, {d} items removed to simplify output.',
            //    {m: program.max, l: fhirTranslation.length, d: fhirTranslation.length - program.max}));
            fhirTranslation = fhirTranslation.slice(0, program.max);
        }


        if (program.output == 'xml') {
            // output is xml
            var parser = new fhir2xml.FHIRConverter(2);
            if (_.isArray(fhirTranslation)) {
                // Technically this output is wrong. An array of objects must be bundled.
                // logger.warn(format("Multiple '{p}'s generated.", {p: program.part}));
                if (fhirTranslation.length > 0) {
                    fhirTranslation.forEach(function (t) {
                        console.log(parser.toXML(t) + "\n\n");
                    });
                } else {
                    console.error('no translation generated');
                }

            } else if (fhirTranslation) {
                console.log(parser.toXML(fhirTranslation));
            } else {
                console.error('no translation generated');
            }
        } else {
            // output is json
            if (_.isArray(fhirTranslation)) {
                // Technically this output is wrong. An array of objects must be bundled.
                // logger.warn(format("Multiple '{p}'s generated.", {p: program.part}));
                fhirTranslation.forEach(function(t) { if (t) console.log(cmumps_utils.pp(t) + "\n\n");});
            } else {
                if (fhirTranslation) console.log(cmumps_utils.pp(fhirTranslation));
            }
        }

        // Does some simple checks to confirm the translation isn't insane.
        if (program.check) {

            if (program.part != 'all') {
                console.error("Can't check partial translations like " + program.part);
                process.exit(1);
            }

            // check the checker
            assert(true, 'always succeeds');

            // Extract the patient input
            var patient = demographics.extractPatient(cmumpsInput);
            // You should have at most one patient
            if (patient) {
                assert (patient.length <= 1, "More than one patient");
                patient = patient[0];

                // If you have an input patient, you should have a translation.
                var translatedPatient = fhir.extractPatient(fhirTranslation);
                assert(translatedPatient, "Can't extract the translated patient");
                assert (patient['sex-2'].toLowerCase() === translatedPatient.gender, "Gender not translated");
            }

            console.error('All checks succeeded.');
        }


        return fhirTranslation;

    } catch (err) {
        console.error(err);
    }

}


// https://github.com/tj/commander.js/
program
    .version(getVersion('0.0.1'))
    .option('-v', 'report version and exit')
    //.option('--level [level]', 'log level usage', 'INFO')
    //.option('--log [log_file]', 'log file')
    .option('-a, --all', 'translate all, the default')
    .option('-o, --output [output]', 'generate fhir json or fhir xml', 'fhir')
    .option('-p, --part [part]', 'return just a part: patient, medications, labs, diagnoses', 'all')
    //.option('-e, --extensions', 'preserve extensions', false)
    .option('--max [max]', 'max elements of array output')
    .option('--xref', 'quick cross reference')
    .option('--check', 'spot check the translation')
    .option('--policy', 'enforce cmumps policies: @graph must have at least one entry, must have a patient')
    .parse(process.argv);

// logger.Level(program.level);

// TODO mcarifio: must be a way to just driver these all as streams?
if (program.args.length > 0) {
    // driver urls (files) from the command line
    program.args.forEach(process_file);
} else {
    // TODO mike@carif.io: want to read from stdin here
    console.error("expecting a file");
    process.exit(1);
}










/**
 * Exact the program version from package.json if you can find package.json
 * @param default_version
 * @returns {*}
 */
function getVersion(default_version) {
    var result = default_version;
    try {
        result = load("../package.json").version;
    } finally {
        return result;
    }
}

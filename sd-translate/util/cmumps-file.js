#!/usr/bin/env node

/**
 * Refactor of cmumps2, uses modules.
 *
 * Scaffolding stolen from http://shapeshed.com/command-line-utilities-with-nodejs/
 * Need it to run this file in webstorm under the debugger, a productivity boast.
 */

'use strict';

//var log4js = require('log4js'); // https://github.com/nomiddlename/log4js-node
//var logger = log4js.getLogger(); // TODO mike@carif.io: scope?
// logger.setLevel(log4js.levels.OFF);
var program = require('commander'); // https://www.npmjs.com/package/commander
var _ = require('underscore');
var cmumps_utils = require('./cmumps_utils');
var translate = require('./../cmumps2sd_all');
var sd2xml = require('sd-json-to-xml');
var sd = require('./../sd');
var cmumps = require('./../cmumps');
var JSONPath = require('jsonpath-plus');
var format = require('string-format');
var util = require('util');
var fs = require('fs');  // node file system



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
        var sdTranslation = undefined;
        try {
            sdTranslation = translate.translatecmumpssd(cmumpsInput, undefined, 'now');
        } catch (e) {
            console.error('translatecmumpssd failed: ' + e.message);
            process.exit(1);
        }


        // Count up some things as a sanity check. The counts should currently correspond.
        var counts = {};
        var count = 0;
        for (var p in cmumps.parts) {
            count += counts[p] = cmumps.parts[p](cmumpsInput).length;
        }
        var untranslated = cmumpsInput['@graph'].length - count;
        if (untranslated > 0) console.warn(format('There were {c} untranslated input items.', {c: untranslated}));


        var translatedCounts = {};
        count = 0;
        for (var p in sd.parts) {
            translatedCounts[p] = sd.parts[p](sdTranslation).length;
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
            // translate into a single sd 'Patient', a single cmumps'Kg_Patient_Diagnosis-100417' to a
            // single sd 'DiagnosticReport' and so forth. Therefore you can compare the counts to see
            // if something is wrong.
            console.log('parts\t\t\t\tcmumps\tsd\tok?')
            for (var p in counts) {
                console.log(util.format('%s\t\t%d\t\t%d\t\t%s',
                    ("            " + p).slice(-12), ("    " + counts[p]).slice(-4), ("          " + translatedCounts[p]).slice(-10), counts[p] == translatedCounts[p] ? 'ok' : '!OK'));
            }
            console.log("\n");
            process.exit(0);
        }


        if (program.part != 'all') {
            try {
                sdTranslation = sd.parts[program.part](sdTranslation);
            } catch(err) {
                // logger.error(format("unknown part '{part}'", { part: program.part }));
                // logger.error(format("Known sd parts: {parts}", { parts: _.keys(sd.parts) }));
                console.error(err);
                process.exit(1);
            }
        }

        if (program.max && _.isArray(sdTranslation)) {
            // logger.warn(format('max: {m}, length: {l}, {d} items removed to simplify output.',
            //    {m: program.max, l: sdTranslation.length, d: sdTranslation.length - program.max}));
            sdTranslation = sdTranslation.slice(0, program.max);
        }


        if (program.output == 'xml') {
            // output is xml
            var parser = new sd2xml.sdConverter(2);
            if (_.isArray(sdTranslation)) {
                // Technically this output is wrong. An array of objects must be bundled.
                // logger.warn(format("Multiple '{p}'s generated.", {p: program.part}));
                if (sdTranslation.length > 0) {
                    sdTranslation.forEach(function (t) {
                        console.log(parser.toXML(t) + "\n\n");
                    });
                } else {
                    console.error('no translation generated');
                }

            } else if (sdTranslation) {
                console.log(parser.toXML(sdTranslation));
            } else {
                console.error('no translation generated');
            }
        } else {
            // output is json
            if (_.isArray(sdTranslation)) {
                // Technically this output is wrong. An array of objects must be bundled.
                // logger.warn(format("Multiple '{p}'s generated.", {p: program.part}));
                sdTranslation.forEach(function(t) { if (t) console.log(cmumps_utils.pp(t) + "\n\n");});
            } else {
                if (sdTranslation) console.log(cmumps_utils.pp(sdTranslation));
            }
        }
        return sdTranslation;

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
    .option('-o, --output [output]', 'generate sd json or sd xml', 'sd')
    .option('-p, --part [part]', 'return just a part: patient, medications, labs, diagnoses', 'all')
    //.option('-e, --extensions', 'preserve extensions', false)
    .option('--max [max]', 'max elements of array output')
    .option('--xref', 'quick cross reference')
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

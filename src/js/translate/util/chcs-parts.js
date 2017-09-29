#!/usr/bin/env node

/**
 * Refactor of chcs2, uses modules.
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
var chcs_utils = require('./chcs_utils');
var translate = require('./../chcs2fhir_all');
var fhir2xml = require('fhir-json-to-xml');
var fhir = require('./../fhir');
var chcs = require('./../chcs');
var format = require('string-format');
var util = require('util');
var fs = require('fs');  // node file system



/**
 * Process the chcs jsonld file.
 * @param {string} filename
 * @returns {object}
 */


function process_file(filename) {
    try {

        // Read and then parse the chcs input.
        var chcsInput;

        // Can you read the file?
        try {
            chcsInput = fs.readFileSync(filename, "utf8");
        } catch (err) {
            console.error(utils.format("Can't read '%s'", filename));
            process.exit(1);
        }

        // Get the input into chcsInput via JSON.load or eval.
        try {
            chcsInput = JSON.parse(chcsInput);
        } catch (err) {
            try {
                console.warn('Trying javascript eval...')
                eval('chcsInput = ' + chcsInput);
            } catch (err) {
                console.error(util.format("Can't JSON load or eval '%s'.", filename));
                process.exit(1);
            }
        }
        // Here: you have loaded a jsonld object into chcsInput.
        // chcsInput is a complete jsonld object with an "@context' and an "@graph".


        // Count up some things as a sanity check. The counts should currently correspond.
        var counts = {};
        var count = 0;
        if (program.part) {
            var p = program.part;
            var parts = chcs.parts[p](chcsInput);
            if (program.count) {
                console.log("extracted " + parts.length + " " + p);
            } else {
                console.log(p, "\t-----------")
                parts.forEach(function (i) {
                    console.log(chcs_utils.pp(i), "\n\n");
                });
                console.log("\n\n\n\n\n");
            }
        } else {
            for (var p in chcs.parts) {
                var parts = chcs.parts[p](chcsInput);
                if (program.count) {
                    console.log("extracted " + parts.length + " " + p);
                } else {
                    console.log(p, "\t-----------")
                    parts.forEach(function (i) {
                        console.log(chcs_utils.pp(i), "\n\n");
                    });
                    console.log("\n\n\n\n\n");
                }
            }
        }

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
    .option('-p, --part [part]', 'return just a part: patient, medications, labs, diagnoses, procedures')
    .option('-c, --count', 'count the part or all parts', false)
    //.option('-e, --extensions', 'preserve extensions', false)
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

#!/usr/bin/env node

const _ = require('underscore');
const Fs = require('fs');

const CmdlineArgs = require('command-line-args')
const Usage = require('command-line-usage')

// Define the command line args and parse to see what we got
const CmdlineDefs = [
    { name: "help", alias: "h", type: Boolean },
    { name: "input", alias: "i", type: String, description: "JSON-LD file to be pre-processed" },
    { name: "output", alias: "o", type: String, description: "JSON-LD file generated by pre-processor" }
];

function helpAndExit(status) {
    console.log(
        Usage([
           { header:"preprocess",
             content:"Preprocess a JSON-LD to duplicate id/_id fields and type fields for ShEx schema attribute access after conversion to RDF graph." },
           { header: "Synopsis",
             content: [ "preprocess -h | <JSON-LD File>" ] },
           { header: "Examples",
             content: [
              "   preprocess -help",
              "   preprocess -i input_file.jsonld -o output_file.jsonld" ]},
            { content: "Project home: [underline]{https://github.com/rdf-pipeline/translators}" }
          ]));
    process.exit(status);
}

/**
 * Preprocesses JSON-LD data to ensure we have an identifier attribute that contains id and _id values
 * since they will not be directly accessible in the ShEx schema after conversion into the RDF graph
 *
 * @param jsonldFile path to a JSON-LD file to be preprocessed.
 *
 * @return name of the file the preprocessed data was written into
 */
function preprocess(input_file, output_file) {

    var jsonData = JSON.parse(Fs.readFileSync(input_file, "UTF-8"));

    var normalizedData =  normalizeAttribute( jsonData, ["id", "_id"], "identifier");
    normalizedData =  normalizeAttribute( normalizedData, ["type"], "chcs_type");

    Fs.writeFileSync(output_file, JSON.stringify(normalizedData, null, 2));
    return output_file;
}

/**
 * Deep map the source attributes to a new target attribute in the object
 *
 * @object object to be modified
 * @sourceKeys object keys to be mapped to the target key
 * @targetKey target key name to be inserted
 *
 * @return the modified object
 */
function normalizeAttribute(object, sourceKeys, targetKey) {

    for (var key in object) {
        if (key === "@context") {
              ; // leave it alone
        } else if (typeof object[key] === "object") {
            if (_.isEmpty(object[key]['type']) ||  
                object[key]['type'].indexOf('xsd:date') < 0) {
               normalizeAttribute(object[key], sourceKeys, targetKey);
            }
        } else if (sourceKeys.indexOf(key) !== -1) {
            object[targetKey] = object[key];
        }
    }

    return object;
}

function cleanFile(filename) {
    if (Fs.existsSync(filename)) {
        Fs.unlinkSync(filename); 
    }
}

/**
 * Verify file is readable
 *
 * @param filename File name
 */
function fileAccessible(filename) {
    try {
       Fs.accessSync(filename, Fs.R_OK);
    } catch (e) {
       console.error("File "+filename+" is not readable!");
       process.exit(1);
    }
}

/**
 * Verify file exists
 *
 * @param filename File name
 */
function fileExists(filename) {
    if (! Fs.existsSync(filename)) {
        console.error("File "+filename+" does not exist!");
        helpAndExit(1);
    }
}

/**
 * Verify command line argument was specified
 *
 * @param arg the argument to be checked for existence
 * @param errorMsg error to print if the argument was not specified 
 */
function verify_required_arg(arg, errorMsg) {
    if ((_.isUndefined(arg) || _.isNull(arg))) {
        console.error(errorMsg);
        helpAndExit(1);
    }
}

var cmds;
try {
   cmds = CmdlineArgs(CmdlineDefs);
} catch(e) {
   console.error(e.message);
   helpAndExit(1);
}

if (cmds.help) {
  helpAndExit(0);
}

verify_required_arg(cmds.input, "A JSON-LD input file argument is required!");
verify_required_arg(cmds.output, "A JSON-LD output file argument is required!");

fileExists(cmds.input);
fileAccessible(cmds.input);

cleanFile(cmds.output);

var output =  preprocess(cmds.input, cmds.output);
console.log('Completed preprocessing of',output);

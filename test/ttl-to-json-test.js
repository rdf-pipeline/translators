/**
 * File: ttl-to-json-test.js
 * Unit tests for bin/ttl-to-json-test.js 
 */

var _ = require('underscore');

var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');

var commonTest = require('./common-test.js');

var outputDir = os.tmpdir()+"/test";
var frameFile = __dirname + "/data/cmumps.frame";
var ttlToJsonPath = __dirname + '/../bin/ttl-to-json';

var nestedTtlFile = __dirname + "/data/nested-cmumps.ttl";
var simpleTtlFile = __dirname + "/data/simple-cmumps.ttl";

describe("ttl-to-json", function() {

    it("should exist as a file", function() {
        fs.existsSync(ttlToJsonPath).should.be.true;
    });

    it("should be executable", function() {
        commonTest.verifyExecutable(ttlToJsonPath);
    });

    it("should print usage if given no command line arguments", function(done) {
        exec(ttlToJsonPath, function (error, stdout, stderr) {
            stderr.should.contain("A TTL RDF file argument is required!");
            verifyHelp(error, stdout);
            done();
        });
    });

    it("should print an error if given garbage arguments", function(done) {
        exec(ttlToJsonPath + " --garbage", function (error, stdout, stderr) {
            stderr.should.contain("Unknown option: --garbage");
            verifyHelp(error, stdout);
            done();
        });
    });


  describe("--ttlfile option", function() {

      it("should return an error if -t given no argument", function(done) {
          exec(ttlToJsonPath + " --ttlfile", function (error, stdout, stderr) {
              stderr.should.contain("A TTL RDF file argument is required!");
              verifyHelp(error, stdout);
              done();
          });
      });

      it("should return an error if given non-existent ttl file", function(done) {
          var file =  os.tmpdir() + "/wikiwiki" + Math.random() + ".ttl"
          var cmd = ttlToJsonPath + " --ttlfile " + file;
          commonTest.cmdFileNonexistent(cmd, file, done);
      });

      it("should return an error if ttlfile file is not readable", function(done) {
          var file = os.tmpdir() + '/wikiwiki' + Math.random() + ".ttl"
          var cmd = ttlToJsonPath + " --ttlfile " + file;
          commonTest.cmdFileUnreadable(cmd, file, done);
      });

      it("should convert simple RDF file specified by -t to json successfully", function(done) {
          var command = ttlToJsonPath + " -t " + simpleTtlFile ;
          exec(command, function (error, stdout, stderr) {
              expect(error).to.be.null;
              stderr.trim().length.should.equal(0);
              var json = JSON.parse(stdout);
              json.should.be.an('array');
              expect(json).to.have.length(1);
              json = json[0];
              expect(Object.keys(json)).to.have.length(13);
              json['@id'].should.equal("http://hokukahu.com/patient-1");
              json['http://hokukahu.com/schema/cmumpss#identifier'].should.equal("2-000007");
              json['http://hokukahu.com/schema/cmumpss#phone-2'].should.equal("555 555 5555");
              json['http://hokukahu.com/schema/cmumpss#street_address-2'].should.equal("100 MAIN ST");
              json['http://hokukahu.com/schema/cmumpss#city-2'].should.equal("ANYTOWN");
              json['http://hokukahu.com/schema/cmumpss#state-2'].should.equal("NEW YORK");
              json['http://hokukahu.com/schema/cmumpss#zip_code-2'].should.equal("60040");
              json['http://www.w3.org/2000/01/rdf-schema#label'].should.equal("BUNNY,BUGS");
              json['http://hokukahu.com/schema/cmumpss#emergency_contact-2'].should.equal("RUNNAH, ROAD");
              json['http://hokukahu.com/schema/cmumpss#ephone-2'].should.equal("555 555 5558");
              json['http://hokukahu.com/schema/cmumpss#estreet_address-2'].should.equal("7000 InternalTest Boulevard");
              json['http://hokukahu.com/schema/cmumpss#ecity-2'].should.equal("ALBUQUERQUE");
              json['http://hokukahu.com/schema/cmumpss#ezip-2'].should.equal("55555");
              done();
          });
      });
  });

  describe("--frame option", function() {

      it("should return an error if -f given no frame file", function(done) {
          exec(ttlToJsonPath + " --ttlfile " + simpleTtlFile + " -f ", function (error, stdout, stderr) {
              stderr.should.contain("Frame argument requires a frame file!");
              verifyHelp(error, stdout);
              done();
          });
      });

      it("should return an error if given non-existent frame file", function(done) {
          var file =  os.tmpdir() + "/wikiwiki" + Math.random() + ".frame"
          var cmd = ttlToJsonPath + " --ttlfile " + simpleTtlFile + " --frame " + file;
          commonTest.cmdFileNonexistent(cmd, file, done);
      });

      it("should return an error if frame file is not readable", function(done) {
          var file = os.tmpdir() + '/wikiwiki' + Math.random() + ".frame"
          var cmd = ttlToJsonPath + " --ttlfile " + simpleTtlFile + " --frame " + file;
          commonTest.cmdFileUnreadable(cmd, file, done);
      });

      it("should convert simple RDF file with a frame to should convert to JSON-LD successfully", function(done) {
          var command = ttlToJsonPath + " -t " + simpleTtlFile + ' -f ' + frameFile;
          exec(command, function (error, stdout, stderr) {
              expect(error).to.be.null;
              stderr.trim().length.should.equal(0);
              var json = JSON.parse(stdout);
              json.should.be.an('object');
              expect(Object.keys(json)).to.have.length(2);
              json.should.have.all.keys('@context', '@graph');
              json['@context'].should.not.be.empty;
              var graph = json['@graph'];
              graph.should.be.an('array');
              expect(graph).to.have.length(1);
              graph = graph[0];
              expect(Object.keys(graph)).to.have.length(13);
              graph['city-2'].should.equal("ANYTOWN"); 
              graph['ecity-2'].should.equal("ALBUQUERQUE"),
              graph['emergency_contact-2'].should.equal("RUNNAH, ROAD");
              graph['ephone-2'].should.equal("555 555 5558");
              graph['estreet_address-2'].should.equal("7000 InternalTest Boulevard");
              graph['ezip-2'].should.equal("55555");
              graph['identifier'].should.equal("2-000007");
              graph['phone-2'].should.equal("555 555 5555");
              graph['state-2'].should.equal("NEW YORK");
              graph['street_address-2'].should.equal("100 MAIN ST");
              graph['zip_code-2'].should.equal("60040");
              graph['label'].should.equal("BUNNY,BUGS");
              done();
          });
      });

  });


  describe("More advanced TTL RDF conversions", function() {

      it("should convert RDF with nested data to JSON", function(done) { 
          var command = ttlToJsonPath + " -t " + nestedTtlFile ;
          exec(command, function (error, stdout, stderr) {
              expect(error).to.be.null;
              stderr.trim().length.should.equal(0);
              var json = JSON.parse(stdout);
              json.should.be.an('array');
              expect(json).to.have.length(3);

	      var blankNodes = [json[1], json[2]];
              json = json[0];

              blankNodes[0].should.have.all.keys('@id', 
                                                 'http://hokukahu.com/schema/cmumpss#identifier', 
                                                 'http://www.w3.org/2000/01/rdf-schema#label');
              blankNodes[1].should.have.all.keys('@id', 
                                                 'http://hokukahu.com/schema/cmumpss#identifier', 
                                                 'http://www.w3.org/2000/01/rdf-schema#label');

              expect(blankNodes[0]['@id']).to.match(/^_:.*/);
              expect(blankNodes[1]['@id']).to.match(/^_:.*/);

              expect(blankNodes[0]['http://hokukahu.com/schema/cmumpss#identifier']).to.match(/^81(1|4)0-20/);
              expect(blankNodes[1]['http://hokukahu.com/schema/cmumpss#identifier']).to.match(/^81(1|4)0-20/);

              expect(blankNodes[0]['http://www.w3.org/2000/01/rdf-schema#label']).to.match(/^(OTHER RELATIONSHIP|20)/);
              expect(blankNodes[1]['http://www.w3.org/2000/01/rdf-schema#label']).to.match(/^(OTHER RELATIONSHIP|20)/);

              // Check the JSON data
              expect(Object.keys(json)).to.have.length(16);
              json['@id'].should.equal("http://hokukahu.com/patient-1");
              json['http://hokukahu.com/schema/cmumpss#identifier'].should.equal("2-000007");
              json['http://hokukahu.com/schema/cmumpss#phone-2'].should.equal("555 555 5555");
              json['http://hokukahu.com/schema/cmumpss#dob-2'].should.deep.equal(
                  { '@type': 'http://www.w3.org/2001/XMLSchema#date',
                    '@value': '1990-01-01' });
              json['http://hokukahu.com/schema/cmumpss#street_address-2'].should.equal("100 MAIN ST");
              json['http://hokukahu.com/schema/cmumpss#city-2'].should.equal("ANYTOWN");
              json['http://hokukahu.com/schema/cmumpss#state-2'].should.equal("NEW YORK");
              json['http://hokukahu.com/schema/cmumpss#zip_code-2'].should.equal("60040");
              json['http://www.w3.org/2000/01/rdf-schema#label'].should.equal("BUNNY,BUGS");
              json['http://hokukahu.com/schema/cmumpss#erelationship-2'].should.deep.equal({'@id': '_:19'});
              json['http://hokukahu.com/schema/cmumpss#emergency_contact-2'].should.equal("RUNNAH, ROAD");
              json['http://hokukahu.com/schema/cmumpss#ephone-2'].should.equal("555 555 5558");
              json['http://hokukahu.com/schema/cmumpss#estreet_address-2'].should.equal("7000 InternalTest Boulevard");
              json['http://hokukahu.com/schema/cmumpss#ecity-2'].should.equal("ALBUQUERQUE");
              json['http://hokukahu.com/schema/cmumpss#ezip-2'].should.equal("55555");
              json['http://hokukahu.com/schema/cmumpss#fmp-2'].should.deep.equal({'@id': '_:31'});
              done();
          });
      });

      it("should convert RDF with nested data to JSON-LD", function(done) { 
          var command = ttlToJsonPath + " --ttlfile " + nestedTtlFile + ' --frame ' + frameFile;
          exec(command, function (error, stdout, stderr) {
              expect(error).to.be.null;
              stderr.trim().length.should.equal(0);

              var json = JSON.parse(stdout);
              json.should.be.an('object');
              json.should.have.all.keys('@context', '@graph');

              var graph = json['@graph'];
              graph.should.be.an('array');
              graph.should.have.length(1); 

              graph = graph[0];
              graph.should.have.all.keys('id', 'city-2', 'dob-2', 'ecity-2', 
                                         'emergency_contact-2', 'ephone-2', 'erelationship-2',
                                         'estreet_address-2', 'ezip-2', 'fmp-2', 'identifier', 
                                         'phone-2', 'state-2', 'street_address-2', 'zip_code-2',
                                         'label');
              graph['city-2'].should.equal('ANYTOWN');
              graph['dob-2'].should.deep.equal({type: 'xsd:date', value: '1990-01-01'});
              graph['ecity-2'].should.equal('ALBUQUERQUE');
              graph['emergency_contact-2'].should.equal('RUNNAH, ROAD');
              graph['ephone-2'].should.equal('555 555 5558');
              graph['erelationship-2'].should.deep.equal(
                  {identifier: '8140-20', label: 'OTHER RELATIONSHIP'}); 
              graph['estreet_address-2'].should.equal('7000 InternalTest Boulevard');
              graph['ezip-2'].should.equal('55555');
              graph['fmp-2'].should.deep.equal({identifier: '8110-20', label: '20'});
              graph['identifier'].should.equal('2-000007');
              graph['phone-2'].should.equal('555 555 5555');
              graph['state-2'].should.equal('NEW YORK');
              graph['street_address-2'].should.equal('100 MAIN ST');
              graph['zip_code-2'].should.equal('60040');
              graph['label'].should.equal('BUNNY,BUGS');
              done();
          });
      });
  });

});

function verifyHelp(error, stdout) {
    error.code.should.equal(1);
    stdout.should.contain("Synopsis");
    stdout.should.contain("Options");
    stdout.should.contain("--help");
    stdout.should.contain("--frame");
    stdout.should.contain("--ttlfile");
    stdout.should.contain("Examples");
    stdout.should.contain("     ttl-to-json -t file.ttl");
    stdout.should.contain("Project home: ");
};

/*
 * File: roundtrip-translation-test.js
 * Unit tests for bin/roundtrip-translation-test.js 
 */

var _ = require('underscore');

var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

var exec = require('child_process').exec;
var fs = require('fs');
var os = require('os');

var commonTest = require('./common-test');

var frameFile = __dirname + "/data/cmumps.frame";
var roundtripPath = __dirname + '/../bin/roundtrip-translation.sh';

var simpleJsonldPath= __dirname + "/data/simple-cmumps.jsonld";
var simpleShExPath= __dirname + "/data/simple-cmumps.shex";
var simpleCmumps2FhirPath= __dirname + "/data/simple-cmumps2fhir.shex";
var simpleFhir2CmumpsPath= __dirname + "/data/simple-fhir2cmumps.shex";

var jsonldPath= __dirname + "/data/cmumps-patient7.jsonld";
var otherShExPath= __dirname + "/data/other-cmumps-patient7.shex";
var cmumps2FhirPath= __dirname + "/data/cmumps2fhir-patient7.shex";
var fhir2CmumpsPath= __dirname + "/data/fhir2cmumps-patient7.shex";
var varsPath = __dirname + "/data/patient7-vars.json";

var testWorkDir = __dirname + "/work";
var tmpDir = os.tmpdir()+"/test";

describe("roundtrip-translation", function() {

    it("should exist as a file", function() {
        fs.existsSync(roundtripPath).should.be.true;
    });

    it("should be executable", function() {
        commonTest.verifyExecutable(roundtripPath);
    });

    it("should print usage if given no command line arguments", function(done) {
        exec(roundtripPath, function (error, stdout, stderr) {
            error.code.should.equal(1);
            stderr.should.contain("expected a JSON-LD data file!");
            verifyUsage(error, stdout);
            done();
        });
    });

    it("should print an error if given garbage arguments", function(done) {
        exec(roundtripPath + " --garbage", function (error, stdout, stderr) {
            stderr.should.contain('Invalid option: "--garbage"');
            verifyUsage(error, stdout);
            done();
        });
    });


  describe("--help", function() {

      var verifyHelp = function(error, stdout) {
          expect(error).to.be.null;
          stdout.should.contain("NAME");
          stdout.should.contain("SYNOPSIS");
          stdout.should.contain("-h | --help");
          stdout.should.contain("-d | --data <JSON-LD data file>");
          stdout.should.contain("-t | --target <ShEx target translation schema file>");
          stdout.should.contain("[-b | --backtarget <ShEx back target translation schema file>]");
          stdout.should.contain("[-f | --frame <JSON-LD frame file>]");
          stdout.should.contain("[-j | --jsonvars <ShEx JSON variables file>]");
          stdout.should.contain("[-o | --output <output directory>]");
          stdout.should.contain("[-r | --root <RDF root>]");
          stdout.should.contain("[-s | --source <ShEx source data schema file>]");
          stdout.should.contain("[-v | --verbose]");
          stdout.should.contain("DESCRIPTION");
          stdout.should.contain("EXAMPLE");
      };

      it("--help should print command help details", function(done) {
          exec(roundtripPath + " --help", function (error, stdout, stderr) {
              verifyHelp(error, stdout);
              done();
          });
      });

      it("--h should print command help details", function(done) {
          exec(roundtripPath + " -h", function (error, stdout, stderr) {
              verifyHelp(error, stdout);
              done();
          });
      });
  });

  describe("--data option", function() {

      it("should return an error if given no argument", function(done) {
          exec(roundtripPath + " --data", function (error, stdout, stderr) {
              stderr.should.contain("ERROR: expected a JSON-LD data file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if given non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " -d " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should return an error if file is not readable", function(done) {
          var filepath = tmpDir + 'aloha' + Math.random() + ".jsonld"
          var cmdline = roundtripPath + " --data " + filepath;

          // test graceful error handling when filepath is not accessible.
          commonTest.fileInAccessHandling(cmdline, filepath, done);
      });

      it("should return an error if given a file without a jsonld extension", function(done) {
          var cmdline = roundtripPath + " -d " + simpleShExPath;
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("simple-cmumps.shex does not have the expected filename extension - expected jsonld!");
              done();
          });
      });

      it("should return an error if data file is specified, but no target translation given", function(done) {
          var cmdline = roundtripPath + " --data " + simpleJsonldPath;
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("ERROR: expected a ShEx translation file!");
              verifyUsage(error, stdout);
              done();
          });
      });
  });

  describe("--target option", function() {

      it("should return an error if target is specified with no data file", function(done) {
          exec(roundtripPath + " --target", function (error, stdout, stderr) {
              stderr.should.contain("ERROR: expected a JSON-LD data file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if data file is specificed but no target file given", function(done) {
          exec(roundtripPath + " --data " + simpleJsonldPath + " --target", function (error, stdout, stderr) {
              stderr.should.contain("ERROR: expected a ShEx translation file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if given a non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + " -t " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should return an error if file is not readable", function(done) {
          var filepath = tmpDir + 'aloha' + Math.random() + ".shex"
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + filepath;

          // test graceful error handling when filepath is not accessible.
          commonTest.fileInAccessHandling(cmdline, filepath, done);
      });

      it("should return an error if given a file without a shex extension", function(done) {
          var cmdline = roundtripPath + " -t " + simpleJsonldPath + " -d " + simpleJsonldPath;
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("simple-cmumps.jsonld does not have the expected filename extension - expected shex!");
              done();
          });
      });

      it("should execute a round trip translation using the jsonld data file and the ShEx target file", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          // Note: We slide the output directory on here to ensure the roundtrip translate does not overwrite something 
           // in the user's current working directory.  This ensures we write to test/work instead.
          var cmdline = roundtripPath + " --data " + simpleJsonldPath +
                        " --target " + simpleCmumps2FhirPath + " -o " + testWorkDir;
          exec(cmdline, function (error, stdout, stderr) {

              // Verify that each step executed successfully with some output.  The output here looks a little funny
              // because we don't want to look at the canonical paths which are installation dependent. 
              stdout.should.contain("simple-cmumps.jsonld completed successfully.");
              stdout.should.contain("simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain("back-simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain('json-diff'); 

              // Check the correct files are there.
              fs.existsSync(testWorkDir+'/back-simple-cmumps.shex').should.be.true;
              fs.existsSync(testWorkDir+'/back-simple-cmumps2fhir.shex').should.be.true;

              verifyValFile(testWorkDir + '/simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/simple-cmumps2fhir.ttl');

              verifyValFile(testWorkDir + '/back-simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/back-simple-cmumps2fhir.ttl');

              verifyJsonFile(testWorkDir + '/back-simple-cmumps.json');

              fs.existsSync(testWorkDir+'/diff.out').should.be.true;

              // Cleanup the work directory
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });

  });

  describe("--backtarget option", function() {
  
      it("should return an error if given no argument", function(done) {
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --backtarget ";
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("--backtarget specified with no back target translation file!");
              verifyUsage(error, stdout);
              done();
          }); 
      });

      it("should return an error if given a non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " -b " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should return an error if file is not readable", function(done) {
          var filepath = tmpDir + Math.random() + ".shex"
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --backtarget " + filepath;

          // test graceful error handling when filepath is not accessible.
          commonTest.fileInAccessHandling(cmdline, filepath, done);
      });

      it("should return an error if given a file without a shex extension", function(done) {
          var cmdline = roundtripPath + " --backtarget " + simpleJsonldPath +
                        " -d " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath;  
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("simple-cmumps.jsonld does not have the expected filename extension - expected shex!");
              done();
          });
      });

      it("should execute a round trip translation using the back target file on return translation", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          // Note: We slide the output directory on here to ensure the roundtrip translate does not overwrite something 
           // in the user's current working directory.  This ensures we write to test/work instead.
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + " -t " + simpleCmumps2FhirPath + 
                        " -b " +  simpleFhir2CmumpsPath + " -o " + testWorkDir;
          exec(cmdline, function (error, stdout, stderr) {

              // Verify that each step executed successfully with some output.  The output here looks a little funny
              // because we don't want to look at the canonical paths which are installation dependent. 
              stdout.should.contain("simple-cmumps.jsonld completed successfully.");
              stdout.should.contain("simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain("back-simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain('json-diff'); 

              // Check the correct files are there.
              fs.existsSync(testWorkDir+'/back-simple-cmumps.shex').should.be.true;

              verifyValFile(testWorkDir + '/simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/simple-cmumps2fhir.ttl');

              verifyValFile(testWorkDir + '/back-simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/back-simple-cmumps2fhir.ttl');

              verifyJsonFile(testWorkDir + '/back-simple-cmumps.json');

              fs.existsSync(testWorkDir+'/diff.out').should.be.true;

              // Cleanup the work directory
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });

  });

  describe("--frame option", function() {
      it("should return an error if given no argument", function(done) {
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " -t " + simpleCmumps2FhirPath + " --frame ";
          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("ERROR: --frame specified with no frame file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if given a non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " -f " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should return an error if file is not readable", function(done) {
          var filepath = tmpDir + "aloha" +  Math.random() + ".frame"
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --frame " + filepath;

          // test graceful error handling when filepath is not accessible.
          commonTest.fileInAccessHandling(cmdline, filepath, done);
      });

      it("should execute a round trip translation using the frame file to generate reverse jsonld", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          // Note: We slide the output directory on here to ensure the roundtrip translate does not overwrite something 
           // in the user's current working directory.  This ensures we write to test/work instead.
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + " -t " + simpleCmumps2FhirPath + 
                    " -f " + frameFile + " -b " +  simpleFhir2CmumpsPath + " -o " + testWorkDir;
          exec(cmdline, function (error, stdout, stderr) {

              // Verify that each step executed successfully with some output.  The output here looks a little funny
              // because we don't want to look at the canonical paths which are installation dependent. 
              stdout.should.contain("simple-cmumps.jsonld completed successfully.");
              stdout.should.contain("simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain("back-simple-cmumps2fhir.ttl completed successfully.");
              stdout.should.contain('json-diff'); 

              // Check the correct files are there.
              fs.existsSync(testWorkDir+'/back-simple-cmumps.shex').should.be.true;

              verifyValFile(testWorkDir + '/simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/simple-cmumps2fhir.ttl');

              verifyValFile(testWorkDir + '/back-simple-cmumps.val');
              verifyTtlFile(testWorkDir + '/back-simple-cmumps2fhir.ttl');

              verifyJsonldFile(testWorkDir + '/back-simple-cmumps.jsonld');

              fs.existsSync(testWorkDir+'/diff.out').should.be.true;

              // Cleanup the work directory
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });
  });

  describe("--jsonvars option", function() {

      it("should return an error if given no argument", function(done) {
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " -t " + simpleCmumps2FhirPath + " --jsonvars ";
          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("ERROR: --jsonvars specified with no JSON variables file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if given a non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --frame " + frameFile + 
                        " -j " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should return an error if file is not readable", function(done) {
          var filepath = tmpDir + "aloha" +  Math.random() + ".json"
          var cmdline = roundtripPath + " -d " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --jsonvars " + filepath;

          // test graceful error handling when filepath is not accessible.
          commonTest.fileInAccessHandling(cmdline, filepath, done);
      });

      it("should return an error if given a file without a json extension", function(done) {
          var cmdline = roundtripPath + " -d " + jsonldPath + " --target " + cmumps2FhirPath + 
                        " --jsonvars " + simpleJsonldPath +  " -b " + fhir2CmumpsPath; 
          exec(cmdline, function (error, stdout, stderr) {
              error.code.should.equal(1);
              stderr.should.contain("simple-cmumps.jsonld does not have the expected filename extension - expected json!");
              done();
          });
      });

      it("should execute a round trip translation using the json variables in translation", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);
          var cmdline = roundtripPath + " -d " + jsonldPath + 
                        " --target " + cmumps2FhirPath + " -b " + fhir2CmumpsPath +
                        " -f " + frameFile + " --jsonvars " + varsPath + " -o " + testWorkDir;
          exec(cmdline, function (error, stdout, stderr) {
              // Verify that each step executed successfully with some output.  The output here looks a little funny
              // because we don't want to look at the canonical paths which are installation dependent. 
              stdout.should.contain("cmumps-patient7.jsonld completed successfully.");
              stdout.should.contain("cmumps2fhir-patient7.ttl completed successfully.");
              stdout.should.contain("back-cmumps2fhir-patient7.ttl completed successfully.");
              stdout.should.contain('json-diff'); 

              // Check the correct files are there.
              fs.existsSync(testWorkDir+'/back-cmumps-patient7.shex').should.be.true;

              verifyValFile(testWorkDir + '/cmumps-patient7.val');
              verifyTtlFile(testWorkDir + '/cmumps2fhir-patient7.ttl');

              verifyValFile(testWorkDir + '/back-cmumps-patient7.val');
              verifyTtlFile(testWorkDir + '/back-cmumps2fhir-patient7.ttl');

              verifyJsonldFile(testWorkDir + '/back-cmumps-patient7.jsonld');

              fs.existsSync(testWorkDir+'/diff.out').should.be.true;

              // Cleanup the work directory
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });
  });

  describe("--output option", function() {
      it("should return an error if given no argument", function(done) {
          var cmdline = roundtripPath + " -d " + jsonldPath +    
                        " --target " + cmumps2FhirPath + " -b " + fhir2CmumpsPath +
                        " --jsonvars " + varsPath + " -o ";
          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("ERROR: -o specified with no output directory!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should give an error if path is to an existing file", function(done) {
          var testFile = __dirname + '/aloha' + Math.random();
          fs.writeFileSync(testFile, '{}');
          var cmdline = roundtripPath + " -o " + testFile + " -d " + jsonldPath + 
                        " --target " + cmumps2FhirPath + 
                        " -b " + fhir2CmumpsPath + " --jsonvars " + varsPath;
          exec(cmdline, function (error, stdout, stderr) {
                  error.code.should.equal(1);
                  stderr.should.contain("Output directory " + testFile + " already exists as a file!");
                  fs.unlinkSync(testFile);
                  done();
              });
      });
 
      it("should create output directory path if it does not exist and write all files to it", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          var testDir = testWorkDir+'/subdir';
          fs.existsSync(testDir).should.be.false;

          var cmdline = roundtripPath + " --data " + simpleJsonldPath + 
                        " --target " + simpleCmumps2FhirPath + " --output " + testDir;
          exec(cmdline, function (error, stdout, stderr) {
              fs.existsSync(testDir).should.be.true;
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });
  });

  describe("--root option", function() {

      it("should use default root if given no argument", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          // Turn on -v so we can see the default warning
          var cmdline = roundtripPath + " --data " + simpleJsonldPath +  
                        " --target " + simpleCmumps2FhirPath 
                    + " -o " + testWorkDir + " -v";

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("WARN: No RDF root specified; defaulting to urn:local:patient-1.");
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });

      it("should return an error if root argument specified with no value", function(done) {
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath 
                        + " -o " + testWorkDir + " --root";

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("ERROR: --root specified with no RDF root!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should set the specified root", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          var rdfRoot = "http://hokukahu.com/patient-3";
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath 
                        + " -o " + testWorkDir + " --root " + rdfRoot;

          exec(cmdline, function (error, stdout, stderr) {
              var ttlFile = testWorkDir + '/simple-cmumps2fhir.ttl';
              var string = fs.readFileSync(ttlFile,'UTF-8');
              string.should.contain(rdfRoot);
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });
  });

  describe("--source  option", function() {

      it("should use default source ShEx schema file if given no argument", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          // Turn on -v so we can see the default warning
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath 
                        + " -o " + testWorkDir + " -v";

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("WARN: No source ShEx schema file specified.  Defaulting to ");
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });

      it("should return an error if source argument specified with no value", function(done) {
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath 
                        + " -o " + testWorkDir + " --source";

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("ERROR: --source specified with no source ShEx schema file!");
              verifyUsage(error, stdout);
              done();
          });
      });

      it("should return an error if given non-existent file", function(done) {
          var filepath = 'aloha' + Math.random();
          var cmdline = roundtripPath + " --data " + simpleJsonldPath + " --target " + simpleCmumps2FhirPath 
                        + " --source " + filepath;

          // test graceful error handling when filepath does not exist
          commonTest.fileNotExistHandling(cmdline, filepath, done);
      });

      it("should execute a round trip translation using the specified source in translation", function(done) {
          this.timeout(5000);
          commonTest.unlinkDir(testWorkDir);

          var cmdline = roundtripPath + " -d " + jsonldPath + " -t " + cmumps2FhirPath + 
                        " -b " + fhir2CmumpsPath + " -j " + varsPath + " -s " + otherShExPath +  
                        " -o " + testWorkDir;

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.not.contain("WARN: No source ShEx schema file specified.");

              // Verify that each step executed successfully with some output.  The output here looks a little funny
              // because we don't want to look at the canonical paths which are installation dependent. 
              stdout.should.contain(otherShExPath);
              stdout.should.contain("cmumps-patient7.jsonld completed successfully.");
              stdout.should.contain("cmumps2fhir-patient7.ttl completed successfully.");
              stdout.should.contain("back-cmumps2fhir-patient7.ttl completed successfully.");
              stdout.should.contain('json-diff'); 

              // Check the correct files are there.
              fs.existsSync(testWorkDir+'/back-cmumps-patient7.shex').should.be.true;

              verifyValFile(testWorkDir + '/cmumps-patient7.val');
              verifyTtlFile(testWorkDir + '/cmumps2fhir-patient7.ttl');

              verifyValFile(testWorkDir + '/back-cmumps-patient7.val');
              verifyTtlFile(testWorkDir + '/back-cmumps2fhir-patient7.ttl');

              verifyJsonFile(testWorkDir + '/back-cmumps-patient7.json');

              fs.existsSync(testWorkDir+'/diff.out').should.be.true;

              // Cleanup the work directory
              commonTest.unlinkDir(testWorkDir);
              done();
          });
      });
  }); 

  describe("--verbose  option", function() {

      it("should not output hidden warning messages without verbose flag", function(done) {
          this.timeout(5000);
   
          // Create a test directory ahead of time so we get the verbose warning on recreating it
          var testDir = os.tmpdir()+"/test"+Math.random();
          fs.mkdirSync(testDir);

          var cmdline = roundtripPath + " -j " + varsPath + " -s " + otherShExPath +  " -o " + testDir;
                    " -f " + frameFile + " -d " + jsonldPath + " -t " + cmumps2FhirPath + 
                    " -b " + fhir2CmumpsPath; 

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.not.contain("removing it and creating a fresh");
              stderr.should.not.contain("WARN: No RDF root specified; defaulting to urn:local:patient-1.");
              stderr.should.not.contain("does not exist - generating it from");
              commonTest.unlinkDir(testDir);
              done();
          });
      });

      it("should output hidden warning messages with verbose flag", function(done) {
          this.timeout(5000);
   
          // Create a test directory ahead of time so we get the verbose warning on recreating it
          var testDir = os.tmpdir()+"/test"+Math.random();
          fs.mkdirSync(testDir);

          var cmdline = roundtripPath + " -d " + jsonldPath + " -t " + cmumps2FhirPath + 
                        " -b " + fhir2CmumpsPath + " -j " + varsPath + " -s " + otherShExPath + 
                        " -f " + frameFile +  " -o " + testDir + " --verbose";

          exec(cmdline, function (error, stdout, stderr) {
              stderr.should.contain("removing it and creating a fresh");
              stderr.should.contain("WARN: No RDF root specified; defaulting to urn:local:patient-1.");
              stderr.should.contain("does not exist - generating it from");
              commonTest.unlinkDir(testDir);
              done();
          });
      });

  });

});

function verifyJsonFile(filePath) {
  fs.existsSync(filePath).should.be.true;
  fs.statSync(filePath).size.should.not.equal(0);

  var string = fs.readFileSync(filePath,'UTF-8');
  string.should.contain('"@id": "urn:local:patient-1');
  string.should.contain("BUNNY,BUGS");
}

function verifyJsonldFile(filePath) {
  fs.existsSync(filePath).should.be.true;
  fs.statSync(filePath).size.should.not.equal(0);

  var string = fs.readFileSync(filePath,'UTF-8');
  string.should.contain('"@context"');
  string.should.contain('"@graph"');
  string.should.contain("BUNNY,BUGS");
}

function verifyTtlFile(filePath) {
  fs.existsSync(filePath).should.be.true;
  fs.statSync(filePath).size.should.not.equal(0);

  var string = fs.readFileSync(filePath,'UTF-8');
  string.should.contain("urn:local:patient-1");
  string.should.contain("BUNNY,BUGS");
}

function verifyValFile(filePath) {
  fs.existsSync(filePath).should.be.true;
  fs.statSync(filePath).size.should.not.equal(0);
  /ERROR|FAILURE/.test(fs.readFileSync(filePath,'UTF-8').toUpperCase()).should.not.be.true;
}

function verifyUsage(error, stdout) { 
    stdout.should.contain("usage: roundtrip-translation.sh -h | --help");
    stdout.should.contain("-d | --data <JSON-LD data file>");
    stdout.should.contain("-t | --target <ShEx target translation schema file>");
    stdout.should.contain("[-b | --backtarget <ShEx back target translation schema file>]");
    stdout.should.contain("[-f | --frame <JSON-LD frame file>]");
    stdout.should.contain("[-j | --jsonvars <ShEx JSON variables file>]");
    stdout.should.contain("[-o | --output <output directory>]");
    stdout.should.contain("[-r | --root <RDF root>]");
    stdout.should.contain("[-s | --source <ShEx source data schema file>]");
    stdout.should.contain("[-v | --verbose]");
}

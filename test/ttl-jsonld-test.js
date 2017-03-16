/**
 * File: ttl-jsonld-test.js
 * Unit tests for lib/ttl-jsonld.js 
 */

var _ = require("underscore");

var chai = require("chai");
var should = chai.should();
var expect = chai.expect;

var sinon = require("sinon");

var fs = require("fs");
var os = require("os");
var util = require("util");

var commonTest = require("./common-test");
var ttlJsonLd = require("../lib/ttl-jsonld");

var frameFile = __dirname + "/data/cmumps.frame";
var nestedTtlFile = __dirname + "/data/nested-cmumps.ttl";
var simpleTtlFile = __dirname + "/data/simple-cmumps.ttl";

describe("ttl-jsonld", function() {

    it("should exist as an object with the expected API", function() {
        ttlJsonLd.should.exist;
        ttlJsonLd.should.be.a('object');
        ttlJsonLd.ttlLoad.should.be.a('function');
        ttlJsonLd.rdfToJsonLd.should.be.a('function');
    });

    describe("#ttlLoad", function() {
        it("should throw an error if no input data was specified", function() {
            expect(ttlJsonLd.ttlLoad.bind(this)).to.throw(Error,
                "ttlLoad received no RDF data to convert to JSON-LD!");
        });

        it("should throw an error if input data was empty", function() {
            expect(ttlJsonLd.ttlLoad.bind(this, '')).to.throw(Error,
                "ttlLoad received no RDF data to convert to JSON-LD!");
        });

        it("should write an error to the console and return undefined if input is not a valid turtle RDF string", function(done) {
            var errMsg;
            sinon.stub(console, 'error', function(message) { errMsg = message; });
            ttlJsonLd.ttlLoad("A hot pile of garbage").then(function(result) {
                console.error.restore();
                expect(result).to.be.undefined;
                errMsg.should.equal("Error loading turtle text to a RDF graph: Syntax error: unexpected \"A\" on line 1.!");
                done();
            });
        });

        it("should load simple ttl input to an RDF graph", function(done) {
           var ttl = fs.readFileSync(simpleTtlFile, 'utf-8');
           ttlJsonLd.ttlLoad(ttl).then(function(graph) {
              graph.should.be.an('object');
              graph.should.have.keys('triples', 'duplicates', 'actions', 'length', 'rdfstore');
              graph.triples.should.have.length(12);
              done();
           });
        });

        it("should load nested ttl input to an RDF graph", function(done) {
           var ttl = fs.readFileSync(nestedTtlFile, 'utf-8');
           ttlJsonLd.ttlLoad(ttl).then(function(graph) {
              graph.should.be.an('object');
              graph.should.have.keys('triples', 'duplicates', 'actions', 'length', 'rdfstore');
              graph.triples.should.have.length(19);
              done();
           });
        });
    });

    describe("#rdfToJsonLd", function() {

        it("should throw an error if no input data was specified", function() {
            expect(ttlJsonLd.rdfToJsonLd.bind(this)).to.throw(Error,
                "rdfToJsonLd received no RDF data to convert to JSON-LD!");
        });

        it("should throw an error if no input data was empty", function() {
            expect(ttlJsonLd.rdfToJsonLd.bind(this, '')).to.throw(Error,
                "rdfToJsonLd received no RDF data to convert to JSON-LD!");
        });

        it("should write an error to the console and return undefined if input data is not valid RDF", function(done) {
            var errMsg;
            sinon.stub(console, 'error', function(message) { errMsg = message; });
            ttlJsonLd.rdfToJsonLd("A cold pile of garbage").then(function(result) {
                console.error.restore();
                expect(result).to.be.undefined;
                errMsg.should.equal("rdfToJsonLD error: Unable to build JSON graph!");
                done();
            });
        });

        it("should convert simple ttl to JSON-LD", function(done) {

           var ttl = fs.readFileSync(simpleTtlFile, 'utf-8');
           ttlJsonLd.ttlLoad(ttl).then(function(graph) {
               graph.should.be.an('object');
               ttlJsonLd.rdfToJsonLd(graph).then(function(json) { 
                   json[0].should.deep.equal(
                       { '@id': 'urn:local:patient-1',
                         'http://hokukahu.com/schema/cmumpss#identifier': '2-000007',
                         'http://hokukahu.com/schema/cmumpss#phone-2': '555 555 5555',
                         'http://hokukahu.com/schema/cmumpss#street_address-2': '100 MAIN ST',
                         'http://hokukahu.com/schema/cmumpss#city-2': 'ANYTOWN',
                         'http://hokukahu.com/schema/cmumpss#state-2': 'NEW YORK',
                         'http://hokukahu.com/schema/cmumpss#zip_code-2': '60040',
                         'http://www.w3.org/2000/01/rdf-schema#label': 'BUNNY,BUGS',
                         'http://hokukahu.com/schema/cmumpss#emergency_contact-2': 'RUNNAH, ROAD',
                         'http://hokukahu.com/schema/cmumpss#ephone-2': '555 555 5558',
                         'http://hokukahu.com/schema/cmumpss#estreet_address-2': '7000 InternalTest Boulevard',
                         'http://hokukahu.com/schema/cmumpss#ecity-2': 'ALBUQUERQUE',
                         'http://hokukahu.com/schema/cmumpss#ezip-2': '55555' } 
                   );
                   done();
               });
           });
        });

        it("should convert nested ttl to JSON-LD with a frame", function(done) {
            var ttl = fs.readFileSync(nestedTtlFile, 'utf-8');
            var frame = JSON.parse(fs.readFileSync(frameFile, 'utf-8'));
            ttlJsonLd.ttlLoad(ttl).then(function(graph) {
                graph.should.be.an('object');
                ttlJsonLd.rdfToJsonLd(graph, frame).then(function(jsonld) { 
                    jsonld.should.be.an('object');
                    jsonld.should.deep.equal({ 
                        '@context': 'https://raw.githubusercontent.com/rdf-pipeline/translators/master/data/fake_cmumps/patient-7/context.jsonld',
                        '@graph': [ 
                             { id: 'urn:local:patient-1',
                               'city-2': 'ANYTOWN',
                               'dob-2': { type: 'xsd:date', value: '1990-01-01' },
                               'ecity-2': 'ALBUQUERQUE',
                               'emergency_contact-2': 'RUNNAH, ROAD',
                               'ephone-2': '555 555 5558',
                               'erelationship-2': 
                                { id: '_:b0',
                                  identifier: '8140-20',
                                  label: 'OTHER RELATIONSHIP' },
                               'estreet_address-2': '7000 InternalTest Boulevard',
                               'ezip-2': '55555',
                               'fmp-2': { id: '_:b1', identifier: '8110-20', label: '20' },
                               identifier: '2-000007',
                               'phone-2': '555 555 5555',
                               'state-2': 'NEW YORK',
                               'street_address-2': '100 MAIN ST',
                               'zip_code-2': '60040',
                               label: 'BUNNY,BUGS' } 
                        ] 
                    });
                    done();
                }); 
            });
        });

        it("should filter extraneous Bnodes for specified attributes", function(done) {
            var ttl = fs.readFileSync(nestedTtlFile, 'utf-8');
            var frame = JSON.parse(fs.readFileSync(frameFile, 'utf-8'));

            ttlJsonLd.ttlLoad(ttl).then(function(graph) {
                graph.should.be.an('object');

                // Set the ids where we want to filter out blank nodes that are referenced only once.
                // CMUMPS uses this to filter out ids that are added by the jsonld library that would  differ
                // from the original json input on a round trip translation.
                var filterBnodeAttrs = [ 'id', '_id', '@id' ];

                ttlJsonLd.rdfToJsonLd(graph, frame, filterBnodeAttrs).then(function(json) { 
                    json.should.be.an('object');
                    json.should.have.all.keys(['@context', '@graph']);
                    json['@graph'].should.have.length(1);
                    json['@graph'][0].should.deep.equal({ 
                               'id': 'urn:local:patient-1',
                               'city-2': 'ANYTOWN',
                               'dob-2': { type: 'xsd:date', value: '1990-01-01' },
                               'ecity-2': 'ALBUQUERQUE',
                               'emergency_contact-2': 'RUNNAH, ROAD',
                               'ephone-2': '555 555 5558',
                               'erelationship-2': { identifier: '8140-20', label: 'OTHER RELATIONSHIP' },
                               'estreet_address-2': '7000 InternalTest Boulevard',
                               'ezip-2': '55555',
                               'fmp-2': { identifier: '8110-20', label: '20' },
                               identifier: '2-000007',
                               'phone-2': '555 555 5555',
                               'state-2': 'NEW YORK',
                               'street_address-2': '100 MAIN ST',
                               'zip_code-2': '60040',
                               'label': 'BUNNY,BUGS' 
                    });
                    done();
                }); 
            });
        });
    });
});

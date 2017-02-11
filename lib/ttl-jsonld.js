// Converts a RDF to JSON or JSON-LD. 

var _ = require('underscore');

var Promise = require('promise');
var rdfstore = require('rdfstore');
var jsonld = require('jsonld').promises;

module.exports = {
   ttlLoad: ttlLoad,
   rdfToJsonLd: rdfToJsonLd
};

/**
 * Converts the given graph object into a JSON LD Graph object using an optional
 * frame on the corresponding Component.
 *
 * @param input RDF JS Interface Graph object
 * @param frame JSON-LD Frame object
 * @param filterBNodeAttrs an array with the attribute names that should be filtered if they
 *        hold a blank node name that is referenced only once.
 *
 * @see http://json-ld.org/spec/latest/json-ld-framing/
 */
function rdfToJsonLd(input, frame, filterBNodeAttrs) {

    if (_.isEmpty(input)) { 
        throw Error("rdfToJsonLd received no RDF data to convert to JSON-LD!");
    }

    return buildJSON(input).then(function(json) {

        if (frame) {
            return new Promise(function(resolve) { 
                var framedJson = jsonld.frame(json, frame);
                resolve(framedJson); 
            }).then(framedJson => { 

                return filterBNodes(framedJson, filterBNodeAttrs); 

            }).catch(function(e) {
                throw Error("Unable to process JSONLD frame: ", e.message + "!");
            });

       } else {

            json = filterBNodes(json, filterBNodeAttrs);
            if (json.length == 1) 
               json[0];

           return json;
       }
    }).catch(function(e) {
        console.error('rdfToJsonLD error: '+ e.message);
    });
}

/**
 * Loads turtle input into a RDF JS Interface Graph object
 *
 * @param input RDF data to be parsed and loaded or an URI where the data will be retrieved after performing content negotiation
 *
 * @see https://www.w3.org/TR/rdf-interfaces/#graphs
 */
function ttlLoad(input) {

    if (_.isEmpty(input)) { 
        throw Error("ttlLoad received no RDF data to convert to JSON-LD!");
    }

    var type = "text/turtle"; // Could modify this in the future to support other types
    return denodeify(rdfstore, 'create', {}).then(function(store){
        return Promise.resolve().then(function(){
            return denodeify(store, 'load', type, input, {});

        }).then(function(){
            return denodeify(store, 'graph');

        }).then(function(graph){
            graph.rdfstore = store;
            return graph;
        });
    }).catch(function(e) {
        console.error("Error loading turtle text to a RDF graph: " + e.message + "!");
    });
}

/**
 * Generate a list of blank nodes, with a count of the number of times referenced
 * and an array that has the keys to a path to the first blank node reference.
 *
 * @param graph a JSON-LD graph
 * @param filterAttrs Array with the attribute names to examine
 * @param bNodes a hash of the blank nodes found so far.  Initially undefined.
 * @param jspath an array with the keys to the path currently being processed.
 */
function bNodeHash(graph, filterAttrs, bNodes, jspath) { 
    bNodes = bNodes || {};
    jspath = jspath || [];

    _.mapObject(graph, function(val, key) { 
     
        if (_.isObject(val)) {
            bNodeHash(val, filterAttrs, bNodes, jspath.concat([key]));

        } else { 
      
             // Is the current key one where to filter single blank nodes and does it have a blank node? 
             if (_.contains(filterAttrs, key) && val.startsWith('_:')) { 

                 if (_.isUndefined(bNodes[val]))   {
                     // First time we've seen this key with its blank node.  Record it
                     bNodes[val] = { count: 1,
                                     jspath: jspath.concat([key]).slice() };
                 } else 
                     // We've seen this one before.  Increment the count - we won't be filtering it
                     bNodes[val].count++;

                 jspath = [];
             }
        }
    });
   
    return bNodes;
}

/**
 * Walks the graph looking for blank node IDs that were added by the jsonld library.  Blank
 * node IDs that are referenced only once are removed.  This is done to ensure we return
 * to the original JSON-LD input without any RDF remnants
 * 
 * @param graph - a JSON or JSON-LD graph
 * @param filterAttrs Array with the attribute names to examine
 *
 * @return the graph will be updated to remove RDF ID blank nodes 
 */
function filterBNodes(graph, filterAttrs) { 

    // Walk a hash of all graph blank nodes with their refererence count and path
    _.mapObject(bNodeHash(graph, filterAttrs), function(val, key) { 

        if (val.count == 1) {  
            // Referenced this one only once - so delete it

            var element = graph;
            var last = val.jspath.length-1;

            // Apply each key to get to the element to delete; once there, delete it.
            _.each(val.jspath, function(key, index) {
               if (index == last) 
                   delete element[key];
               else 
                  element = element[key]; 
            });
        }
    }); 

   return graph;
}

/**
 * Promise of JSON-LD array of objects for the given graph.
 *
 * @param graph RDF JS Interface Graph object
 */
function buildJSON(graph) {

    return new Promise(function(resolve) {
        var jsonGraph = [];
        var subject = indexedSubject.bind(this, {}, jsonGraph);
        var subj, pred, obj;
        graph.forEach(function(triple) {
            subj = subject(triple.subject);
            pred = triple.predicate.nominalValue;
            obj = objectValue(triple.object);
            pushTriple(subj, pred, obj);
        });
        resolve(jsonGraph);
    }).catch(function(e) {
        throw Error("Unable to build JSON graph!");
    });
}

/**
 * Returns a JSON-LD object for the given subject using existing subjects where
 * possible.
 *
 * @param subjects hash of existing subjects by their nominal value to their position in jsonGraph
 * @param jsonGraph array of existing subject objects
 * @param subject an RDF term implementing RDF JS Interface
 */
function indexedSubject(subjects, jsonGraph, subject) {

    var value = subject.nominalValue;
    if (typeof subjects[value] === 'undefined') {
        if (subject.interfaceName === 'BlankNode') {
            jsonGraph.push({
                '@id': subject.toString()
            });
        } else {
            jsonGraph.push({
                '@id': value
            });
        }

        subjects[value] = jsonGraph.length - 1;
    }

    return jsonGraph[subjects[value]];
}

/**
 * Converts the RDF term into a JSON-LD object
 *
 * @param object an RDF term implementing RDF JS Interface
 */
function objectValue(object) {

    var value = object.nominalValue;
    if (object.interfaceName === 'NamedNode') {
        return {
            '@id': value
        };
    } else if (object.interfaceName === 'BlankNode') {
        return {
            '@id': object.toString()
        };
    } else if (object.language) {
        return {
            '@language': object.language,
            '@value': value
        };
    } else if (object.datatype && object.datatype.toString() != 'http://www.w3.org/2001/XMLSchema#string') {
        return {
            '@type': object.datatype.toString(),
            '@value': value
        };
    } else {
        return value;
    }
}

/**
 * Adds the key value to the given JSON-LD object.
 *
 * @param object JSON-LD object
 * @param key the nominal value of the predicate
 * @param value the object value of the property as a JSON-LD object
 */
function pushTriple(object, key, value) {

    if (key === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        if (typeof object['@type'] === 'undefined') {
            object['@type'] = [];
        }
        object['@type'].push(value['@id']);
    } else {
        if (typeof object[key] === 'undefined') {
            object[key] = value;
        } else {
            if (!Array.isArray(object[key])) {
                object[key] = [object[key]];
            }
            object[key].push(value);
        }
    }
}

/**
 * Converts cb style async functions to promise style functions
 * Could be rewritten to avoid using non-standard Promisejs using callbacks 
 */
function denodeify(object, functionName /* arguments */) {
    var args = _.toArray(arguments).slice(2);
    return Promise.denodeify(object[functionName]).apply(object, args);
}


/**
 * chcs utility functions. Here until they find a home elsewhere.
 */

var decomment = require('decomment');  // strips javascript comments out of a JSON string
var fs = require('fs');  // node file system
var _ = require('underscore');
var Av = require('autovivify');


/**
 * Pretty print a JSON object.
 * @param {object} json - input, req
 * @returns {string} - indented object suitable for logging or printing
 */

function pp(json) {
    return JSON.stringify(json, null, 2);
}



/**
 * Deep clone of input object o for any type. Protect against modification of object o.
 * @param {object} o - input object
 * @returns {object} - copy of o, same contents different memory
 */

function clone(o) {
    return JSON.parse(JSON.stringify(o));
}


/**
 * Slurp returns the contents of filename as a utf8 string.
 * @param {string} filename - req input
 * @returns {string} - contents of file as a utf8 string
 *
 * TODO mike@carif.io: Does nodejs have a pathname repr?
 */
function slurp(filename) {
    // TODO mike@carif.io: async this eventually
    // https://nodejs.org/api/fs.html#fs_fs_readfilesync_file_options
    return fs.readFileSync(filename, "utf8");
}




/**
 * Load a file and return it as a JSON object. Remove comments.
 * @param {string} filename - req input
 * @returns {object} - JSON object from filename, comments removed as a utf8 string
 */

function load(filename) {
    var s = slurp(filename);
    var j = decomment(s);
    // logger.debug(j);
    return JSON.parse(j);
}


/**
 * An object is considered jsonld if it has '@graph' and '@context' keys.
 *
 * @param object
 * @returns {boolean}
 */
function isJsonld(object) {
    return typeof(object) == 'object' && ('@graph' in object) && ('@context' in object);
}


// var MongoClient = require('mongodb').MongoClient;

// This function is useful iff you have direct access to a chcs mongodb source and want to use it to compare
// it to data you from a webservice. It is specific to a particular document format, nonetheless it offers a
// prototype for use elsewhere. Makes it worth saving.

function getAllPatientGraph(url, db, patientId) {
    function find(db, patientId, collections) {

        // Connect to the db
        MongoClient.connect(url, function(err, db) {
            if(err) throw new Error(err);
            var query = {};
            query['patient-' + c + '.id'] = '2-' + patientId;
            return _.flatten(collections.map(function(c) {return db[c].find(query).toArray();}));
        });
    }
    return {
        '@context': null,
        '@graph': find(db, patientId, ['101', '44_2', '311', '8810', '8810_2', '55', '55_5', '52', '74', '70_5', '63', '100417'])
    };
}





/**
 * Return the frontier of a tree as represented by a javascript object. Defined as a list of key/value pairs where
 * the key is a full path to a value and the value is the value of a leaf node.
 * Example: frontier({x: {y:1, z:2}}) => [ ["x.y", 1], ["x.z", 2]].
 * Note that the frontier({x: {y:1, z:2}}).map(function(i) { return i[0]; }) => ['x.y', 'x.z']
 * frontier({x: {y:1, z:2}}).map(function(i) { return i[1]; }) => [1, 2]
 *
 * @param {object} object -- input, find the frontier of this object.
 * @returns {List[List[2]]} -- "nested" key/value pairs
 */
function frontier(object, prefix) {
    if (_.isObject(object)) {
        var result = [];
        // Note: keys may not be traversed in lexical order
        for (key in object) {
            // TODO: would be nice to pass in the delimiter instead of dot ('.'). Crufts up the function signiture.
            frontier(object[key], prefix ? prefix + '.' + key : key).forEach(function (i) {result.push(i); });
        }
        return result;
    } else {
        // A scalar. If it has a prefix, then its part of some object. Otherwise its not are return the empty list.
        if (prefix) return [[prefix, object]]; else return [];
    }
}

/**
 * Return all values in an object tree. Uses frontier()
 * @param {object} object -- input
 * @returns {Array[object]} -- the values
 */
function values(object) { return frontier(object).map(function (l) {
    return l[1];
}); }


/**
 * Return all keys in an object tree. Uses frontier()
 * @param {object} object -- input
 * @returns {Array[string]} -- the keys, suitable for JSONPath input
 */
function keys(object) { return frontier(object).map(function (l) {
    return l[0];
}); }


/**
 * Given two objects, left and right, return the difference of values in left and not in right.
 * @param {object} left, right -- input
 * @returns {Array[object]} -- the difference
 * @see{intersection}
 */
function diffObjects(left, right) {
    var vleft = values(left); var vright = values(right);
    return _.difference(vleft, vright);
}

/**
 * Given two objects, left and right, return the intersection of values in left and right.
 * @param {object} left, right -- input
 * @returns {Array[object]} -- the intersection
 * @see{intersection}
 */
function overlapObjects(left, right) {
    var vleft = values(left); var vright = values(right);
    return _.intersection(vleft, vright);
}


/**
 * Turn an autovivified object into an actual one.
 * @param av
 */

// devivify and partition are used for graph-translate which is a "destructive" or "input modifying" approach to
// translation.

function devivify(av) {
    var result;
    if (_.isArray(av)) return av.map(devivify);
    try {
        // TODO: autovivify module breaks in node 6
        return av.inspect();
    } finally {
        if (_.isObject(av)) {
            result = {};
            for (k in av) {
                // Only devivify direct properties. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
                if (av.hasOwnProperty(k)) {
                    result[k] = devivify(av[k]);
                }
            }
            return result;
        } else {
            return av;
        }
    }
}

/**
 * Partition the input object o into two parts, "used" and "unused". Used parts are listed as object expressions, e.g.
 * o['x']['y'] is considered used iff "['x']['y']" is in the used array usedExpressions. In o, if an attributed isn't used, it's considered unused.
 * The function partition() returns {used: tree, unused: tree}
 * For example, given:
 * o: {x: {y: 1}, z: 2, a: {b: {c: 1}}}, then partition(o, ["['x']['y']"]) => {used: {x: {y: 1}}, unused: {z: 2, a: {b: {c: 1}}}}
 *
 * @param {object} o -- the object to be partitioned into used and unused.
 * @param {Array[String]} usedExpressions -- an array of object expressions. These expressions identified which keys in o have been used.
 * @returns {{used: tree, unused: tree}}
 *
 * TODO mike@carif.io: Using prototypal inheritance create a kind of object where referencing an object attribute moves that attribute from
 * unused to used. Then you never lose an object value, you're just changing the access pattern.
 */

function partition(o, usedExpressions) {
    var unused = clone(o);
    var used = new Av();
    usedExpressions.forEach(function (/* expression */ e /*:string*/) {
        // TODO: can this be done without eval using Object methods, like __defineGetter__ and __defineSetter__?
        var command = 'if (typeof(unused' + e + ') != "undefined") { used' + e + '= o' + e + '; delete unused' + e + '; }';
        try {
            eval(command);
        } catch (err) {
            // TODO: swallowing all errors other than a type error is probably too inclusive,
            // but it will take a lot of investigation to deduce just the correct set.
            if (!(err instanceof TypeError)) throw e;
        }
    });
    return {used: devivify(used), unused: unused};
}


// merge two objects right to left.
function merge(passed, defaults) {
    var result = clone(defaults);
    for (var k in passed) {
        if (passed.hasOwnProperty(k)) {
            result[k] = passed[k];
        }
    }
    return result;
}


// Export the actual functions here.
// Export the actual functions here. Make sure the names are always consistent.
[ isJsonld, pp, clone, slurp, load, getAllPatientGraph, frontier, merge,
    values, keys, diffObjects, overlapObjects, devivify, partition ].forEach(function(f) { module.exports[f.name] = f; });

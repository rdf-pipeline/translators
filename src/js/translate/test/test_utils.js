/**
 * Mike Carifio <mike@carif.io> (https://mike.carif.io/)
 */

var prefix = '../../translate/'; // translate and graph_tranlate share underlying plumbing
var cmumps_utils = require(prefix + 'util/cmumps_utils');


/**
 * Given a cmumps jsonld object, return a variant of that object where @graph is randomized.a
 * @param cmumpsObject
 * @returns {Suite|a|*}
 */
function cloneReorderGraph(cmumpsObject) {
    var result = cmumps_utils.clone(cmumpsObject);
    var graph = result['@graph'];
    var graphLength = graph.length;
    var range = graphLength - 1;
    for (var i = 0; i < graphLength; ++i) {
        var left = Math.floor(Math.random() * range);
        var right = Math.floor(Math.random() * range);
        var temp = graph[left];
        graph[left] = graph[right];
        graph[right] = temp;
    }
    return result;
}

[cloneReorderGraph].forEach(function(f) { module.exports[f.name] = f; });
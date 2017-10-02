/**
 * Mike Carifio <mike@carif.io> (https://mike.carif.io/)
 */

var prefix = '../../translate/'; // translate and graph_tranlate share underlying plumbing
var chcs_utils = require(prefix + 'util/chcs_utils');


/**
 * Given a chcs jsonld object, return a variant of that object where @graph is randomized.a
 * @param chcsObject
 * @returns {Suite|a|*}
 */
function cloneReorderGraph(chcsObject) {
    var result = chcs_utils.clone(chcsObject);
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
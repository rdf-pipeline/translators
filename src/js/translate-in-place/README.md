# cmumps Graph Translate Module (and Friends)

This directory consists of the following modules:

* `graph_cmumps2fhir_*`: a set of translation functions in translation modules that take cmumps object types like 
  'Prescription-52' and translate them to their fhir analog like 'MedicationDispense'. The caller needs to pass in the correct
  cmumps analog input (e.g. Prescription-52). See the `cmumps.extract*` utility functions below, which facilitate picking out the right
  input.

The key difference between translate-in-place and translate, is that while translate simply returns a translation 
without modifying the original graph,  translate-in-place modifies the input graph by directly replacing the
original version of the data with the translated pieces.  It leaves untranslated items in the original graph
as they were, still untranslated.  The result is a graph with a mix of original input with translated pieces 
replaced.   Translate-in-place functions return both a translation and the updated graph. 

```javascript
var cmumps = require('rdf-pipeline/translators/src/js/translate/src/js/translate/cmumps.js');
var cmumps_utils = require('rdf-pipeline/translators/src/js/translate/util/cmumps_utils.js');
var graph_cmumps2fhir_prescriptions = require('rdf-pipeline/translators/src/js/translate-in-place/graph_cmumps2fhir_prescriptions');
var cmumpsInputJsonld = {...}; // input from somewhere
var cmumpsInputJsonldSideEffected = cmumps_utils.clone(cmumpsInputJsonld);

var result = graph_cmumps2fhir_prescriptions.translatePrescriptions(cmumpsInputJsonldSideEffected, cmumps.extractPrescriptions); // might not be exactly right
console.log(result.length); // return an array of translations, cmumps Prescription-52 -> fhir MedicationDispense
console.log(result[0].used); // a *deep copy* of what attributes where used in each Prescription-52 translation
console.log(result[0].fhir); // a translation of the Prescription-52 items in cmumpsInputJsonld['@graph'] as an Array[object]
```

Note:

* the input argument `cmumpsInputJsonldSideEffected` is modified. The caller is expected to clone the input if s/he
doesn't want it modified.

* The structure used for the translation is returned as `.used`.

* The translation is returned as `.fhir`.

* The cmumps attributes that participate in generating `.fhir` are returned as `.participants`.

* assuming that the translators are functional (no side-effects), then 
`cmumps2fhir_prescriptions.translatePrescription(result[0].used)` should return
`result[0].fhir` repeatedly.

* if there are no Prescription-52's on input, then `[]` is returned.

* if a particular Prescription-52 can't be translated, then it is skipped. Other translators "later" may be able to
translate it.

* `0 <= result.length <= cmumps.extract*Thing*(cmumpsInputJsonld).length`


Note that this module uses common functionality from `..\translate`:

* `cmumps.js`: 

  - a set of functions to parse cmumps string values to objects, nicknamed microparsers. Some of these objects
    are invented as intermediate forms to be immediately translated to a target like fhir.

  - a set of "type predicates" that return true/false if an cmumps object is of a particular type like "patient" or
    "medication". Saves from memorizing type codes.

  - a set of extractors, that can dig out objects or arrays of objects of the types above out of the *entire* cmumps input
    object. Examples include `cmumps.extractMedications()` or `cmumps.extractPatient()`.
   


* `fhir.js`:

  - a set of functions that "know" how to update a fhir bundle with additional cmumps information in the fhir "extension"
    format: `fhir.addParticipants()` and `fhir.addWarnings()`.
    
  - a set of extractors, that can dig out object or array of objects of various fhir types, such as 'Patient' or 
    'MedicationDispense'.
                          
     
Some example scripts are in "./utils":

* `graph-cmumps-file.js`: loads a cmumps jsonld object and translates it. Can output json or xml. Can output only particular parts
  of a translation, e.g. demographics or medications. More at the [utils README](../utils/README.md). This is the
  "graph analog" of `../translate/utils/cmumps-file.js`.
     

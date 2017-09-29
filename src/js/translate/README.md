# chcs Translate Module (and Friends)

This directory consists of the following modules:

* `chcs.js`: 

  - a set of functions to parse chcs string values to objects, nicknamed microparsers. Some of these objects
    are invented as intermediate forms to be immediately translated to a target like FHIR, for example postal addresses.

  - a set of "type predicates" that return true/false if a chcs object is of a particular type like "Patient" or
    "Prescription". Saves memorizing type codes.

  - a set of extractors, that can dig out objects or arrays of objects of the types above out of the *entire* chcs input
    object. Examples include `chcs.extractMedications()` or `chcs.extractPatient()`.
   

Note that the chcs "data model" is relatively simple. The `@graph` portion of the input contains a set of data "reports" 
about a single patient. The reports are in no particular order and
are of various kinds (e.g. demographics or medications). The data set may or may not be "complete"; it's just the data
reported on input. Since the `@graph` is an array of objects, each array item has a `type` key which designates
how to interpret that item. This key can also be used to drive the translator(s).


* `fhir.js`:

  - a set of functions that "know" how to update a fhir bundle with chcs information
    
  - a set of extractors, that can dig out object or array of objects of various fhir types, such as 'Patient' or 
    'MedicationDispense'.
                          
* `chcs2fhir_{,simple_}*`: a set of translation functions in translation modules that take chcs objects types like 
  'Patient-2' and translate them to their fhir analog like 'Patient'. There are two types of translators: a simple version,
  e.g. `chcs2fihr_simple_demographics,js` that just translates input to output and the more sophisticated (but complicated)
  `chcs2fhir_*.js`, which adds data "provenance" information to the bundle. The caller needs to pass in the correct
  chcs analog input (e.g. Patient-2). See the `chcs.extract*` functions above, which facilitate picking out the right
  input.
     
     
Some example scripts are in "./utils":

* `chcs-file.js`: loads a chcs jsonld object and translates it in either json or xml. Can output only particular parts
  of a translation, e.g. demographics or medications. More at the [utils README](../utils/README.md).
     
Here's an example run:
     
```bash
./util/chcs-file.js  ../../data/fake_chcs/patient-7/chcs-patient7.jsonld 
```
or to get xml output

```bash
./util/chcs-file.js --output=xml ../../data/fake_chcs/patient-7/chcs-patient7.jsonld
```

The xml output is a quick sanity check to see if the FHIR json output is well-formed FHIR.

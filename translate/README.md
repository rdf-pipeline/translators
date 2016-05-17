# cmumps Translate Module (and Friends)

This directory consists of the following modules:

* `cmumps.js`: 

  - a set of functions to parse cmumps string values to objects, nicknamed microparsers. Some of these objects
    are invented as intermediate forms to be immediately translated to a target like FHIR, for example postal addresses.

  - a set of "type predicates" that return true/false if a cmumps object is of a particular type like "Patient" or
    "Prescription". Saves memorizing type codes.

  - a set of extractors, that can dig out objects or arrays of objects of the types above out of the *entire* cmumps input
    object. Examples include `cmumps.extractMedications()` or `cmumps.extractPatient()`.
   

Note that the cmumps "data model" is relatively simple. The `@graph` portion of the input contains a set of data "reports" 
about a single patient. The reports are in no particular order and
are of various kinds (e.g. demographics or medications). The data set may or may not be "complete"; it's just the data
reported on input. Since the `@graph` is an array of objects, each array item has a `type` key which designates
how to interpret that item. This key can also be used to drive the translator(s).


* `fhir.js`:

  - a set of functions that "know" how to update a fhir bundle with cmumps information
    
  - a set of extractors, that can dig out object or array of objects of various fhir types, such as 'Patient' or 
    'MedicationDispense'.
                          
* `cmumps2fhir_{,simple_}*`: a set of translation functions in translation modules that take cmumps objects types like 
  'Patient-2' and translate them to their fhir analog like 'Patient'. There are two types of translators: a simple version,
  e.g. `cmumps2fihr_simple_demographics,js` that just translates input to output and the more sophisticated (but complicated)
  `cmumps2fhir_*.js`, which adds data "provenance" information to the bundle. The caller needs to pass in the correct
  cmumps analog input (e.g. Patient-2). See the `cmumps.extract*` functions above, which facilitate picking out the right
  input.
     
     
Some example scripts are in "./utils":

* `cmumps-file.js`: loads a cmumps jsonld object and translates it in either json or xml. Can output only particular parts
  of a translation, e.g. demographics or medications. More at the [utils README](../utils/README.md).
     
Here's an example run:
     
```bash
./util/cmumps-file.js  ../../data/fake_cmumps/patient-7/cmumps-patient7.jsonld 
```
or to get xml output

```bash
./util/cmumps-file.js --output=xml ../../data/fake_cmumps/patient-7/cmumps-patient7.jsonld
```

The xml output is a quick sanity check to see if the FHIR json output is well-formed FHIR.

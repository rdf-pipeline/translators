# Translators

Translate data from a source data format, data model, vocabulary or datatype to a target data format, data model, vocabulary or datatype.

This repository holds data translators that were designed to work under the RDF Pipeline Framework.  They are provided here mostly as examples, but may also be used as utilities.  

# Project Layout

The project is partitioned by `./data` and `./translate`:

<pre>
data/
├── fake_chcs/
│   ├── patient-7/  # data for a ficticious patient 7
│   │   ├── aalta-patient7-procedures.jsonld  # ... comes from two data files, aalta
│   │   ├── chcs-patient7.jsonld  # ... and chcs
│   │   ├── context.jsonld  # the context for chcs-patient7.jsdonld
│   │   ├── expected/  # expected translations, suitable for diffing
│   │   │   ├── chcs-patient7-demographics.json
│   │   │   ├── chcs-patient7-demographics.xml
│   │   │   ├── chcs-patient7-diagnoses.json
│   │   │   ├── chcs-patient7-diagnoses.xml
│   │   │   ├── chcs-patient7.json
│   │   │   ├── chcs-patient7-medications.json
│   │   │   ├── chcs-patient7-medications.xml
│   │   │   ├── chcs-patient7-procedures.json
│   │   │   ├── chcs-patient7-procedures.xml
│   │   │   ├── chcs-patient7.ttl
│   │   │   └── chcs-patient7.xml
│   │   ├── output/
│   │   │   └── Makefile # run translations in ../*.jsonld, generating output here
│   │   ├── README.md # more details
src/
├── js/
│   ├── translate/           # translates chcs data to fhir with an immutable graph 
│   ├── translate-in-place/  # translates chcs to fhir in place within a mutable graph 
└── shex/ # ShEx chcs to FHIR translations - see https://www.w3.org/2001/sw/wiki/ShEx and 
          # https://github.com/shexSpec
</pre>


# Useful Commands

Where we can, we use npm to run scripts:

* test: `npm test` -- runs the regression test suite, see `package.json:scripts.test`. More at [npm-scripts](https://docs.npmjs.com/misc/scripts), especially for script names, like `test`.
* config: `npm config [ list | ls -l ]` -- reports on your local configuration


# Smoke Test

To use consume this module directly from github:

```bash
npm install --save 'git+https://www.github.com/rdf-pipeline/translators.git'  # Add #branch if installing a branch
cd node_modules/translators
npm test # run the regression tests with 
```

# References

The translator implementation relies on [JSONPath](http://goessner.net/articles/JsonPath/).

# Notes

On the github branch `synthetic`, there is the start of a demonstration to support "synthetic data". The data is itself encoded as tab separated values
(TSV). There is an example translator `chcs2sd[_simple]?_diagnosis` and its inverse `sd2chcs_diagnosis`. This investigation isn't yet complete and the example is untested. 
It is meant to demonstrate how to use the library for a non-FHIR output format and how to do
a "reverse" translation to the chcs format, for example for generating test data or for loading a persistent data store. We hope to return it, time permitting.

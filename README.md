# Translators

Translate data from a source data format, data model, vocabulary or datatype to a target data format, data model, vocabulary or datatype.

This repository holds data translators that were designed to work under the RDF Pipeline Framework.  They are provided here mostly as examples, but may also be used as utilities.  

# Project Layout

The project is partitioned by `./data` and `./translate`:

<pre>
data/
├── fake_cmumps/
│   ├── patient-7/  # data for a ficticious patient 7
│   │   ├── aalta-patient7-procedures.jsonld  # ... comes from two data files, aalta
│   │   ├── cmumps-patient7.jsonld  # ... and cmumps
│   │   ├── context.jsonld  # the context for cmumps-patient7.jsdonld
│   │   ├── expected/  # expected translations, suitable for diffing
│   │   │   ├── cmumps-patient7-demographics.json
│   │   │   ├── cmumps-patient7-demographics.xml
│   │   │   ├── cmumps-patient7-diagnoses.json
│   │   │   ├── cmumps-patient7-diagnoses.xml
│   │   │   ├── cmumps-patient7.json
│   │   │   ├── cmumps-patient7-medications.json
│   │   │   ├── cmumps-patient7-medications.xml
│   │   │   ├── cmumps-patient7-procedures.json
│   │   │   ├── cmumps-patient7-procedures.xml
│   │   │   ├── cmumps-patient7.ttl
│   │   │   └── cmumps-patient7.xml
│   │   ├── output/
│   │   │   └── Makefile # run translations in ../*.jsonld, generating output here
│   │   ├── README.md # more details
└── {*-}translate{-*} # translates cmumps data to various formats, fhir to start
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
(TSV). There is an example translator `cmumps2sd[_simple]?_diagnosis` and its inverse `sd2cmumps_diagnosis`. This investigation isn't yet complete and the example is untested. 
It is meant to demonstrate how to use the library for a non-FHIR output format and how to do
a "reverse" translation to the cmumps format, for example for generating test data or for loading a persistent data store. We hope to return it, time permitting.
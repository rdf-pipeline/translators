# Patient-7 data

This directory contains scrubbed data for a prototypical patient `patient-7`.

* cmumps-patient7.jsonld -- a complete example
* cmumps-patient7-labs.jsonld.gz -- an eventual labs example
* cmumps-patient7-labs-notes.txt
* cmumps-patient7-medications1.jsonld -- a cmumps-patient7 with a single medication 
* cmumps-patient7-medications2.jsonld -- a cmumps-patient7 with a single different medication
* cmumps-patient7-medications3.jsonld -- a cmumps-patient7 with a single different medication
* cmumps-patient7-penicillan-allergy.jsonld.gz -- tbs
* cmumps-patient7-topicals.jsonld.gz -- tbs
* context.jsonld -- jsonld context for cmumps-patient7.jsonld


# Directory Layout

Aside from the data input files above, these directories are important:

```.
├── cmumps-patient7.jsonld  # enumerated above
├── cmumps-patient7-labs.jsonld.gz
├── cmumps-patient7-labs-notes.txt
├── cmumps-patient7-medications1.jsonld
├── cmumps-patient7-medications2.jsonld
├── cmumps-patient7-medications3.jsonld
├── cmumps-patient7-penicillan-allergy.jsonld.gz
├── cmumps-patient7-topicals.jsonld.gz
├── context.jsonld
├── expected
│   ├── *.json
│   ├── *.xml
│   ├── *.ttl  # turtle files
├── output
│   ├── *.json
│   ├── *.ttl
│   ├── *.xml
│   └── Makefile # translates ../cmumps-*.jsonld for all parts (all, demographics, etc) in each format (.json, .xml, .ttl)
```

To generate all translations and then compare to expected output:

```bash
cd output; make clean diff  ## cleans all built artifacts, rebuilds them and compares output to ../expected
... lotsa output ...
```

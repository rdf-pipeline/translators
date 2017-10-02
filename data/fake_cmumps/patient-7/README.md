# Patient-7 data

This directory contains scrubbed data for a prototypical patient `patient-7`.

* aalta-patient7-procedures.jsonld
* cmumps-patient7.jsonld -- a complete example
* context.jsonld -- jsonld context for cmumps-patient7.jsonld


# Directory Layout

Aside from the data input files above, these directories are important:

```.
├── cmumps-patient7.jsonld  # enumerated above
├── aalta-patient7-procedures.jsonld
├── context.jsonld
├── expected/  # expected results of translations
│   ├── *.json
│   ├── *.xml
│   ├── *.ttl  # turtle files
├── output/  # actual results
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

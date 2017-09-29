# ShEx Translation schemas

Translation schemas for translating JSON-LD CHCS data to FHIR and back to CHCS again.

The *.shex files should be interpreted with the shex.js validate and materialize tools. 
See [https://github.com/shexSpec/shex.js](https://github.com/shexSpec/shex.js "shex.js github page") 
for more details.

Examples: 

1. To generate FHIR RDF: 

    shex.js/bin/validate -x chcs-patient7.shex -l chcs-patient7.jsonld -s "http://hokukahu.com/patient-1" > chcs-patient7.val
    
    cat chcs-patient7.val | shex.js/shex-map/bin/materialize -t chcs2fhir-demographics.shex -j chcs2fhir-vars.json --root "http://hokukahu.com/patient-1" > chcs2fhir-demographics.ttl

2. To reverse translate from FHIR to CHCS RDF: 

    shex.js/bin/validate -x fhir2chcs-demographics.shex -d chcs2fhir-demographics.ttl > fhir2chcs-patient7.val
    
    cat fhir2chcs-patient7.val | shex.js/shex-map/bin/materialize -t chcs-patient7.shex --jsonvars chcs2fhir-vars.json" --root "http://hokukahu.com/patient-1" > fhir2chcs-demographics.ttl"

The script shex.js/test/map/roundtrip-translation.sh is useful in testing since it executes all
of the above commands, plus generates a JSON-LD file that can be compared with the original JSON-LD 
to verify the translation worked with no data loss.

# ShEx Translation schemas

Translation schemas for translating JSON-LD CMUMPS data to FHIR and back to CMUMPS again.

The *.shex files should be interpreted with the shex.js validate and materialize tools. 
See [https://github.com/shexSpec/shex.js](https://github.com/shexSpec/shex.js "shex.js github page") 
for more details.

Examples: 

1. To generate FHIR RDF: 

    shex.js/bin/validate -x cmumps-patient7.shex -l cmumps-patient7.jsonld -s "http://hokukahu.com/patient-1" > cmumps-patient7.val
    
    cat cmumps-patient7.val | shex.js/shex-map/bin/materialize -t cmumps2fhir-demographics.shex -j cmumps2fhir-vars.json --root "http://hokukahu.com/patient-1" > cmumps2fhir-demographics.ttl

2. To reverse translate from FHIR to CMUMPS RDF: 

    shex.js/bin/validate -x fhir2cmumps-demographics.shex -d cmumps2fhir-demographics.ttl > fhir2cmumps-patient7.val
    
    cat fhir2cmumps-patient7.val | shex.js/shex-map/bin/materialize -t cmumps-patient7.shex --jsonvars cmumps2fhir-vars.json" --root "http://hokukahu.com/patient-1" > fhir2cmumps-demographics.ttl"

The script shex.js/test/map/roundtrip-translation.sh is useful in testing since it executes all
of the above commands, plus generates a JSON-LD file that can be compared with the original JSON-LD 
to verify the translation worked with no data loss.

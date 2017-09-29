# ShEx Common Input Data 

This directory contains pretty formatted TTL data for testing CHCS common ShEx translations.  The data here was derived from the 
[https://github.com/rdf-pipeline/translators/tree/cmumps-to-chcs/data/samples](CHCS sample data)

The process to generate the data involves using the tools found [https://github.com/rdf-pipeline/translators/tree/cmumps-to-chcs/bin](here) is: 
1. Create a temporary JSON-LD file with one entry from the sample data JSON-LD of your choice, e.g., tmp_file.jsonld
2. Run the pre-processor to add the appropriate "identifier" and "chcs_type" fields
      preprocess.js -i tmp_file.jsonld -o preprocessed_file.jsonld
3. Convert the preprocessed JSON-LD file to Turtle - the [https://json-ld.org/playground/](JSON-LD playground tool) is helpful for this
4. Pretty format the Turtle:
      cat file.ttl | turtlify.py > pretty_formatted_file.ttl

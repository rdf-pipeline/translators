#!/bin/bash

# Run the validate/materialize steps for the CHCS Procedure schema translation to FHIR procedure schema passing in the following: 
#   CHCS source name
#   FHIR target name
#   node 
#   shape
#   root

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
${CWD}/chcs-to-fhir.sh "Procedure" "procedure" "entity:Procedure-1074046" "http://hokukahu.com/chcs/Procedure" "urn:local:procedure:"

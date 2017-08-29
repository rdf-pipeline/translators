#!/bin/bash

# Run the validate/materialize steps for the CHCS Patient-2 schema translation to FHIR patient schema passing in the following: 
#   CHCS source name
#   FHIR target name
#   node 
#   shape
#   root

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
${CWD}/chcs-to-fhir.sh "Patient-2" "patient" "http://hokukahu.com/systems/chcs-1/2-000007" "http://hokukahu.com/chcs/Patient-2" "urn:local:patient"

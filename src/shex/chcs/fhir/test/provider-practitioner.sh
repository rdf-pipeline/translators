#!/bin/bash

# Run the validate/materialize steps for the CHCS Provider-6 schema translation to FHIR practitioner schema passing in the following:
#   CHCS source name
#   FHIR target name
#   node
#   shape
#   root

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
${CWD}/chcs-to-fhir.sh "Provider-6" "practitioner" "http://hokukahu.com/systems/chcs-1/6-26" "http://hokukahu.com/chcs/Provider-6" "urn:local:provider"

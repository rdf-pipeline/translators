#!/bin/bash

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
${CWD}/chcs-to-fhir.sh "Provider-6" "practitioner" "urn:local:provider"

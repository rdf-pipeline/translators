#!/usr/bin/env bash
# A quick script to feed the output for LDR into chcs-file.js.
# This can be useful to see if chcs2fhir_all.translatechcsFhir is actually doing its part.
# This script is bash and curl dependent. Also /dev/stdin might be linux only, I don't know yet.

# TODO eventually: have chcs-file.js eventually deal with stream of various kinds

here=$(readlink -f $(dirname ${BASH_SOURCE}))
url=${1:?'expecting a url'}

(
  # set -x;
  curl -# "${url}" | node ${here}/chcs-file.js /dev/stdin
)

#!/usr/bin/env bash

here=$(readlink -f $(dirname ${BASH_SOURCE}))
id=${1:?'expecting a patient id'}
args=${2}
(
  # set -x
  ${here}/curl.sh ${id} | tee patient-${id}.jsonld | ${here}/cmumps-file.js ${args} /dev/stdin
)

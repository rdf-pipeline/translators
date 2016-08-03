#!/usr/bin/env bash

here=$(readlink -f $(dirname ${BASH_SOURCE}))
id=${1:?'expecting a patient id'}
( ${here}/curl.sh ${id} | tee patient-${id}.jsonld | ${here}/cmumps-file.js /dev/stdin )

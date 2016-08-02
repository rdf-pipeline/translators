#!/usr/bin/env bash

here=$(readlink -f $(dirname ${BASH_SOURCE}))
id=${1:?'expecting a patient id'}
args=${2}
( curl -s "http://10.255.241.50:8080/patient_graph?dataset=chcs-nc&patientid=${id}&datatype=all" | ${here}/cmumps-file.js ${args} /dev/stdin )

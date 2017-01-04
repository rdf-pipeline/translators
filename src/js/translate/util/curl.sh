#!/usr/bin/env bash

here=$(readlink -f $(dirname ${BASH_SOURCE}))
id=${1:?'expecting a patient id'}
IPADDR=${2:?'expecting an IP address'}
curl -s "http://${IPADDR}:8080/patient_graph?dataset=chcs-nc&patientid=${id}&datatype=all"

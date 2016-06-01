#!/usr/bin/env bash
# A quick script to feed the output for LDR into cmumps-file.js.
# This can be useful to see if cmumps2sd_all.translatecmumpssd is actually doing its part.
# This script is bash and curl dependent. Also /dev/stdin might be linux only, I don't know yet.

# TODO eventually: have cmumps-file.js eventually deal with stream of various kinds

here=$(readlink -f $(dirname ${BASH_SOURCE}))
url=${1:?'expecting a url'}

(
  # set -x;
  curl -# "${url}" | node ${here}/cmumps-file.js /dev/stdin
)

#!/bin/bash

DEFAULT_COLOR='\033[0m'
RED_FONT='\033[1;31m'
GREEN_FONT='\033[01;32m'
YELLOW_FONT='\033[1;33m'

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VALIDATE="${CWD}/../../../../../node_modules/shex/bin/validate"
MATERIALIZE="${CWD}/../../../../../node_modules/shex/extensions/shex-map/bin/materialize"

SOURCE=${1}
TARGET=${2}
ROOT=${3}

SOURCE_SHEX="${CWD}/../../common/${SOURCE}.shex"
SOURCE_DATA="${CWD}/../../common/data/${SOURCE}.ttl"
VAL_FILE="/tmp/${SOURCE}.val"

TARGET_SHEX="${CWD}/../${TARGET}.shex"
TTL_FILE="/tmp/${TARGET}.ttl"

function verify_file_content() {
  FILENAME=$1
  PATTERN=$2
  ERRMSG=$3

  if grep -iq "\"${PATTERN}\"" "${FILENAME}"; then
    echo -e "${RED_FONT}${ERRMSG}" >&2
    echo -e "grep -i \"${PATTERN}\" \"${FILENAME}\" results:" `grep -i "${PATTERN}" "${FILENAME}"` >&2
    echo -e "${DEFAULT_COLOR}"
    exit 1
  fi
}

# Verify validation file was created and has some content in it
function verify_file_not_empty() {
  FILENAME=$1
  ERRMSG=$2

  if [ ! -s ${FILENAME} ]; then
    echo -e "${RED_FONT}${ERRMSG}" >&2
    echo -e "${DEFAULT_COLOR}"
    exit 1
  fi
}

VALIDATE_CMD="${VALIDATE} -d \"${SOURCE_DATA}\"  -x \"${SOURCE_SHEX}\" --regex-module \"nfax-val-1err\" > \"${VAL_FILE}\""
echo "\nExecuting ${VALIDATE_CMD}"
eval ${VALIDATE_CMD}
if [ $? -ne 0 ]; then
  echo -e "${RED_FONT}Validate of ${VAL_FILE} failed!" >&2
  echo -e "${DEFAULT_COLOR}"
  exit 1
fi
verify_file_not_empty "${VAL_FILE}" "Validation failed; ${VAL_FILE} is empty!"
verify_file_content "${VAL_FILE}" "Failure\|Error" "Validation failed; ${JSONLD_DATA_FILE} contains a failure or errors!"

echo -e "${GREEN_FONT}Validation succeeded - results available in ${VAL_FILE}" >&2
echo -e "${DEFAULT_COLOR}"

MATERIALIZE_CMD="cat ${VAL_FILE} | ~/src/shex.js/extensions/shex-map/bin/materialize -t \"${TARGET_SHEX}\" -r \"${ROOT}\" > \"${TTL_FILE}\""
echo "\nExecuting ${MATERIALIZE_CMD}"
eval ${MATERIALIZE_CMD}
if [ $? -ne 0 ]; then
  echo -e "${RED_FONT}Materialize of ${VAL_FILE} to ${TTL_FILE} failed!" >&2
  echo -e "${DEFAULT_COLOR}"
  exit 1
fi
verify_file_not_empty "${TTL_FILE}" "Materialization failed; ${TTL_FILE} is empty!"

echo -e "${GREEN_FONT}Materialization succeeded - results available in ${TTL_FILE}" >&2
echo -e "${DEFAULT_COLOR}"

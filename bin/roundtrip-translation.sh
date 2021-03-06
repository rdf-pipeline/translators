#!/bin/bash

# Script to test a ShEx translation round trip from JSON-LD to whatever
# ShEx translation is specified by the input files, and then reversing 
# the translation back into JSON-lD.  
# 
# This script was written for testing translating JSON-LD to RDF turtle 
# and has been pretty well tested on that path.  It has not been tested 
# with other translations.

DEFAULT_COLOR='\033[0m' 
RED_FONT='\033[1;31m'
GREEN_FONT='\033[01;32m'
YELLOW_FONT='\033[1;33m'

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SHEX_BIN_PATH=${CWD}/../node_modules/shex/bin
EXT_BIN_PATH=${CWD}/../node_modules/shex/extensions/shex-map/bin

DEFAULT_RDF_ROOT="urn:local:patient-1"

function help() {
    echo ""
    echo "NAME"
    echo "  roundtrip-translation.sh"
    echo ""
    echo "SYNOPSIS"
    echo " roundtrip-translation.sh -h | --help"
    echo "                          -d | --data <JSON-LD data file>" 
    echo "                          -t | --target <ShEx target translation schema file>"
    echo "                         [-b | --backtarget <ShEx back target translation schema file>]"
    echo "                         [-f | --frame <JSON-LD frame file>]"
    echo "                         [-j | --jsonvars <ShEx JSON variables file>]"
    echo "                         [-o | --output <output directory>]"
    echo "                         [-r | --root <RDF root>]"
    echo "                         [-s | --source <ShEx source data schema file>]"
    echo "                         [-v | --verbose]"
    echo ""
    echo "DESCRIPTION"
    echo "  roundtrip-translation validates a ShEx source schema, materializes it to a target translation schema, and then "
    echo "  round trip converts it back, checking the results at each step.  All artifacts are written to the"
    echo "  output directory."
    echo ""
    echo "  If no back target schema file is specified, this script will generate a back target schema file "
    echo "  from the target schema by copying it to <output directory>/back-<translation file name>"
    echo "  where the user can any required changes to it \(it will be used as the default and not be overwritten\)."
    echo ""
    echo "  If no output directory is specified, ./output will be used."
    echo "  Warning: the output directory will be deleted if it exists, & recreated for clean results."
    echo "" 
    echo "  If no RDF root is specified, ${DEFAULT_RDF_ROOT} will be used as the default root."
    echo ""
    echo "  If no source data schema file is specified, this script will look for the json data file name with a \".shex\""
    echo "  extension on it."
    echo ""
    echo "EXAMPLE" 
    echo "bin/roundtrip-translation.sh -d src/shex/test/data/chcs-patient7.jsonld -t src/shex/demographics/chcs2fhir-demographics.shex -f src/shex/chcs-patient7.frame"
    echo ""
}

function usage() {
  echo "usage: roundtrip-translation.sh -h | --help"
  echo "                                -d | --data <JSON-LD data file>" 
  echo "                                -t | --target <ShEx target translation schema file>"
  echo "                                [-b | --backtarget <ShEx back target translation schema file>]"
  echo "                                [-f | --frame <JSON-LD frame file>]"
  echo "                                [-j | --jsonvars <ShEx JSON variables file>]"
  echo "                                [-o | --output <output directory>]"
  echo "                                [-r | --root <RDF root>]"
  echo "                                [-s | --source <ShEx source data schema file>]"
  echo "                                [-v | --verbose]"
  echo ""
  exit 1
}

function check_required_arg() {
  REQ_ARG=$1
  ERRMSG=$2

  if [[ -z $REQ_ARG ]]; then 
    echo -e "${RED_FONT}${ERRMSG}" >&2
    echo -e "${DEFAULT_COLOR}"
    usage;
  fi
}

function error_exit() { 
    VALUE=$1
    MESSAGE=$2

    if [ -z "${VALUE}" ]; then 
         echo -e "${RED_FONT}ERROR: ${MESSAGE}" >&2
         echo -e "${DEFAULT_COLOR}"
         usage
         exit 1
    fi
}

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

function verify_file_exists() {
  FILENAME=$1
  EXPECTED_FILE_EXT=$2

  if [ ! -f "${FILENAME}" ]; then
    echo -e "${RED_FONT}ERROR: File ${FILENAME} does not exist!" >&2
    echo -e "${DEFAULT_COLOR}"
    exit 1;
  fi

  if [ ! -r "${FILENAME}" ]; then
    echo -e "${RED_FONT}ERROR: File ${FILENAME} is not readable!" >&2
    echo -e "${DEFAULT_COLOR}"
    exit 1;
  fi

  FILE_EXTENSION="${FILENAME##*.}"
  if [ "${EXPECTED_FILE_EXT}" != "${FILE_EXTENSION}" ]; then
    echo -e "${RED_FONT}ERROR: ${FILENAME} does not have the expected filename extension - expected ${EXPECTED_FILE_EXT}!" >&2
    echo -e "${DEFAULT_COLOR}"
    exit 1;
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

function warn() {
  ERRMSG=$1

  if [ "${VERBOSE}" = true ]; then 
    echo -e "${YELLOW_FONT}WARN: ${ERRMSG}" >&2
    echo -e "${DEFAULT_COLOR}"
  fi
}

function warnDefault() {
    VALUE=$1
    MESSAGE=$2

    if [ "${VERBOSE}" = true -a  -z "${VALUE}" ]; then 
        echo -e "${YELLOW_FONT}WARN: ${MESSAGE}" >&2
        echo -e "${DEFAULT_COLOR}"
    fi
}


# Process command line args
while [[ $# -gt 0 ]]; do
  opt="$1"
  shift;

  case "$opt" in
    "-h"|"--help"            ) help; exit 0;;
    "-d"|"--data"            ) JSONLD_DATA_FILE="$1"; shift;;
    "-b"|"--backtarget"      ) BACK_TARGET_TRANSLATION_FILE="$1"; 
                               check_required_arg "${BACK_TARGET_TRANSLATION_FILE}" "ERROR: ${opt} specified with no back target translation file!"
                               verify_file_exists "${BACK_TARGET_TRANSLATION_FILE}" "shex"
                               shift;;
    "-f"|"--frame"           ) FRAME_FILE="$1"; 
                               check_required_arg "${FRAME_FILE}" "ERROR: ${opt} specified with no frame file!"
                               verify_file_exists "${FRAME_FILE}" "frame"
                               shift;;
    "-j"|"--jsonvars"        ) JSON_VARS_FILE="$1"; 
                               check_required_arg "${JSON_VARS_FILE}" "ERROR: ${opt} specified with no JSON variables file!"
                               verify_file_exists "${JSON_VARS_FILE}" "json"
                               shift;;
    "-o"|"--output"          ) WORK_DIR="$1"; 
                               check_required_arg "${WORK_DIR}" "ERROR: ${opt} specified with no output directory!"
                               shift;;
    "-r"|"--root"            ) RDF_ROOT="$1"; 
                               error_exit "${RDF_ROOT}" "${opt} specified with no RDF root!"
                               shift;;
    "-s"|"--source"          ) SOURCE_DATA_SCHEMA_FILE="$1"; 
                               error_exit "${SOURCE_DATA_SCHEMA_FILE}" "${opt} specified with no source ShEx schema file!"
                               shift;;
    "-t"|"--target"          ) SHEX_TARGET_TRANSLATION_FILE="$1"; shift;;
    "-v"|"--verbose"         ) VERBOSE=true;; 
    *                        ) echo "ERROR: Invalid option: \""$opt"\"" >&2; usage; exit 1;;
    esac
done

check_required_arg "${JSONLD_DATA_FILE}" "ERROR: expected a JSON-LD data file!" 
verify_file_exists "${JSONLD_DATA_FILE}" "jsonld" 

check_required_arg "${SHEX_TARGET_TRANSLATION_FILE}" "ERROR: expected a ShEx translation file!" 
verify_file_exists "${SHEX_TARGET_TRANSLATION_FILE}" "shex" 

WORK_DIR=${WORK_DIR:-./work}

# Get the RDF Root.  If we are using hokukahu as our root, set SED files to true.
# This will do editing on the sed files to ensure a smooth round trip with the current ShEx requirements
warnDefault "${RDF_ROOT}" "No RDF root specified; defaulting to ${DEFAULT_RDF_ROOT}."
RDF_ROOT="${RDF_ROOT:-${DEFAULT_RDF_ROOT}}"
if [ "${RDF_ROOT}" = "${DEFAULT_RDF_ROOT}" ]; then 
  SED_FILES=true
else 
  SED_FILES=false
fi

if [ ! -z "$FRAME_FILE" ]; then 
  verify_file_exists "${FRAME_FILE}" "frame" 
fi

if [ ! -z "$JSON_VARS_FILE" ]; then 
  verify_file_exists "${JSON_VARS_FILE}" "json" 
fi

# Get the base JSON-LD file name without the extension.  We'll use that to 
# generate other filenames we need to do our translation.
BASE_SHEX_SCHEMA_FNAME="${JSONLD_DATA_FILE%.*}"
if [[ -z "$SOURCE_DATA_SCHEMA_FILE" ]]; then 
  echo "\nChecking source file"
  warnDefault "${SOURCE_DATA_SCHEMA_FILE}" "No source ShEx schema file specified.  Defaulting to ${BASE_SHEX_SCHEMA_FNAME}.shex"
  SOURCE_DATA_SCHEMA_FILE="${BASE_SHEX_SCHEMA_FNAME}.shex"
fi
verify_file_exists "${SOURCE_DATA_SCHEMA_FILE}" "shex" 

# Check to be sure our target is not an existing file or symbolic link
if [ -f "${WORK_DIR}" -o -L "${WORK_DIR}" ]; then 
  echo -e "${RED_FONT}Output directory ${WORK_DIR} already exists as a file!" >&2
  echo -e "${DEFAULT_COLOR}"
  exit 1
fi

# Delete the directory if it exists and recreate it fresh for this run
if [ -d "${WORK_DIR}" ]; then
   warn "${WORK_DIR} exists - removing it and creating a fresh ${WORK_DIR} directory";
   rm -r ${WORK_DIR}
fi
mkdir -p ${WORK_DIR}

BASE_SCHEMA_FNAME="${BASE_SHEX_SCHEMA_FNAME##*/}"
VAL_FILE="${WORK_DIR}/${BASE_SCHEMA_FNAME}.val"
BACK_VAL_FILE="${WORK_DIR}/back-${BASE_SCHEMA_FNAME}.val"

TRANSLATION_BASE_FNAME="${SHEX_TARGET_TRANSLATION_FILE##*/}"
TRANSLATION_BASE_FNAME="${TRANSLATION_BASE_FNAME%.*}"
TARGET_TTL_FILE="${WORK_DIR}/${TRANSLATION_BASE_FNAME}.ttl"
BACK_TTL_FILE="${WORK_DIR}/back-${TRANSLATION_BASE_FNAME}.ttl"

BACK_SOURCE_DATA_SCHEMA_FILE="./back-${BASE_SCHEMA_FNAME}.shex"
BACK_TARGET_TRANSLATION_FILE=${BACK_TARGET_TRANSLATION_FILE:-$WORK_DIR/back-$TRANSLATION_BASE_FNAME.shex}

# Execute validation
VALIDATE="${SHEX_BIN_PATH}/validate -x \"${SOURCE_DATA_SCHEMA_FILE}\" -l \"${JSONLD_DATA_FILE}\" -s \"http://hokukahu.com/patient-1\" > \"${VAL_FILE}\""
echo Executing ${VALIDATE}
eval ${VALIDATE}
if [ $? -ne 0 ]; then
  echo -e "${RED_FONT}CHCS validate of ${VAL_FILE} failed!" >&2
  echo -e "${DEFAULT_COLOR}"
  exit 1
fi

# Verify validation worked
verify_file_not_empty "${VAL_FILE}" "CHCS validation failed; ${VAL_FILE} is empty!"
verify_file_content "${VAL_FILE}" "Failure\|Error" "CHCS validation failed; ${JSONLD_DATA_FILE} contains a failure or errors!"
echo -e "${GREEN_FONT}Validation of ${JSONLD_DATA_FILE} completed successfully."
echo "Results are available in ${VAL_FILE}."
echo -e "${DEFAULT_COLOR}"

# Materialize the translation
if [[ -z ${JSON_VARS_FILE} ]]; then 
  MATERIALIZE="cat \"${VAL_FILE}\" | ${EXT_BIN_PATH}/materialize -t \"${SHEX_TARGET_TRANSLATION_FILE}\" --root \"${RDF_ROOT}\" > \"${TARGET_TTL_FILE}\""
else 
  MATERIALIZE="cat \"${VAL_FILE}\" | ${EXT_BIN_PATH}/materialize -t \"${SHEX_TARGET_TRANSLATION_FILE}\" --jsonvars \"${JSON_VARS_FILE}\" --root \"${RDF_ROOT}\" > \"${TARGET_TTL_FILE}\""
fi
echo "Executing ${MATERIALIZE}"
eval ${MATERIALIZE}

# Verify materialize worked 
verify_file_not_empty "${TARGET_TTL_FILE}" "materialization failed; ${TARGET_TTL_FILE} is empty!"
verify_file_content "${TARGET_TTL_FILE}" "${RDF_ROOT}" "Materialization of ${TARGET_TTL_FILE} failed; Expected RDF ROOT was not found:${RDF_ROOT}!"
echo -e "${GREEN_FONT}Materialization of ${TARGET_TTL_FILE} completed successfully."
echo -e "${DEFAULT_COLOR}"

# Do we have an existing back translation file? 
if [ -d "${BACK_TARGET_TRANSLATION_FILE}" ]; then
  echo -e "${RED_FONT}${BACK_TARGET_TRANSLATION_FILE} cannot be a directory!" >&2
  usage 
fi

if [ ! -f "${BACK_TARGET_TRANSLATION_FILE}" ]; then

  warn "${BACK_TARGET_TRANSLATION_FILE} does not exist - generating it from ${SHEX_TARGET_TRANSLATION_FILE}.";
  cp "${SHEX_TARGET_TRANSLATION_FILE}" "${BACK_TARGET_TRANSLATION_FILE}" 

  if [ "${SED_FILES}" = true ]; then 

    # KLUDGE: removing CLOSED from back translation so ShEx will work
    if [ "$(uname)" == "Darwin" ]; then
      sed -i '' s/CLOSED// "${BACK_TARGET_TRANSLATION_FILE}"
    elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
      sed -i s/CLOSED// "${BACK_TARGET_TRANSLATION_FILE}"
    else
      echo -e "${YELLOW_FONT}WARN: unable to update file ${BACK_TARGET_TRANSLATION_FILE} for back translation." >&2
      echo -e "${DEFAULT_COLOR}"
    fi

    if [ $? -ne 0 ]; then
      echo -e "${YELLOW_FONT}WARN: sed failed to update file ${BACK_TARGET_TRANSLATION_FILE}." >&2
      echo -e "${DEFAULT_COLOR}"
    fi
  fi
fi

VALIDATE="${SHEX_BIN_PATH}/validate -x \"${BACK_TARGET_TRANSLATION_FILE}\" -d \"${TARGET_TTL_FILE}\" > \"${BACK_VAL_FILE}\""
echo "Executing ${VALIDATE}"
eval ${VALIDATE}

# Verify validation worked
verify_file_not_empty "${BACK_VAL_FILE}" "Back validation failed; ${BACK_VAL_FILE} is empty!"
verify_file_content "${BACK_VAL_FILE}" "Failure\|Error" "Back validation failed; ${TARGET_TTL_FILE} contains a failure or errors!"
echo -e "${GREEN_FONT}Back validation of ${TARGET_TTL_FILE} completed successfully."
echo "Results are available in ${BACK_VAL_FILE}"
echo -e "${DEFAULT_COLOR}"

if [ ! -f "${BACK_SOURCE_DATA_SCHEMA_FILE}" ]; then
  warn "${BACK_SOURCE_DATA_SCHEMA_FILE} does not exist - generating it from ${SOURCE_DATA_SCHEMA_FILE}.";
  BACK_SOURCE_DATA_SCHEMA_FILE="${WORK_DIR}/${BACK_SOURCE_DATA_SCHEMA_FILE}"
  cp "${SOURCE_DATA_SCHEMA_FILE}" "${BACK_SOURCE_DATA_SCHEMA_FILE}" 
fi

# materialize it
if [[ -z ${JSON_VARS_FILE} ]]; then 
  MATERIALIZE="cat \"${BACK_VAL_FILE}\" | ${EXT_BIN_PATH}/materialize -t \"${BACK_SOURCE_DATA_SCHEMA_FILE}\" --root \"${RDF_ROOT}\" > \"${BACK_TTL_FILE}\""
else 
  MATERIALIZE="cat \"${BACK_VAL_FILE}\" | ${EXT_BIN_PATH}/materialize -t \"${BACK_SOURCE_DATA_SCHEMA_FILE}\" --jsonvars \"${JSON_VARS_FILE}\" --root \"${RDF_ROOT}\" > \"${BACK_TTL_FILE}\""
fi
echo "Executing ${MATERIALIZE}"
eval ${MATERIALIZE}

# verify materialize worked
verify_file_not_empty "${BACK_TTL_FILE}" "Back materialization failed; ${BACK_TTL_FILE} is empty!"
verify_file_content "${BACK_TTL_FILE}" "${RDF_ROOT}" "Materialization of ${BACK_TTL_FILE} failed; Expected RDF ROOT was not found:${RDF_ROOT}!"
echo -e "${GREEN_FONT}Back materialization of ${BACK_TTL_FILE} completed successfully."
echo -e "${DEFAULT_COLOR}"

# Convert to the RDF to JSON LD
if [[ -z ${FRAME_FILE} ]]; then 
  BACK_JSON_FILE="${WORK_DIR}/back-${BASE_SCHEMA_FNAME}.json"
  TTL_TO_JSON="${CWD}/ttl-to-json -t \"${BACK_TTL_FILE}\" > "${BACK_JSON_FILE}""
else 
  BACK_JSON_FILE="${WORK_DIR}/back-${BASE_SCHEMA_FNAME}.jsonld"
  TTL_TO_JSON="${CWD}/ttl-to-json -t \"${BACK_TTL_FILE}\" -f \"${FRAME_FILE}\" > "${BACK_JSON_FILE}""
fi
echo "Executing ${TTL_TO_JSON}"
eval ${TTL_TO_JSON}
if [ $? -ne 0 ]; then
  echo -e "${RED_FONT}Ttl-to-json conversion of ${BACK_TTL_FILE} failed!" >&2
  echo -e "${DEFAULT_COLOR}"
  exit 1
fi

# Verify we have some content
verify_file_not_empty "${BACK_JSON_FILE}" "Ttl-to-json conversion failed; ${BACK_JSON_FILE} is empty!"
echo -e "${GREEN_FONT}Ttl-to-json conversion of ${BACK_TTL_FILE} completed successfully"
echo "Results are available in ${BACK_JSON_FILE}."
echo -e "${DEFAULT_COLOR}"

# JSON diff the file with the original JSON/JSON-LD source file
DIFF_OUTPUT="${WORK_DIR}/diff.out"
JSON_DIFF="${CWD}/../../node_modules/json-diff/bin/json-diff.js \"${JSONLD_DATA_FILE}\" \"${BACK_JSON_FILE}\" > \"${DIFF_OUTPUT}\""
echo "Executing ${JSON_DIFF}"
eval ${JSON_DIFF}

DIFF_RESULT=`cat ${DIFF_OUTPUT}`
if [ "${DIFF_RESULT}" != " undefined" ]; then
  echo -e "${RED_FONT}Differences were found between ${JSONLD_DATA_FILE} and the round trip file ${BACK_JSON_FILE}!" >&2
  echo "${DIFF_RESULT}"
  echo -e "${DEFAULT_COLOR}"
  exit 1; 
fi
echo -e "${GREEN_FONT}Round trip found no differences between ${JSONLD_DATA_FILE} and round trip file ${BACK_JSON_FILE}.  Completed successfully."
echo -e "${DEFAULT_COLOR}"

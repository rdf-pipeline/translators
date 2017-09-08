#!/bin/bash

DEFAULT_COLOR='\033[0m'
RED_FONT='\033[1;31m'
GREEN_FONT='\033[01;32m'
YELLOW_FONT='\033[1;33m'


CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VALIDATE="${CWD}/../../../../../node_modules/shex/bin/validate"
WORK_DIR="${CWD}/work"


if [ -d "${WORK_DIR}" ]; then
   rm -rf "${WORK_DIR}"
fi
mkdir -p "${WORK_DIR}"

ERROR_PATTERN="Failure\|Error"

function validateIt() {
    NAME=$1
    NODE=$2

    VAL_FILE="${WORK_DIR}/${NAME}.val"

    # validate and check error code
    VALIDATE_CMD="${VALIDATE} -d \"${CWD}/../input_data/${NAME}.ttl\"  -x \"${CWD}/../${NAME}.shex\" -n \"${NODE}\" -s \"http://hokukahu.com/chcs/${NAME}\" --regex-module \"nfax-val-1err\" > \"${VAL_FILE}\""
    eval ${VALIDATE_CMD}
    if [ $? -ne 0 ]; then
       echo -e "${RED_FONT}Validate of ${VAL_FILE} failed!" >&2
       echo "Executed:\n   ${VALIDATE_CMD}"
       echo -e "${DEFAULT_COLOR}"
       exit 1
     fi

     # Verify file is not empty
     if [ ! -s ${VAL_FILE} ]; then 
       echo -e "${RED_FONT}Validate of ${VAL_FILE} failed - ${VAL_FILE} is empty!" >&2
       echo "Executed:\n   ${VALIDATE_CMD}"
       echo -e "${DEFAULT_COLOR}"
       exit 1
     fi

     # verify no errors or failures in the val file
     if grep -iq "\"${ERROR_PATTERN}\"" "${VAL_FILE}"; then
         echo -e "${RED_FONT}${ERRMSG}" >&2
         echo "Executed:\n   ${VALIDATE_CMD}"
         echo -e "grep -i \"${ERROR_PATTERN}\" \"${VAL_FILE}\" results:" `grep -i "${ERROR_PATTERN}" "${VAL_FILE}"` >&2
         echo -e "${DEFAULT_COLOR}"
         exit 1
     fi

     echo "Validation of ${NAME} completed sucessfully"
}

# validate by passing in the name of the CHCS class to validate and the node in the sample data to use for validation
validateIt "Absent_Status-8131"                           "http://hokukahu.com/systems/chcs-1/8131-1"
validateIt "Access_To_Care_Category-8510"                 "http://hokukahu.com/systems/chcs-1/8510-1"
validateIt "Additional_Medical_Treatment_Facility-8101_1" "http://hokukahu.com/systems/chcs-1/8101_1-1"
validateIt "Allergies_Definitions-8254_011"               "http://hokukahu.com/systems/chcs-1/8254_011-3"
validateIt "Allergies_Selections-8254_01"                 "http://hokukahu.com/systems/chcs-1/8254_01-1000"
validateIt "Ancillary_Procedure-108_1"                    "http://hokukahu.com/systems/chcs-1/108_1-1"
validateIt "Ancillary_Tracking-39_9"                      "http://hokukahu.com/systems/chcs-1/39_9-1"
validateIt "Anesthesia_Rate-8154_3"                       "http://hokukahu.com/systems/chcs-1/8154_3-2"
validateIt "Anesthesia_Risk_Codes-8149"                   "http://hokukahu.com/systems/chcs-1/8149-1"
validateIt "Antibiotic_Panel_File-8728"                   "http://hokukahu.com/systems/chcs-1/8728-1"
validateIt "Appointment_Detail_Codes-44_7"                "http://hokukahu.com/systems/chcs-1/44_7-1"
validateIt "Appointment_Status-8514"                      "http://hokukahu.com/systems/chcs-1/8514-1"
validateIt "Appointment_Type-44_5"                        "http://hokukahu.com/systems/chcs-1/44_5-1"
validateIt "Apv_Appointment-44_3"                         "http://hokukahu.com/systems/chcs-1/44_3-6"

validateIt "Blood_Product_Type-8161"                      "http://hokukahu.com/systems/chcs-1/8161-1"
validateIt "Blood_Type-8712"                              "http://hokukahu.com/systems/chcs-1/8712-1"
validateIt "Branch_Of_Service-23"                         "http://hokukahu.com/systems/chcs-1/23-1"

validateIt "Casualty_Prognosis-8106"                      "http://hokukahu.com/systems/chcs-1/8106-2"
validateIt "Casualty_Status-8139"                         "http://hokukahu.com/systems/chcs-1/8139-2"
validateIt "Cause_Of_Injury-8137"                         "http://hokukahu.com/systems/chcs-1/8137-2"
validateIt "Clinical_History-8810"                        "http://hokukahu.com/systems/chcs-1/8810-3"
validateIt "Codes-757_02"                                 "http://hokukahu.com/systems/chcs-1/757_02-1"
validateIt "Coding_Systems-757_03"                        "http://hokukahu.com/systems/chcs-1/757_03-1"
validateIt "Coding_Type-8930"                             "http://hokukahu.com/systems/chcs-1/8930-1"
validateIt "Collection_Sample-62"                         "http://hokukahu.com/systems/chcs-1/62-1"

validateIt "Diagnostic_Related_Group-312"                 "http://hokukahu.com/systems/chcs-1/312-1"
validateIt "Diet-8410"                                    "http://hokukahu.com/systems/chcs-1/8410-1"
validateIt "Disability_Condition-31"                      "http://hokukahu.com/systems/chcs-1/31-793"
validateIt "Discharge_Type-42_2"                          "http://hokukahu.com/systems/chcs-1/42_2-.5"
validateIt "Dod_Standard_Lab_Test-8188_99"                "http://hokukahu.com/systems/chcs-1/8188_99-1"
validateIt "Drug-50"                                      "http://hokukahu.com/systems/chcs-1/50-1"

validateIt "Ethnic_Background-8191"                       "http://hokukahu.com/systems/chcs-1/8191-1"
validateIt "Etiology_Field-61_2"                          "http://hokukahu.com/systems/chcs-1/61_2-1"
validateIt "Examination_Status-72"                        "http://hokukahu.com/systems/chcs-1/72-1"

validateIt "Family_Member_Prefix-8110"                    "http://hokukahu.com/systems/chcs-1/8110-1"
validateIt "Fdb_Dam_Cross_Sensitivity_Allergy-8253_05"    "http://hokukahu.com/systems/chcs-1/8253_05-1"
validateIt "Fdb_Dam_Master_Table-8250_4"                  "http://hokukahu.com/systems/chcs-1/8250_4-118"
validateIt "Fdb_Ddi_Severity_Level-8253_045"              "http://hokukahu.com/systems/chcs-1/8253_045-1"
validateIt "Fdb_Dim_32_Clinical_Effects-8253_047"         "http://hokukahu.com/systems/chcs-1/8253_047-1"
validateIt "Fdb_Dim_32_Reference_Cat_Desc-8253_046"       "http://hokukahu.com/systems/chcs-1/8253_046-1"
validateIt "Fetal_Presentation_Type-8183"                 "http://hokukahu.com/systems/chcs-1/8183-1"

validateIt "Geographic_Location-5"                        "http://hokukahu.com/systems/chcs-1/5-1"
validateIt "Hospital_Location-44"                         "http://hokukahu.com/systems/chcs-1/44-.5"

validateIt "Kg_Provider_Role-100514"                      "http://hokukahu.com/systems/chcs-1/100514-1"
validateIt "Ned_Hcdp_Coverage_Code-8545"                  "http://hokukahu.com/systems/chcs-1/8545-1"

validateIt "Order_Warnings-102_1"                         "http://hokukahu.com/systems/chcs-1/102_1-1"
validateIt "Origin_Of_Order-111"                          "http://hokukahu.com/systems/chcs-1/111-1"

validateIt "Patient-2"                                    "http://hokukahu.com/systems/chcs-1/2-000007"
validateIt "Pharmacy_Action-59_6"                         "http://hokukahu.com/systems/chcs-1/59_6-1"
validateIt "Prescription-52"                              "http://hokukahu.com/systems/chcs-1/52-40863"
validateIt "Procedure"                                    "entity:Procedure-1074046"
validateIt "Provider-6"                                   "http://hokukahu.com/systems/chcs-1/6-26"

validateIt "User-3"                                       "http://hokukahu.com/systems/chcs-1/3-0"

validateIt "Zip_Code-5_8002" "http://hokukahu.com/systems/chcs-1/5_8002-1"

# clean up after success
rm -rf ${WORK_DIR}

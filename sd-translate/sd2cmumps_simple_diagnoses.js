/**
 * Translate a cmumps Patient objects to sd Patient object.
 */

// sd "microparsers" that are cmumps specific.
var cdt = require('./cmumps2sd_datatypes');
var sddt = require('./sd2cmumps_datatypes');


/**
 * Create a cmumps object from a synthesized diagnosis object. Optionally, you can pass in
 * associated Encounter, Patient and Location objects. Current, the keys are not checked to make
 * sure the objects correctly cross reference each other.
 * 
 * @param cdDiagnosisObject
 * @param cdEncounterObject
 * @param cdPatientObject
 * @param cdLocation
 * @returns {string}
 */
function translate(cdDiagnosisObject, cdEncounterObject, cdPatientObject, cdLocation) {
    // The get function knows how to get values from cmumpsPatientObject using JSONPath.
    var getd = fdt.makeGetter(cdDiagnosisObject);
    var gete = fdt.makeGetter(cdEncounterObject);
    var getp = fdt.makeGetter(cdPatientObject);
    var getl = fdt.makeGetter(cdLocation);

    var diagnosisType = 'Kg_Patient_Diagnosis-100417'; // cmumps type tag for a diagnosis
    // var collection = utils.cmumps2mongo(diagnosisType); // 100417, but the naming convention might someday change
    var patientType = 'Patient-2'; // cmumps type tag for a diagnosis
    var patientCollection = utils.cmumps2mongo(patientType);
    var problem = getd('$.DiagnosisDescription');

    // DiagnosisID is required
    var id = getd('$.DiagnosisID');
    if (! id) return undefined;

    return fdt.clean({
        _id: '100417-' + id,
        type: 'chcss:' + diagnosisType,
        label: problem,
        'problem-100417': problem,
        'patient-100417': {
            // PatientID	FirstName	LastName	Gender	DOB
            id: patientCollection + '-' + getp('$.PatientID'),
            label: sd2cmumps_datatypes.cmumpsPatientLabel(getp('$.LastName'), getp('$.LastName')),
        },
        'condition-100417': 'Permanent',
        'status-100417': 'Active',
        // "provider-100417": {
        //    "id": "6-17514",
        //    "label": "REVELLXXX,PINK"
        // },
        'location-100417': {
            // FacilityID	FacilityName	FacilityLocation
            id: '44-' + getl('$.FacilityID'),
            label: getl('$.FacilityName'),
        },
        'diagnosis-100417': getd('DiagnosisCode'),
        'date_entered-100417': {
            // mm/dd/yyyy -> yyyy-mm-dd
            value: sd2cmumps_datatypes.cmumpsDate(gete('$.AdmitDate')),
            type: 'xsd:date',
        },
        //"entering_user-100417": {
        //    "id": "3-5624",
        //    "label": "REVELLXXX,PINK"
        //}
    });
}



// Export the actual functions here. Make sure the names are always consistent.
[translate].forEach(function(f) { module.exports[f.name] = f; });

/** npm exports
 */

module.exports = {
  cmumps: require('./translate/cmumps'), // not sure this one is used
  demographics: require('./translate/cmumps2fhir_demographics'),
  diagnoses: require('./translate/cmumps2fhir_diagnoses'),
  prescriptions: require('./translate/cmumps2fhir_prescriptions'),
  procedures: require('./translate/cmumps2fhir_procedures'),
  all: require('./translate/cmumps2fhir_all'),
  utils: require('./translate/util/cmumps_utils')
  // note that labs isn't exported yet, currently implemented via shex
};

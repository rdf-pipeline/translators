/** npm exports
 */

module.exports = {
  cmumps: require('./src/js/translate/cmumps'), // not sure this one is used
  demographics: require('./src/js/translate/cmumps2fhir_demographics'),
  diagnoses: require('./src/js/translate/cmumps2fhir_diagnoses'),
  prescriptions: require('./src/js/translate/cmumps2fhir_prescriptions'),
  procedures: require('./src/js/translate/cmumps2fhir_procedures'),
  all: require('./src/js/translate/cmumps2fhir_all'),
  utils: require('./src/js/translate/util/cmumps_utils')
  // note that labs isn't exported yet, currently implemented via shex
};

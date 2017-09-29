/** npm exports
 */

module.exports = {
  chcs: require('./src/js/translate/chcs'), // not sure this one is used
  demographics: require('./src/js/translate/chcs2fhir_demographics'),
  diagnoses: require('./src/js/translate/chcs2fhir_diagnoses'),
  prescriptions: require('./src/js/translate/chcs2fhir_prescriptions'),
  procedures: require('./src/js/translate/chcs2fhir_procedures'),
  all: require('./src/js/translate/chcs2fhir_all'),
  utils: require('./src/js/translate/util/chcs_utils')
  // note that labs isn't exported yet, currently implemented via shex
};

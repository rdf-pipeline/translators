/**
 * Translate chcs objects to fhir objects in simple cases.
 * In some of these simple cases, the function name reflects a concept at the FHIR website,
 * for example a Fhir Reference(Patient). This becomes fhirReferencePatient. By turning these
 * into function calls, you can change the translation in one place and get consistent treatment.
 */

var chcs = require('./chcs');
var _ = require('underscore');
var jsonpath = require('jsonpath');
var format = require('string-format');
var assert = require('assert');
// use eventually
// https://www.npmjs.com/package/node-html-encoder
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');


function htmlEncode(text) {
    if (text === undefined) return undefined;
    return encoder.htmlEncode(text); 
}

/**
 * Returns a closure over an object and list of presented patterns.
 * The closure takes two argument, a JSONPath pattern which will be applied to the object and an
 * optional transformer to apply to the value iff the transformer is passed. The transformer is
 * applied iff a value matches a pattern.
 * @param {object} o -- the object searched with the JSON path expression.
 * @param {String} patterns -- the patterns used to search for objects, a free variable (an array).
 * @returns {Function f(pattern, transformer)}
 */
function makeJsonFetcher1(o, patterns) {
    if (_.isObject(o)) {
        return function (pattern, transformer) {

            var field = jsonpath.query(o, pattern);
            /* if (_.isEmpty(field)) { 
                console.log('\nfield=',field);
                console.log('pattern=',pattern,' o=',o);
            } */
            if (_.isArray(field) && field.length > 0) {
                var result = transformer ? transformer(field[0]) : field[0];
                if (result) patterns.push(pattern); // remember the pattern used
                return result;
            } else
                return undefined;
        }
    } else {
        throw new Error("Can only make json fetchers on objects: '"+ o + "'");
    }
}

// Abstraction for a JSONPath fetcher. Allows us to access objects with expressions rather than literals.
function makeGetter(o) { return makeJsonFetcher1(o, []); }

/**
 * Returns a closure over an object and list of presented patterns.
 * The closure takes two argument, a JSONPath input object, including a path which will be applied to the object, and an
 * optional transformer to apply to the value iff the transformer is passed. The transformer is
 * applied iff a value matches a pattern.
 * @param {object} o -- the object searched with the JSON path expression.
 * @param {String} patterns -- the patterns used to search for objects, a free variable (an array).
 * @returns {Function f(pattern, transformer)}
 */
function accessor(o, patterns, /*post processor */ post /*: function(string) */) {
    var post = post || function (path) { return eval('delete o' + path.substring(1) + ';'); }; // delete path immediately
    if (_.isObject(o)) {
        return function (pattern, transformer) {
            // {resultType: 'all', json: obj, path: path}
            var field = jsonpath.query(o, pattern);
            if (_.isArray(field) && field.length > 0) {
                var result = transformer ? transformer(field[0].value) : field[0].value;
                if (result) {
                    patterns.push(field[0].path);
                    try {
                        post(field[0].path);
                    } catch(err) {

                    }
                } // remember the pattern used
                return result;
            } else
                return undefined;
        }
    } else {
        throw new Error("Can only make json fetchers on objects.");
    }
}


function peek(o, patterns) { return accessor(o, patterns, function(p) {}); }
function eat(o, patterns) { return accessor(o, patterns); }


/**
 * Clean removes key/pairs from an object if the value is undefined or an empty array.
 * This is useful to clean up fhir transformations that really shouldn't be there.
 * @param {object} o -- to be cleaned, SIDE EFFECTS THE OBJECT
 * @returns {object} -- modified o
 */
function clean(o) {
    if (_.isArray(o)) {
        // clean all array elements that are truthy.
        var result = o.filter(function(i) {if (i != undefined) return i; }).map(clean);
        if (o.length > 0) {
            // the list contains something return it.
            return result;
        } else {
            // the list got cleaned to nothing, return undefined
            return undefined;
        }
    } else if (_.isObject(o)) {
        // remove all key/value pairs where the value is undefined or [].
        // return_o is true iff some key/value pair remains. Otherwise all key value pairs removed. So remove this one too.
        var return_o = false;
        for (var k in o) {
            var value = clean(o[k]);

            // The key in this object survives iff it's value is truthy.
            if (value === undefined) {
                // delete the key if its value is undefined
                delete o[k];
            } else if (_.isArray(value) && value.length == 0) {
                // delete the key if its value is an empty array
                delete o[k];
            } else {
                // return this object and update its value to a cleaned one.
                return_o = true;
                o[k] = value;
            }
        }
        // You stepped through all the key/value pairs. Did you remove them all?
        if (return_o || Object.prototype.toString.call(o) === '[object Boolean]') {
            // No, return it.
            return o;
        } else {
            // Yes, don't return it.
            return undefined;
        }
    } else
        return o;  // not an array or object directly, just a value, return it.
}

/**
 * Specifies that a valued is expected and required at key k. Throw an error if its not there.
 * This is used to require a value during translation. It's not used very much.
 * @param {*} v -- the value, truthy true
 * @param {String} k -- a key
 * @returns {boolean}
 */
function required(v, k) {
    if (v) {
        return v;
    } else {
        if (k)
            throw new Error("Required value missing for '" + k + "'");
        else
            throw new Error("Required value missing");
    }
}


/**
 * Translate chcsDate string in format yy(yy)?-mm-dd to fhir format mm-dd-yyyy.
 * @param {string} chcsDate - yy(yy)?-mm-dd
 * @returns {string || undefined} - mm-dd-yyyy
 */
function fhirDate(chcsDate) {
    if (chcsDate === undefined) return undefined;
    var d = chcs.chcsDate(chcsDate);
    return d.day + '-' + d.month + '-' + d.year;
}


/**
 * Given a 'Dosage Text', create a timing object, http://hl7-fhir.github.io/datatypes.html#Timing
 * @param {string} sig -- a prescription string with certain Latin abbreviations.
 * @param {datetime} when -- when the timing begins
 * @returns {{resourceType: 'Timing' ...} || undefined}
 * @see {http://hl7-fhir.github.io/datatypes.html#Timing}
 */
function fhirTiming(sig, when) {
    if (sig === undefined) return undefined;
    var frequency, period, periodUnit; // values assigned from the sig string
    if (sig.match(/\bBID\b/)) {
        frequency = 2;
        period = 1;
        periodUnit = 'd';
    } else if (sig.match(/\bTID\b/)) {
        frequency = 3;
        period = 1;
        periodUnit = 'd';
    } else if (sig.match(/\bQID\b/)) {
        frequency = 4;
        period = 1;
        periodUnit = 'd';
    } else if (sig.match(/\bQ6H\b/)) {
        frequency = 1;
        period = 6;
        periodUnit = 'h';
    } else if (sig.match(/\bQ1D\b/)) {
        frequency = 1;
        period = 1;
        periodUnit = 'd';
    }


    return clean({
        resourceType: 'Timing',
        // from Element: extension
        event: [ when ], // When the event occurs
        repeat: { // When the event is to occur
            // bounds[x]: Length/Range of lengths, or (Start and/or end) limits. One of these 3:
            // "boundsQuantity" : { Quantity(Duration) },
            // "boundsRange" : { Range },
            // "boundsPeriod" : { Period },
            // "count" : <integer>, // Number of times to repeat
            // "duration" : <decimal>, // How long when it happens
            // "durationMax" : <decimal>, // How long when it happens (Max)
            // "durationUnit" : "<code>", // s | min | h | d | wk | mo | a - unit of time (UCUM)
            frequency: frequency, // Event occurs frequency times per period
            // "frequencyMax" : <integer>, // Event occurs up to frequencyMax times per period
            period: period, // Event occurs frequency times per period
            // "periodMax" : <decimal>, // Upper limit of period (3-4 hours)
            periodUnit: periodUnit // s | min | h | d | wk | mo | a - unit of time (UCUM)
            //"when" : "<code>" // Regular life events the event is tied to
        },
        code: fhirCodeableConcept(sig) // QD | QOD | Q4H | Q6H | BID | TID | QID | AM | PM +
    });
}


/**
 * Translate a chcs name format 'LAST, FIRST MI TITLE' to fhir HumanName
 * http://hl7-fhir.github.io/datatypes.html#HumanName
 *
 * @param chcsName
 * @returns {{resourceType: string, use: string}}
 * @see {http://www.amazon.com/ARRIS-SURFboard-SBG6580-Docsis-Router/dp/B0040IUI46}
 *
 */
function fhirHumanName(chcsName) {
    if (chcsName === undefined) return undefined;
    // microparse the chcs name value into fhirParts 'last, first mi title'
    var n = chcs.chcsPatientName(chcsName);

    var result = {
        "use": "usual", // "official"?
        family: [n.last],
    };


    // fhir given is first (+ mi)?
    var given = n.first;
    var mi = jsonpath.query(n, '$.mi')[0];
    if (mi) given += ' ' + mi;
    result.given = [given];

    var title = jsonpath.query(n, '$.title')[0];
    if (title) result.prefix = [title];
    return result;
}

/**
 * Generate a FHIR ContactPoint.
 * @param chcsContactPoint
 * @returns {*}
 * @see {link: 'http://hl7-fhir.github.io/datatypes.html#ContactPoint'}
 */
function fhirContactPoint(chcsContactPoint) {
    if (chcsContactPoint === undefined) return undefined;
    if (! jsonpath.query(chcsContactPoint, '$.value')) return undefined;
    return clean({
        resourceType: "ContactPoint",
        // from Element: extension
        system: jsonpath.query(chcsContactPoint, '$.system'), // C? phone | fax | email | pager | other
        value: jsonpath.query(chcsContactPoint, '$.value'), // The actual contact point details
        use: jsonpath.query(chcsContactPoint, '$.use'), // home | work | temp | old | mobile - purpose of this contact point
        // "rank" : "<positiveInt>", // Specify preferred order of use (1 = highest)
        // "period" : { Period } // Time period when the contact point was/is in use
    });
}


/**
 * Turn a US social security number into a fhir identifier.
 * @param {string} chcsSsn - social security number
 * @param {string} chcsDodId - dod id
 * @returns {Array.<fhir.Address>}
 *
 * TODO: would be helpful to capture the json path from the source chcs object
 *   and put it in the result, something like 'x-source-path': "/@graph/* /type='chcss:2'/ssn-2"
 * @param chcsDodId
 */
function fhirIdentifier(chcsSsn, chcsDodId) {
    if (chcsSsn === undefined && chcsDodId === undefined) return undefined;
    // filter function, id -> fhir_id
    // TODO mike@carif.io: use fhirCodeableConcept instead?
    function f(id) {
        if (id) {
            return {
                use: 'usual',
                // 'system': "ssn://www.us.gov/",  // made up
                // assigner: 'US',
                type: {
                    coding: [{
                        code: 'chcss',
                        display: 'chcss'
                    }],
                    text: id
                },
                value: id,
            };
        } else
            return null;
    }

    var result = [chcsSsn, chcsDodId].filter(function (i) { return i; }).map(f);
    return result;
}

/**
 * Create a FHIR Identifier and associated CodeableConcept. The reference is considered "external" to FHIR, e.g.
 * chcs. Not sure this is right.
 * @param {string} value -- the external id
 * @param {string} codeableConceptType -- invented type e.g. 'chcs'
 * @returns {Identifer || undefined}
 * @see {https://hl7-fhir.github.io/datatypes.html#Identifier}
 */
function fhirExternalIdentifier(value, codeableConceptType) {
    if (value === undefined) return undefined;
    return {
        use: 'usual',
        type: fhirCodeableConcept(codeableConceptType),
        system: 'chcs', // TODO mike@carif.io: what is this really?
        value: value,
        // assigner: {
        //    reference: 'chcs',
        //    display: 'chcs' }
    };
}

/**
 * Given an identifier 'id' with an optional prefix, create a list of a single FHIR chcs identifier.
 * @param {string} id
 * @param {string} prefix -- optional prefix, used by turtle amoungst other things.
 * @returns {List[Identifier] || undefined}
 */
function fhirIdentifierList(id, prefix) {
    if (id === undefined) return undefined;
    return [{
        use: 'usual',
        // assigner: 'US', // TODO carif: why does the xml generation drop this value, but not the tag?
        type: {
            coding: [{
                code: 'chcss',
                display: 'chcss'
            }],
            text: id
        },
        value: prefix ? prefix + '/' + id : id,
    }];
}


/**
 * Translate a chcs marital status into a fhir maritalStatus(http://hl7-fhir.github.io/valueset-marital-status.html)
 * Note: The marital status 'U' in FHIR maps to both "UNKNOWN" and "UNMARRIED". These are two separate concepts.
 * Therefore, I've mapped chcs 'UNKNOWN' to fhir 'U'.
 * @param {string} chcssMaritalStatus - acts as an enum
 * @returns {CodeableConcept || undefined} -- actually a character, 'D' for divorced, etc.
 */

// TODO mike@carif.io: use fhirCodeableConcept()
function fhirMaritalStatus(chcssMaritalStatus) {
    if (chcssMaritalStatus === undefined) return undefined;
    // mapping from http://hl7-fhir.github.io/v3/MaritalStatus/index.html
    // return a "CodableConcept"
    var ms = chcssMaritalStatus.label.toUpperCase();
    if (_.contains(["DIVORCED", "SINGLE,NEVER MARRIED", "MARRIED", "LEGALLY SEPARATED", "UNKNOWN", "WIDOWED"], ms)) {
        return {
            coding: [
                {
                    system: "http://hl7.org/fhir/marital-status",
                    code: ms[0],
                    display: ms[0]
                }
            ],
            text: ms[0]
        };
    } else {
        throw new Error("'" + ms + "' not mapped to fhir");
    }
}

/**
 * Create a fhir address from an intermediate address using the JSONPath style. By intermediate here, I
 * "raise" the chcs address into an object with certain keys and then convert that into a FHIR Address.
 * @param {object} address -- the postal address as an object
 * @returns {Address || undefined}
 * @see {https://hl7-fhir.github.io/datatypes.html#address}
 */
function fhirAddress(address) {
    if (address === undefined) return undefined;
    var participatingProperties = [];
    var fetch1 = makeJsonFetcher1(address, participatingProperties);

    var result = clean({
        line: [ fetch1('$.street1'), fetch1('$.street2'), fetch1('$.street3') ],
        city: fetch1('$.city'),
        district: fetch1('$.county'),
        state: fetch1('$.state'),
        postalCode: fetch1('$.zip'),
        country: fetch1('$.country')
    });

    if (result) {
        result.resourceType = 'Address';
        result.type = 'postal';
    }

    return result;
}


/**
 * Turn a chcs code, i.e. 'chcss:Patient-2' or 'chcss:Prescription-52' into a fhir CodeableConcept.
 * @param chcsTypeCode
 * @returns {CodeableConcept}
 */

function fhirCodeableConcept(chcsTypeCode) {
    if (chcsTypeCode === undefined) return undefined;
    return {
        coding: [
            {
                system: 'chcs', // TODO mike@carif.io, get this from @context?
                version: '0.0.1', // TODO mike@carif.io, don't make this up
                code: 'chcs', // TODO mike@carif.io, relative url?
                display: chcsTypeCode,
                userSelected: false
            }
        ],
        text: chcsTypeCode
    };
}

/**
 * Convenience, return a list of a single CodeableConcept.
 * @param {string} chcsTypeCode
 * @returns {List[CodeableConcept]}
 */
function fhirCodeableConceptList(chcsTypeCode) {
    if (chcsTypeCode === undefined) return undefined;
    return [ fhirCodeableConcept(chcsTypeCode) ];
}


/**
 * http://hl7-fhir.github.io/valueset-diagnostic-service-sections.html
 * @param chcs "service category"
 */
function fhirDiagnosticReportCategory(chcsCode) {
    if (chcsCode === undefined) return undefined;
    // table taken from http://hl7.org/fhir/v2/0074/index.html
    var fromTo = {
        '': 'AU', // Audiology
        '': 'BG', // Blood Gases
        '': 'BLB', // Blood Bank
        '': 'CG', // Cytogenetics
        '': 'CH', // Chemistry
        '': 'CP', // Cytopathology
        '': 'CT', // CAT Scan
        '': 'CTH', // Cardiac Catheterization
        '': 'CUS', // Cardiac Ultrasound
        '': 'EC', // Electrocardiac (e.g. EKG, EEC, Holter)
        '': 'EN', // Electroneuro (EEG, EMG,EP,PSG)
        '': 'GE', // Genetics
        '': 'HM', // Hematology
        '': 'ICU', // Bedside ICU Monitoring
        '': 'IMG', // Diagnostic Imaging
        '': 'IMM', // Immunology
        '': 'LAB', // Laboratory
        '': 'MB', // Microbiology
        '': 'MCB', // Mycobacteriology
        '': 'MYC', // Mycology
        '': 'NMR', // Nuclear Magnetic Resonance
        '': 'NMS', // Nuclear Medicine Scan
        '': 'NRS', // Nursing Service Measures
        '': 'OSL', // Outside Lab
        '': 'OT', // Occupational Therapy
        '': 'OTH', // Other
        '': 'OUS', // OB Ultrasound
        '': 'PAR', // Parasitology
        '': 'PAT', // Pathology (gross & histopath, not surgical)
        '': 'PF', // Pulmonary Function
        '': 'PHR', // Pharmacy
        '': 'PHY', // Physician (Hx. Dx, admission note, etc.)
        '': 'PT', // Physical Therapy
        '': 'RAD', // Radiology
        '': 'RC', // Respiratory Care (therapy)
        '': 'RT', // Radiation Therapy
        '': 'RUS', // Radiology Ultrasound
        '': 'RX', // Radiograph
        '': 'SP', // Surgical Pathology
        '': 'SR', // Serology
        '': 'TX', // Toxicology
        '': 'URN', // Urinalysis
        '': 'VR', // Virology
        '': 'VUS', // Vascular Ultrasound
        '': 'XRC' // Cineradiograph
    };

    // TODO mike@carif.io: awaits implementing labs in FHIR vs shex.
    return 'OTH';

    // TODO mike@carif.io: map this, its currently confusing.
    try {
        return fromTo[chcsCode];
    } catch(e) {
        return 'OTH';
    }
}



// This sequence of functions create references to various kinds of objects.
// They create what is effectively the same structure. But I've separated them
// out because the FHIR website presents them as different things. And we
// might eventually generate different stuff.


/**
 * Given a chcsProvider, return a reference to a FHIR Practioner.
 * @param {object} chcsProvider
 * @returns {{reference: id, display: label}}
 */
function fhirReferencePractioner(chcsProvider) {
    if (chcsProvider === undefined) return undefined;
    return clean({
        // TODO carif: make sure this is correct
        // reference: 'urn:local:fhir:MedicationDispense:' + chcsProvider.id,
        reference: chcsProvider.id,
        display: chcsProvider.label
    });
}


/**
 * Given a chcsDrug (drug-52), return a reference to a FHIR Medication.
 * Usually this is documented as Reference(Medication).
 * @param {object} chcsDrug
 * @returns {{reference: id, display: label}}
 */
// If its mentioned in the FHIR spec, I create a function naming it.
function fhirReferenceMedication(chcsDrug) {
    if (chcsDrug === undefined) return undefined;
    return {
        reference: chcsDrug.id,
        display: chcsDrug.label
    };
}

/**
 * Given a chcsOrder, return a reference to a FHIR MedicationOrder.
 * Usually this is documented as Reference(MedicationOrder).
 * @param chcsOrder
 * @returns {{reference: string, display: string} || undefined}
 */
function fhirReferenceMedicationOrder(chcsOrder) {
    if (chcsOrder === undefined) return undefined;
    return {
        reference: chcsOrder.id,
        display: chcsOrder.label
    };
}

/**
 * Create a FHIR Reference(Patient) based on the chcs patient id.
 * @param {String} chcsPatientId, usually of the form /2-\d+/
 * @returns {{display: *}}
 */
function fhirReferencePatient(chcsPatient) {
    if (chcsPatient === undefined) return undefined;
    return {
        reference: 'Patient/' + chcsPatient.id,
        display: chcsPatient.label
    };
}


/**
 * Create a FHIR Reference(Location) based on the chcsLocation.
 * @param {object} chcsLocation
 * @returns {{reference: *, display: *} || undefined}
 */
function fhirReferenceLocation(chcsLocation) {
    if (chcsLocation === undefined) return undefined;
    return {
        reference: chcsLocation.id,
        display: chcsLocation.label
    };
}


/**
 * Create a FHIR Reference(Organization) based on the chcsOrganization.
 * @param {object} chcsOrganization
 * @returns {{reference: *, display: *} || undefined}
 */
function fhirReferenceOrganization(chcsOrganization) {
    if (chcsOrganization === undefined) return undefined;
    var result = clean({
        name: jsonpath.query(chcsOrganization, '$.name'), // C? Name used for the organization
        telecom: [fhirContactPoint(jsonpath.query(chcsOrganization, '$.telecom'))], // C? A contact detail for the organization
        address: [fhirAddress(jsonpath.query(chcsOrganization, '$.address'))], // C? An address for the organization
        // partOf: { }, // The organization of which this organization forms a part, TODO: VA?
        // contact: [{ // Contact for the organization for a certain purpose
        //     purpose: { fhirCodeableConcept }, // The type of contact
        //     "name" : { HumanName }, // A name associated with the contact
        //     "telecom" : [{ ContactPoint }], // Contact details (telephone, email, etc.)  for a contact
        //     "address" : { Address } // Visiting or postal addresses for the contact
    });
    if (result) {
        result.type = fhirCodeableConcept('medical'), // Kind of organization
            result.resourceType = "Organization";
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        // identifier: [{ Identifier }], // C? Identifies this organization  across multiple systems
        result.active = true; // Whether the organization's record is still in active use
    }
    return result;
}






/**
 * Given quantity value and units, create a fhir Quantity
 * @param {int} value -- the quantity
 * @param {string} units -- the units as a string, optional, default 'unsupplied'
 * @returns {{value: int, unit: string, system: 'chcs', code: 'chcs'} || undefined} -- a fhir Quantity
 * @see {http://hl7-fhir.github.io/datatypes.html#Quantity}
 */
function fhirQuantity(value, units) {
    if (value === undefined) return undefined;
    units = units || 'unsupplied';
    return {
        value: typeof(value) == 'string' ? parseInt(value) : value,
        unit: units,
        system: 'chcs',
        code: 'chcs'
    };
}


/**
 * Given a chcs provider (provider-6), translate that into a FHIR practioner. Gets the full treatment including
 * warnings and participating properties.
 * @param {object} chcsProvider
 * @returns {Practioner || undefined}
 * @see{https://hl7-fhir.github.io/practitioner.html}
 */
function fhirPractioner(chcsProvider, options) {
    if (chcsProvider === undefined) return undefined;
    var options = options || {participants: false, warnings: false};
    var participatingProperties = []; // no participants yet
    warnings = []; // no warnings yet

    // Create a fetcher for chcsLabResultObject. The fetcher will get data values from
    // input chcsLabResultObject, remembering those that actually have values in list participating_properties.
    var fetch1 = makeJsonFetcher1(chcsProvider, participatingProperties);

    var fhirPractioner = {
        resourceType: 'Practitioner',
        // from Resource: id, meta, implicitRules, and language
        // from DomainResource: text, contained, extension, and modifierExtension
        identifier: fetch1('$.type', function(i) { return [fhirIdentifier(i)]; }), // A identifier for the person as this agent
        active: true, // Whether this practitioner's record is in active use
        name: fetch1('$.id.label', fhirHumanName), // A name associated with the person
        // telecom: [{ContactPoint}], // A contact detail for the practitioner
        // address: [{Address}], // Where practitioner can be found/visited
        // gender: "<code>", // male | female | other | unknown
        // birthDate: "<date>", // The date  on which the practitioner was born
        // photo: [{Attachment}], // Image of the person
        // practitionerRole: [{ // Roles/organizations the practitioner is associated with
        //    managingOrganization: {Reference(Organization)}, // Organization where the roles are performed
        //    role: {CodeableConcept}, // Roles which this practitioner may perform
        //    specialty: [{CodeableConcept}], // Specific specialty of the practitioner
        //    period: {Period}, // The period during which the practitioner is authorized to perform in these role(s)
        //    location: [{Reference(Location)}], // The location(s) at which this practitioner provides care
        //    healthcareService: [{Reference(HealthcareService)}] // The list of healthcare services that this worker provides for this role's Organization/Location(s)
        //}],
        //qualification: [{ // Qualifications obtained by training and certification
        //    identifier: [{Identifier}], // An identifier for this qualification for the practitioner
        //    code: {CodeableConcept}, // R!  Coded representation of the qualification
        //    period: {Period}, // Period during which the qualification is valid
        //    issuer: {Reference(Organization)} // Organization that regulates and issues the qualification
        //}],
        //communication: [{CodeableConcept}] // A language the practitioner is able to use in patient communication
    };


    // TODO: need to convey which fields actually participate in a translation in a fhir acceptable encoding.
    // You have the fields in participatingProperties but you need to generate a syntactically valid
    // FHIR extension. Not done yet.
    // if (options.participants) addParticipants(fhirPractioner, participatingProperties);
    // if (options.warnings) addWarnings(fhirPractioner, warnings);
    clean(fhirPractioner);
    // Additional semantic processing here
    return fhirPractioner;
}

// Helper functions specific to a chcs Patient translation with no "handle" in the FHIR spec (e.g. HunmanName).

/**
 * Return 'male', 'female' or ''. Note the '' is javascript "truthy" false.
 * @param i
 * @returns {*}
 */
function fhirPatientGender(i) {
    if (i === undefined) return undefined;
    // return i.label.toLowerCase()
    if (_.has(i, 'label') && typeof(i.label) == 'string') {
        return i.label.toLowerCase();
    } else if (typeof(i) == 'string') {
        return i.toLowerCase();
    } else {
        return '';
    }
}

/**
 * Convert bd.value to a FHIR Date
 * @param bd
 * @returns {string}
 */
function fhirPatientBirthDate(bd) {
    if (bd === undefined) return undefined;
    if (_.has(bd, 'value')) return fhirDate(bd.value);
}

/**
 * chcs lumps state and country together. Pick out the state.
 * @param s
 * @returns {*}
 */
function fhirPatientState(s) {
    if (s === undefined) return undefined;
    if (_.has(s, 'label') && typeof(s.label) == 'string') return s.label.split('/')[0];
}

/**
 * chcs lumps state and country together. Pick out the country.
 * @param s
 * @returns {*}
 */
function fhirPatientCountry(s) {
    if (_.has(s, 'label') && typeof(s.label) == 'string') {
        var a = s.label.split('/'); // TODO: let?
        if (a.length > 1) return a[1];
    }
}

function fhirId(fhirType, id) {
    if (fhirType === undefined || id === undefined) return undefined;
    // return 'urn:local:fhir:' + fhirType + ':' + id;
    return id;
}



// Export the actual functions here. Make sure the names are always consistent.
[makeJsonFetcher1, makeGetter, peek, eat, clean, required, fhirDate, fhirHumanName, fhirContactPoint,
    fhirIdentifier, fhirIdentifierList, fhirMaritalStatus, fhirAddress,
    fhirReferenceLocation, fhirReferencePatient, fhirReferencePractioner,
    fhirDiagnosticReportCategory, fhirCodeableConcept, fhirCodeableConceptList,
    fhirReferenceMedication, fhirReferenceMedicationOrder, fhirQuantity, fhirReferencePatient,
    fhirTiming, fhirReferenceLocation, fhirReferenceOrganization, fhirExternalIdentifier, fhirPractioner,
    fhirPatientGender, fhirPatientBirthDate, fhirPatientState, fhirPatientCountry, fhirId,
    htmlEncode
].forEach(function(f) { module.exports[f.name] = f; });

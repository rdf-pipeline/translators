# cmumps Translate Synthesized Data Module (and Friends)

Although FHIR is the preferred output format of this library (see [translate/README.md](../translate/README.md)), you
can create your own output format. This directory `translate-sd` for "translate and generate synthetic data" is an
example where cmumps is the input and Javascript objects are the output. This is an "invented" format, but provides
an example of how you can invent a format of your choice for your own integration exercise.

Local Date `LocalDate` format appears to be 'mm/dd/yyyy hh:mm AM|PM', regular expression /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/
Is this UTC Zulu?

In mongo, FHIR and node, dates are `ISODate`, sometimes also called `xs:dateTime`. They implement ISO 8601 and have
the same default format: `[-]CCYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm]`.

EncounterType is one of 'ER', 'inpatient', 'office'.

Encounters: 
  PatientID : int fk
  EncounterID : int key
  AdmitDate: LocalDate 
  DischargeDate: LocalDate
  EncounterType: Set[String].member 
  FacilityID

Labs: 
  EncounterID
  LabOrderID
  LabName
  LabDescription
  LabValue
  LabValueUnits
  AccessionID
  LabOrderDate
  LabCompletedDate

Medications:
  EncounterID
  MedOrderID
  MedicationName
  MedicationDose
  MedicationDoseUnits
  MedicationQuantity
  MedicationID
  MedOrderDate
  MedOrderCompleteDate

Notes:  
  EncounterID
  NoteID
  NoteText
  AuthorID
  NoteDate : Date

Patients: 
  PatientID
  FirstName
  LastName
  Gender
  DOB

Procedures: 
  EncounterID
  ProcedureOrderID
  ProcedureName
  ProcedureDate

Diagnoses: 
  EncounterID
  DiagnosisID
  DiagnosisCode
  DiagnosisDescription
  Sequence

Facilities: 
  FacilityID
  FacilityName
  FacilityLocation


This directory consists of the following modules:

Note that the cmumps "data model" is relatively simple. The `@graph` portion of the input contains a set of data "reports" 
about a single patient. The reports are in no particular order and
are of various kinds (e.g. demographics or medications). The data set may or may not be "complete"; it's just the data
reported on input. Since the `@graph` is an array of objects, each array item has a `type` key which designates
how to interpret that item. This key can also be used to drive the translator(s).


* `sd.js`:

  - a set of functions that "know" how to update a sd bundle with cmumps information
    
  - a set of extractors, that can dig out object or array of objects of various sd types, such as 'Patient' or 
    'MedicationDispense'.
                          
* `cmumps2sd_{,simple_}*`: a set of translation functions in translation modules that take cmumps objects types like 
  'Patient-2' and translate them to their sd analog like 'Patient'. There are two types of translators: a simple version,
  e.g. `cmumps2fihr_simple_demographics,js` that just translates input to output and the more sophisticated (but complicated)
  `cmumps2sd_*.js`, which adds data "provenance" information to the bundle. The caller needs to pass in the correct
  cmumps analog input (e.g. Patient-2). See the `cmumps.extract*` functions above, which facilitate picking out the right
  input.
     
     
Some example scripts are in "./utils":

* `cmumps-file.js`: loads a cmumps jsonld object and translates it in either json or xml. Can output only particular parts
  of a translation, e.g. demographics or medications. More at the [utils README](../utils/README.md).
     
Here's an example run:
     
```bash
./util/cmumps-file.js  ../../data/fake_cmumps/patient-7/cmumps-patient7.jsonld 
```
or to get xml output

```bash
./util/cmumps-file.js --output=xml ../../data/fake_cmumps/patient-7/cmumps-patient7.jsonld
```

The xml output is a quick sanity check to see if the sd json output is well-formed sd.

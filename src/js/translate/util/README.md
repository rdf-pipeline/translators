This directory contains a set of command line utilities useful for these or experiment with the cmumps2fhir [translators](../translate).
The highlights are:

* `cmumps-file.js`: Given a cmumps input data file with various parts (demographics, medications, etc), generate the fhir json or
  fhir xml translation.

```bash
./cmumps-file.js --part=patient  ../../data/fake_cmumps/bugs-bunny/bugs-bunny.jsonld 
{
  "resourceType": "Patient",
  "identifier": [
    {
      "use": "usual",
      "assigner": "US",
      "type": {
        "coding": [
          {
            "code": "cmumpss",
            "display": "cmumpss"
          }
        ],
        "text": "777777777"
      },
      "value": "777777777"
    }
  ],
  "name": {
    "use": "usual",
    "family": [
      "BUNNY"
    ],
    "given": [
      "BUGS DOC"
    ]
  },
  "gender": "male",
  "birthDate": "01-01-1990",
  "address": [
    {
      "type": "postal",
      "line": [
        "8584 CHINA BERRY CIRCLE"
      ],
      "city": "HIGHWOOD",
      "state": "ME",
      "country": "USA"
    }
  ],
  "maritalStatus": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/marital-status",
        "code": "D",
        "display": "D"
      }
    ],
    "text": "D"
  },

...
```

Or xml:

```bash
./cmumps-file.js --part=patient  --output=xml ../../data/fake_cmumps/bugs-bunny/bugs-bunny.jsonld 
<?xml version='1.0' encoding='UTF-8'?>
<Patient>
  <identifier>
    <use value="usual"/>
    <type>
      <coding>
        <code value="cmumpss"/>
        <display value="cmumpss"/>
      </coding>
      <text value="777777777"/>
    </type>
    <value value="777777777"/>
    <assigner>
    </assigner>
  </identifier>
  <name>
    <use value="usual"/>
    <family value="BUNNY"/>
    <given value="BUGS DOC"/>
  </name>
  <gender value="male"/>
  <birthDate value="01-01-1990"/>
  <address>
    <type value="postal"/>
    <line value="8584 CHINA BERRY CIRCLE"/>
    <city value="HIGHWOOD"/>
    <state value="ME"/>
    <country value="USA"/>
  </address>
  <maritalStatus>
    <coding>
      <system value="http://hl7.org/fhir/marital-status"/>
      <code value="D"/>
      <display value="D"/>
    </coding>
    <text value="D"/>
  </maritalStatus>
  ...
</Patient>
```

Note that on Linux, you can use `curl` to source the data, e.g. and `/dev/stdin` to treat stdin like a file:

```bash
curl -s 'http://10.255.241.50:8080/patient_graph?dataset=cmumps-nc&patientid=1000004&datatype=all' \
  | ./cmumps-file.js --part=demographics /dev/stdin | grep Patient  ## remove the grep to see the result
  "resourceType": "Patient",
```

You can also `tee` the curl to make sure you got what you expected, e.g.


```bash
curl -s 'http://10.255.241.50:8080/patient_graph?dataset=${endpoint}&patientid=1000004&datatype=all' \ tee 10000004.jsonld |
  | ./cmumps-file.js --part=demographics /dev/stdin | grep Patient  ## remove the grep to see the result
  "resourceType": "Patient",
```

but its advisable to do this on an encrypted file system (I've been told).

See also `cmumps-file.sh` so you don't have to memorize this command. And ./cmumps-file.js --help for additional arguments.

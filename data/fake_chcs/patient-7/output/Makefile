# Make a FHIR json, xml file from a jsonld input.

# http://blog.jgc.org/2007/01/what-makefile-am-i-in.html
where-am-i = $(CURDIR)/$(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
# HERE is the directory housing this Makefile
# HERE is used to find util/chcs-file.js
HERE=$(dir $(call where-am-i))

# where the output is pushed to, 'mkdir elsewhere; make OUTPUT=elsewhere all' will generate to directory 'elsewhere'
SRC := $(HERE)..
# What 'all' knows how to generate.
SOURCES := $(wildcard $(HERE)../chcs-*.jsonld)
PARTS := demographics medications diagnoses, procedures
CHCSFILE := $(HERE)../../../../translate/util/chcs-file.js
CHCSPARTS := $(HERE)../../../../translate/util/chcs-parts.js

JSONLINT := jsonlint

# sudo apt-get update && sudo apt-get install -y libsaxonhe-java
SAXONB := /usr/share/java/Saxon-HE-9.5.1.1.jar

# By default, w3c/hcsls-fhir-rdf is assumed to be a sibling git repos (e.g. ~/src/{rdf-pipeline/translators,w3c/hcls-fhir-rdf})
HCLS_FHIR_RDF := $(HERE)../../../../../../w3c/hcls-fhir-rdf
# TODO: find this file instead of hardcoding it? It's going to move someday...
TRANSFORM_XSL := $(HCLS_FHIR_RDF)/share/xsl/transform.xsl
DEFINITIONS_XML := $(HCLS_FHIR_RDF)/data/definitions.xml

# Create .json file from a .jsonld file.
%.json : $(SRC)/%.jsonld
	$(CHCSFILE)  $< > $@

%.ttl : %.xml
	java -classpath $(SAXONB) net.sf.saxon.Transform -xsl:$(TRANSFORM_XSL) -s:$< fhirdefs=$(DEFINITIONS_XML) > $@

# Create the demographics part for a jsonld file.
%-demographics.json : $(SRC)/%.jsonld
	$(CHCSFILE) --part=demographics $< > $@

# Create the medications part for a jsonld file.
%-medications.json : $(SRC)/%.jsonld
	$(CHCSFILE) --part=medications $< > $@

# Create the diagnoses part for a jsonld file.
%-diagnoses.json : $(SRC)/%.jsonld
	$(CHCSFILE) --part=diagnoses $< > $@

# Create the procedures part for a jsonld file.
%-procedures.json : $(SRC)/%.jsonld
	$(CHCSFILE) --part=procedures $< > $@

# Create .xml file from a .jsonld file.
%.xml : $(SRC)/%.jsonld
	$(CHCSFILE)  --output=xml $< > $@

# create demographics xml
%-demographics.xml : $(SRC)/%.jsonld
	$(CHCSFILE) --output=xml --part=demographics $< > $@

# create medications xml
%-medications.xml : $(SRC)/%.jsonld
	$(CHCSFILE) --output=xml --part=medications $< > $@

# create diagnoses xml
%-diagnoses.xml : $(SRC)/%.jsonld
	$(CHCSFILE) --output=xml --part=diagnoses $< > $@

# create procedures xml
%-procedures.xml : $(SRC)/%.jsonld
	$(CHCSFILE) --output=xml --part=procedures $< > $@

# Generate all the local buildables based on SOURCES
ALL := $(patsubst $(SRC)/%, %, $(SOURCES:.jsonld=.json) $(SOURCES:.jsonld=.ttl) $(SOURCES:.jsonld=-demographics.json) $(SOURCES:.jsonld=-medications.json) $(SOURCES:.jsonld=-diagnoses.json) $(SOURCES:.jsonld=-procedures.json) \
              $(SOURCES:.jsonld=.xml) $(SOURCES:.jsonld=-demographics.xml) $(SOURCES:.jsonld=-medications.xml) $(SOURCES:.jsonld=-diagnoses.xml) $(SOURCES:.jsonld=-procedures.xml))

.PHONY: all clean diff lint expected
all: $(ALL)

# Clean the local buildables
clean:
	-rm $(ALL)

# Clean the local buildables.g
lint: 
	@$(foreach f, $(SOURCES), $(JSONLINT) $(f) 2>&1 1 > /dev/null || echo $(f) failed; )

expected: all
	-rm $(patsubst %, $(HERE)../expected/%, $(ALL))
	cp -v $(ALL) $(HERE)../expected

# Diff local buildables against a golden master. A quick but not authoratative check.
diff: all
	diff -x '*Makefile*' -w -B $(HERE)../expected $(HERE)



# Some example test cases available for fast access. Bash can complete the target names too.
# Defining and calling functions in make: https://www.gnu.org/software/make/manual/html_node/Call-Function.html
# Curl the LDR endpoint with a 
CURLIT = curl -s 'http://10.255.241.50:8080/patient_graph?dataset=$(1)&patientid=$(2)&datatype=all'| $(CHCSFILE) /dev/stdin
CURLPARTS = curl -s 'http://10.255.241.50:8080/patient_graph?dataset=$(1)&patientid=$(2)&datatype=all'| $(CHCSPARTS) /dev/stdin

PATIENTS := 922419 1000099 600357 839429 754427 100210 Patient-12042
.PHONY: ldr $(PATIENTS)
ldr: $(PATIENTS)

# Patient-12052 come from the "aahta" dataset
$(PATIENTS):
	$(call CURLIT,$(DATASET),$@)
	$(call CURLPARTS,$(DATASET),$@)



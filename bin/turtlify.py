#!/usr/bin/env python

from rdflib import Graph
import sys

print Graph().parse(data="""PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX chcss: <http://hokukahu.com/schema/chcss#>
PREFIX entity: <http://hokukahu.com/systems/chcs-1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX fhir: <http://hl7.org/fhir/>
""",format="turtle").parse(file=sys.stdin, format="turtle").serialize(format="turtle").decode('utf-8')

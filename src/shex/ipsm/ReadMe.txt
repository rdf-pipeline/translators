This is a small example used to compare ShExMap with IPSM, which is
an RDF translation system created by the Inter-IoT group in the EU.
The goal was to create a ShExMap translator that would perform the
same translation that the Inter-IoT team demonstrated in a simple
example.   

Key concepts to understand this example:

 - ShExMap performs RDF-to-RDF translations in two steps, using two separate ShExMap schemas: one for the source RDF and one for the target RDF.  In this example, the source schema is BodyCloudObject.shex and the target schema is Observation.shex .

 - The first step is Validate, which takes the source schema and source instance data (obs-input.ttl) and produces a list of variable bindings, i.e., variable-value pairs.   The variables are named using URIs.  In this example, the variables are named (as Turtle-like prefixed URIs):
     cloud:userLastName
     cloud:userId
     cloud:hasWeight
     etc.
or as absolute URIs:
     <http://inter-iot.eu/syntax/BodyCloud#userLastName>
     <http://inter-iot.eu/syntax/BodyCloud#userId>
     <http://inter-iot.eu/syntax/BodyCloud#hasWeight>
     etc.

 - The second step is Materialize, which takes the target schema and the list of bound variables from the first step, and produces the translated RDF instance data (obs-output.ttl) matching the target schema.
 
See the recorded demo: https://youtu.be/z5hx_1zMB2c

See also:
  https://lists.w3.org/Archives/Public/www-archive/2018Apr/att-0002/INTER-IoT_Semantic_Interoperability_3-04-2018.pdf
  https://www.w3.org/2018/06/12-hcls-minutes.html
  https://www.w3.org/2018/05/29-hcls-minutes.html
  https://lists.w3.org/Archives/Public/www-archive/2018May/0003.html


#! /usr/bin/perl -w

# List FHIR extensions from shex schemas.
# NOT GUARENTEED TO WORK!
# Use like this:
# ./grep-fhir-extensions.perl *.shex |sort -u

foreach my $f ( @ARGV ) {
	open(my $fh, "<$f") || die;
	my $all = join("", <$fh>);

	# Delete comments:
	$all =~ s/\#[^\n]*\n/\n/msg;
	# print "$all\n"; exit 0;

	# Ignore: 
	#	fhir:extension @<Extension>*;
	#	fhir:modifierExtension @<Extension>*;
	$all =~ s/\bfhir\:(modifier)?extension\s+\@\<Extension\>\s*\*\s*\;/ /imsg;
	# print "$all\n"; exit 0;

	# Grab only fhir:...extension sections.
	#    fhir:extension {
	#      fhir:url                        { fhir:value IRI %Map: { dem:constCmumpsFmp2 %} };
	#      fhir:valueId                    { fhir:value xsd:string %Map: { dem:fmp_id %} };
	#      fhir:valueString                { fhir:value xsd:string %Map: { dem:fmp_label %} };
	#    }*;
	# Assume the end of the extension is always: %} }; }*;
	# my @maps = ($all =~ m/\bfhir\:[\w\.\-]*extension\b(.*?)\s*\%\}\s*\}\s*\;\s*\}\*?\s*\;/msg);
	# fhir:extension ... fhir:url  { fhir:value IRI   %Map: { ... %}
	my @maps = ($all =~ m/\bfhir\:[\w\.\-]*extension\b.*?fhir:url.*?\%Map(.*?)\%}/msg);


	# print "maps: @maps\n"; exit 0;

	$all = join("\n\n", @maps);
	# print "$all\n\n"; 

	my @words = ($all =~ m/([\w\-]+\:[\w\-]+)/g);
	$all = join("\n", @words);
	print "$all\n" if @words; 
	}

exit 0;


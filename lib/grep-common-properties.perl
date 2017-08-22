#! /usr/bin/perl -w

# List common elements from shex schemas, i.e., the ones
# inside %Map:{ ... %}.
# Use like this:
# ./grep-common-properties.perl ../test/data/*fhir*.shex |sort -u

foreach my $f ( @ARGV ) {
	open(my $fh, "<$f") || die;
	my $all = join("", <$fh>);

	# Delete comments:
	$all =~ s/\#[^\n]*\n/\n/msg;
	# print "$all\n"; exit 0;

	# Grab only %Map:{ ... %} portions:
	my @maps = ($all =~ m/\%Map\:\{\s*(.*?)\s*\%\}/msg);
	# print "maps: @maps\n"; 
	@maps = map { 
		my @props = ($_ =~ m/(\w+\:[\w\-]+)/msg); 
		my $n = scalar(@props);
		# print "$n @props\n"; 
		@props 
		} @maps;
	
	$all = join("\n", @maps);
	print "$all\n"; 
	# exit 0;
	}

exit 0;


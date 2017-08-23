#! /usr/bin/perl -w

# List common elements from shex schemas, i.e., the ones
# inside %Map:{ ... %}.
# Use like this:
# ./grep-common-properties.perl ../src/shex/cmumps/fhir/*.shex | sort -u

foreach my $f ( @ARGV ) {
	open(my $fh, "<$f") || die;
	my $all = join("", <$fh>);

	# Delete comments:
	$all =~ s/\#[^\n]*\n/\n/msg;
	# print "$all\n"; exit 0;

	# Grab only %Map:{ ... %} portions:
	my @maps = ($all =~ m/\%Map\:\s*\{\s*(.*?)\s*\%\}/imsg);
	my $nMaps = scalar(@maps);
	my @simpleMaps = ($all =~ m/\b(Map)\b/imsg);
	my $nSimpleMaps = scalar(@simpleMaps);
	# print "maps: @maps\n"; 
	@maps = map { 
		my @props = ($_ =~ m/(\w+\:[\w\-]+)/msg); 
		my $n = scalar(@props);
		# print "$n @props\n"; 
		warn "[WARNING] No %Map properties found: { $_ }\n" if !@props;
		@props 
		} @maps;
	
	$all = join("\n", @maps);
	print "$all\n"; 
	my $newNMaps = scalar(@maps);
	die "[ERROR] Lost some \%Maps!  nMaps: $nMaps newNMaps: $newNMaps\n" if ($newNMaps < $nMaps);
	# Prefix declaration has two "Map" words
	warn "[WARNING] nMaps: $nMaps newNMaps: $newNMaps nSimpleMaps: $nSimpleMaps\n"
		if $nMaps < $nSimpleMaps - 2;
	# exit 0;
	}

exit 0;


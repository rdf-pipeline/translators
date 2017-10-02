#! /usr/bin/perl -w

# List source elements from shex schemas.  Generates TSV.
# Use like this:
# ./grep-source-properties.perl  ../src/shex/cmumps/common/*.shex > /tmp/properties.csv

# Header line:
# print "CHCS Class Name\tCHCS Attributes Mapped to Common Schema\n";
# CSV instead of TSV:
print "CHCS Class Name,CHCS Attributes Mapped to Common Schema\n";

foreach my $f ( @ARGV ) {
	open(my $fh, "<$f") || die;
	my $all = join("", <$fh>);

	# Strip everything up through the first brace:
	# <http://hokukahu.com/Absent_Status-8131> {
	$all =~ s/\A[^\{\}]*\{//ms;
	# Strip everything from the last brace to the end:
	$all =~ s/\}[^\{\}]*\Z//ms;

	# Delete everything between braces, in order to leave only
	# top-level properties:
	while (1) {
		my $old = $all;
		$all =~ s/\{[^\{\}]*\}//ms;
		last if $old eq $all;
		}
	# print "$all\n";

	# Collect the words into a hash, for uniqueness
	my %words = ();
	while ($all =~ s/\w+\:[\w\-]+//) {
		my $w = $&;
		# Skip datatypes:
		next if $w =~ m/^xsd\:/;

		# Strip the prefix:
		$w =~ s/^\w+\://;

		# Skip cmumps_type
		next if $w eq "cmumps_type";

		# Save it (uniquely):
		$words{$w} = 1;
		# warn "word: $w\n";
		}

	# Shorten the filename for display. Strip the path:
	$f =~ s/^.*\///;
	# and the extension:
	$f =~ s/\.[^\.]*$//;

	# Sort and output:
	my @words = sort keys %words;
	my $words = join(", ", @words);
	# print "$f\t$words\n";
	# CSV instead of TSV:
	print "$f,\"$words\"\n";
	}

exit 0;


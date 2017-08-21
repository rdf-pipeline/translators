#! /usr/bin/perl -w

# List source element from a shex schema.
# Reads stdin; writes stdout.

my $all = join("", <>);


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
	$words{$w} = 1;
	# warn "word: $w\n";
	}

# Sort and output:
my @words = sort keys %words;
my $words = join("\n", @words);
print "$words\n";

exit 0;


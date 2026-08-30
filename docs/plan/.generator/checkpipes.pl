#!/usr/bin/perl
# Reports every wikilink alias pipe that sits in a markdown table row without a
# backslash in front of it. Obsidian splits the cell on an unescaped pipe.
use strict;
use warnings;

my $bad = 0;
while (my $line = <>) {
    next unless $line =~ /^\|/;
    while ($line =~ /\[\[([^\]]*?)(?<!\\)\|/g) {
        print "$ARGV:$.: [[$1|\n";
        $bad++;
    }
}
continue { close ARGV if eof }
print $bad ? "$bad unescaped\n" : "clean\n";
exit($bad ? 1 : 0);

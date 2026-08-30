#!/usr/bin/perl
# Reports every wikilink whose target note does not exist, and every heading
# anchor that no target file carries. Run from the repository root:
#   perl docs/plan/.generator/checklinks.pl
use strict;
use warnings;
use File::Find;

my (%note, %heading);

find(sub {
    return unless /\.md$/;
    my $path = $File::Find::name;
    return if $path =~ m{/node_modules/};
    (my $base = $_) =~ s/\.md$//;
    $note{$base} = $path;
    open my $fh, '<', $_ or return;
    while (my $l = <$fh>) {
        next unless $l =~ /^#{1,6}\s+(.+?)\s*$/;
        $heading{"$base#$1"} = 1;
    }
    close $fh;
}, 'docs');

my ($missing, $badanchor, $total) = (0, 0, 0);
find(sub {
    return unless /\.md$/;
    my $path = $File::Find::name;
    return if $path =~ m{/node_modules/};
    open my $fh, '<', $_ or return;
    my $n = 0;
    while (my $l = <$fh>) {
        $n++;
        while ($l =~ /\[\[([^\]|]+?)(?:\\?\|[^\]]*)?\]\]/g) {
            my $target = $1;
            $total++;
            my ($file, $anchor) = split /#/, $target, 2;
            next unless length $file;
            if (!exists $note{$file}) {
                print "MISSING NOTE  $path:$n  [[$target]]\n";
                $missing++;
                next;
            }
            if (defined $anchor && !exists $heading{"$file#$anchor"}) {
                print "MISSING ANCHOR $path:$n  [[$target]]\n";
                $badanchor++;
            }
        }
    }
    close $fh;
}, 'docs');

print "checked $total links: $missing missing notes, $badanchor missing anchors\n";
exit(($missing || $badanchor) ? 1 : 0);

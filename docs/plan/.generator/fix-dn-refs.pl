#!/usr/bin/perl
# One-shot: repoint the decision-needed references that were written before
# docs/decisions.md settled its final numbering, and turn each into a wikilink.
# Table cells get an escaped pipe; prose gets a plain one.
use strict;
use warnings;

my %head = (
  'DN-003' => 'Is "not the same person" enough, or must the checker sit in a different line',
  'DN-004' => 'Do the two sector-named addresses survive',
  'DN-008' => 'What turns a penalty into a severity',
  'DN-009' => "How is one risk's residual score worked out",
  'DN-010' => 'How much does each thing about a supplier count toward its risk tier',
  'DN-012' => 'Who stands down when an allegation names a team rather than a person',
  'DN-015' => 'How real is the intelligence in the first release',
);

# file => [ line, wrong id, right id ]
my @fix = (
  ['docs/plan/data-model.md',            604,  'DN-004', 'DN-009'],
  ['docs/plan/data-model.md',            1268, 'DN-005', 'DN-012'],
  ['docs/plan/data-model.md',            1561, 'DN-004', 'DN-009'],
  ['docs/plan/data-model.md',            1562, 'DN-006', 'DN-008'],
  ['docs/plan/data-model.md',            1562, 'DN-007', 'DN-010'],
  ['docs/plan/slice-plan.md',            441,  'DN-010', 'DN-015'],
  ['docs/plan/slice-plan.md',            447,  'DN-002', 'DN-004'],
  ['docs/plan/workflows/assurance.md',   128,  'DN-008', 'DN-003'],
  ['docs/plan/workflows/control.md',     57,   'DN-008', 'DN-003'],
  ['docs/plan/workflows/risk.md',        79,   'DN-004', 'DN-009'],
);

my %byfile;
push @{ $byfile{ $_->[0] } }, $_ for @fix;

for my $file (sort keys %byfile) {
    open my $in, '<', $file or die "$file: $!";
    my @lines = <$in>;
    close $in;

    for my $f (@{ $byfile{$file} }) {
        my ($_f, $no, $wrong, $right) = @$f;
        my $l = $lines[$no - 1];
        unless (defined $l && $l =~ /\b\Q$wrong\E\b/) {
            print "SKIP $file:$no  $wrong not on that line\n";
            next;
        }
        my $pipe = ($l =~ /^\|/) ? '\\|' : '|';
        my $link = "[[decisions#$right $head{$right}$pipe$right]]";
        $l =~ s/\b\Q$wrong\E\b/$link/;
        $lines[$no - 1] = $l;
        print "$file:$no  $wrong -> $right\n";
    }

    open my $out, '>', $file or die "$file: $!";
    print $out @lines;
    close $out;
}

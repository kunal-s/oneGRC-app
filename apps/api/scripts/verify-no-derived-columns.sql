-- Derive-don't-store, asserted against the live database rather than the
-- schema file (BR-DRV-*, ADR-008, REVIEW.md invariant 7).
--
-- Any row returned is a violation. A stored copy of a derivable fact is a
-- future lie: the summary drifts from the records it claims to summarise.
SELECT table_name, column_name, 'banned derived column' AS reason
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
        lower(column_name) LIKE '%overdue%'
     OR lower(column_name) LIKE '%age_days%'
     OR lower(column_name) LIKE '%agedays%'
     OR lower(column_name) LIKE '%net_loss%'
     OR lower(column_name) LIKE '%netloss%'
     OR lower(column_name) LIKE '%evidence_count%'
     OR lower(column_name) LIKE '%evidencecount%'
     OR lower(column_name) LIKE '%_score'
     OR lower(column_name) = 'trend'
  )
UNION ALL
-- Department is derived from the record owner (BR-SCP-01). Only Person may
-- store it; a department column anywhere else can disagree with the org chart.
-- Instrument.departments is the one named exception (D-032): an instrument has
-- no owner to derive a department from, so the Compliance Manager who
-- registers it assigns the list by hand. This is a decision a person took, not
-- a stored copy of a derivable fact, and the exception is named here rather
-- than widening the rule for anything else.
SELECT table_name, column_name, 'department stored outside Person'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND lower(column_name) LIKE '%department%'
  AND table_name <> 'Person'
  AND table_name <> 'ActionAuthority'
  AND NOT (table_name = 'Instrument' AND column_name = 'departments');

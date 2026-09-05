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
-- Three named exceptions, none a stored copy of a derivable fact:
--   Instrument.departments (D-032): an instrument has no owner to derive a
--     department from, so the Compliance Manager who registers it assigns the
--     list by hand, a decision a person took.
--   ActionAuthority.requiresDepartment: the matrix row's own gate, not a fact
--     about any record's owner.
--   DepartmentHead.department: the row's own subject. There is no owner to
--     derive it from; the row exists to say which department this person
--     heads (FRD 4.13, LDR-014).
SELECT table_name, column_name, 'department stored outside Person'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND lower(column_name) LIKE '%department%'
  AND table_name <> 'Person'
  AND table_name <> 'ActionAuthority'
  AND table_name <> 'DepartmentHead'
  AND NOT (table_name = 'Instrument' AND column_name = 'departments');

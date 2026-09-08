-- SLICE-04: one Postgres tsvector per searchable table (SRCH-008, CON-07,
-- CON-08, FRD 17.1), GENERATED ALWAYS AS (...) STORED and GIN indexed. It
-- holds no fact the product displays and is recomputed by the database on
-- every write to its inputs; the search service reaches it only through
-- $queryRaw, never through Prisma's own client.
--
-- Prisma cannot express a generated column, so this migration is written by
-- hand (SLICE-04 build step 1) and schema.prisma carries each column as
-- Unsupported("tsvector").
--
-- Fields per table match SRCH-020's own list, split by SRCH-023 into what a
-- term search prefix-matches (identifiers and short titles, via ILIKE, not
-- indexed here) and what it full-text matches (prose, indexed here):
--   Instrument:       shortTitle, title, citation, authority
--   SourceProvision:  heading, verbatimText
--   SourceClause:     shortTitle, title, verbatimText
--   Obligation:       shortTitle, title, regulator, evidenceRequirement
--   Control:          shortTitle, title, description

ALTER TABLE "Instrument" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("shortTitle", '') || ' ' ||
      coalesce("title", '') || ' ' ||
      coalesce("citation", '') || ' ' ||
      coalesce("authority", '')
    )
  ) STORED;

CREATE INDEX "Instrument_searchVector_idx" ON "Instrument" USING GIN ("searchVector");

ALTER TABLE "SourceProvision" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("heading", '') || ' ' ||
      coalesce("verbatimText", '')
    )
  ) STORED;

CREATE INDEX "SourceProvision_searchVector_idx" ON "SourceProvision" USING GIN ("searchVector");

ALTER TABLE "SourceClause" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("shortTitle", '') || ' ' ||
      coalesce("title", '') || ' ' ||
      coalesce("verbatimText", '')
    )
  ) STORED;

CREATE INDEX "SourceClause_searchVector_idx" ON "SourceClause" USING GIN ("searchVector");

ALTER TABLE "Obligation" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("shortTitle", '') || ' ' ||
      coalesce("title", '') || ' ' ||
      coalesce("regulator", '') || ' ' ||
      coalesce("evidenceRequirement", '')
    )
  ) STORED;

CREATE INDEX "Obligation_searchVector_idx" ON "Obligation" USING GIN ("searchVector");

ALTER TABLE "Control" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("shortTitle", '') || ' ' ||
      coalesce("title", '') || ' ' ||
      coalesce("description", '')
    )
  ) STORED;

CREATE INDEX "Control_searchVector_idx" ON "Control" USING GIN ("searchVector");

-- SLICE-01C, SCR-088-070, AUTH-G1, D-047: a line-of-defence column on
-- ActionAuthority, empty for every action in this release.
ALTER TABLE "ActionAuthority"
ADD COLUMN "requiresLineOfDefence" "LineOfDefence";

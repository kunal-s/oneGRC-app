export {
  detectFlags,
  looksMandatory,
  LOW_CONFIDENCE_THRESHOLD,
  BLOCKING_FLAGS,
  isBlocking,
  type ClauseFlagKind,
  type DetectedFlag,
} from "./flags.js"

export {
  segment,
  joinPages,
  pageAt,
  type SegmentedClause,
  type PageText,
} from "./segment.js"

export {
  extractFeatures,
  headingClassOf,
  dutyBearerOf,
  type ProvisionFeatures,
  type HeadingClass,
} from "./features.js"

export {
  classifyProvision,
  bearerBindsUs,
  RULESET_VERSION,
  type Classification,
  type ProvisionClass,
  type BindsUs,
  type OrgCapabilities,
} from "./classify.js"

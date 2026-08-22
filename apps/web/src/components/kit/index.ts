// The shared pattern kit (docs/onegrc-ux-audit.md, Section 6). Reusable building
// blocks that keep per-screen redesign consistent and fast under the incremental
// approach. Import from '@/components/kit'.
export { StatGroup, type Stat, type StatTone } from './StatGroup'
export { Section } from './Section'
export { GroupedList, type ListGroup } from './GroupedList'
export { SavedViews, FilterChips, type SavedView, type ActiveChip } from './SavedViews'
export { RoleDashboard, DashboardCard } from './RoleDashboard'
export { NeedsMe } from './NeedsMe'
export { ReportMenu } from './ReportMenu'
export {
  REPORT_TEMPLATES,
  reportsForModule,
  reportsForPersona,
  useGenerateReport,
  type ReportTemplate,
  type ReportModule,
} from './reports'

import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/shell/Layout'
import { TourProvider } from '@/components/tour/TourProvider'
import { Home } from '@/pages/Home'
import { MyQueue } from '@/pages/MyQueue'
import { RiskRegister } from '@/pages/RiskRegister'
import { RiskDetail } from '@/pages/RiskDetail'
import { Campaigns } from '@/pages/Campaigns'
import { CampaignDetail } from '@/pages/CampaignDetail'
import { Vendors } from '@/pages/Vendors'
import { VendorDetail } from '@/pages/VendorDetail'
import { Fraud } from '@/pages/Fraud'
import { FraudDetail } from '@/pages/FraudDetail'
import { Whistleblower } from '@/pages/Whistleblower'
import { WhistleblowerDetail } from '@/pages/WhistleblowerDetail'
import { Incidents } from '@/pages/Incidents'
import { IncidentDetail } from '@/pages/IncidentDetail'
import { ControlLibrary } from '@/pages/ControlLibrary'
import { ControlDetail } from '@/pages/ControlDetail'
import { Ccm } from '@/pages/Ccm'
import { CcmDetail } from '@/pages/CcmDetail'
import { Policies } from '@/pages/Policies'
import { PolicyDetail } from '@/pages/PolicyDetail'
import { Obligations } from '@/pages/Obligations'
import { ObligationDetail } from '@/pages/ObligationDetail'
import { TaskDetail } from '@/pages/TaskDetail'
import { RegChange } from '@/pages/RegChange'
import { RegChangeDetail } from '@/pages/RegChangeDetail'
import { SourceLibrary } from '@/pages/live/SourceLibrary'
import { InstrumentDetail as LiveInstrumentDetail } from '@/pages/live/InstrumentDetail'
import { ClauseDetail as LiveClauseDetail } from '@/pages/live/ClauseDetail'
import { SourceSectionDetail } from '@/pages/SourceSectionDetail'
import { PfrdaPack } from '@/pages/PfrdaPack'
import { Dpdp } from '@/pages/Dpdp'
import { DsarDetail } from '@/pages/DsarDetail'
import { Audits } from '@/pages/Audits'
import { AuditDetail } from '@/pages/AuditDetail'
import { Issues } from '@/pages/Issues'
import { IssueDetail } from '@/pages/IssueDetail'
import { EvidenceVault } from '@/pages/EvidenceVault'
import { EvidenceDetail } from '@/pages/EvidenceDetail'
import { Integrations } from '@/pages/Integrations'
import { Settings } from '@/pages/Settings'
import { ComingSoon } from '@/pages/ComingSoon'

export default function App() {
  return (
    <TourProvider>
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/queue" element={<MyQueue />} />
        <Route path="/risks" element={<RiskRegister />} />
        <Route path="/risks/:id" element={<RiskDetail />} />
        <Route path="/controls" element={<ControlLibrary />} />
        <Route path="/controls/:id" element={<ControlDetail />} />
        <Route path="/ccm" element={<Ccm />} />
        <Route path="/ccm/:id" element={<CcmDetail />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/policies/:id" element={<PolicyDetail />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/fraud" element={<Fraud />} />
        <Route path="/fraud/:id" element={<FraudDetail />} />
        <Route path="/whistleblower" element={<Whistleblower />} />
        <Route path="/whistleblower/:id" element={<WhistleblowerDetail />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/obligations" element={<Obligations />} />
        <Route path="/obligations/:id" element={<ObligationDetail />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/reg-change" element={<RegChange />} />
        <Route path="/reg-change/:id" element={<RegChangeDetail />} />
        <Route path="/sources" element={<SourceLibrary />} />
        <Route path="/sources/clause/:id" element={<LiveClauseDetail />} />
        <Route path="/sources/section/:id" element={<SourceSectionDetail />} />
        <Route path="/sources/:id" element={<LiveInstrumentDetail />} />
        <Route path="/pfrda" element={<PfrdaPack />} />
        <Route path="/dpdp" element={<Dpdp />} />
        <Route path="/dpdp/dsar/:id" element={<DsarDetail />} />
        <Route path="/audits" element={<Audits />} />
        <Route path="/audits/:id" element={<AuditDetail />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/evidence" element={<EvidenceVault />} />
        <Route path="/evidence/:id" element={<EvidenceDetail />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<ComingSoon title="Not found" />} />
      </Route>
      </Routes>
    </TourProvider>
  )
}

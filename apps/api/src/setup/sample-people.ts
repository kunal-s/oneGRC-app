import type { Department, LineOfDefence } from '@prisma/client'

/**
 * Sample people — development and onboarding only (ADR-012).
 *
 * These are Person records, NOT accounts. Authentication federates to the
 * customer IdP (ADR-002), so a sample person carries no credential and nobody
 * can sign in as one. That is what makes shipping them safe where shipping
 * default accounts would not be.
 *
 * The roster is chosen to make the governance rules exercisable, not to look
 * populated. Specifically it guarantees:
 *   - two people in Compliance and Company Secretarial, so clause authority
 *     (department-gated) has both a holder and a non-holder to test against;
 *   - a maker and a distinct eligible checker for every approval path, without
 *     which separation of duties cannot be demonstrated at all;
 *   - one person in a department that owns nothing, so department scoping is
 *     visibly doing something.
 *
 * Emails use the RFC 2606 .invalid TLD, so none can ever route anywhere.
 */
export interface SamplePerson {
  key: string
  fullName: string
  jobTitle: string
  department: Department
  lineOfDefence: LineOfDefence
  roles: string[]
}

export const SAMPLE_PEOPLE: SamplePerson[] = [
  {
    key: 'compliance-head',
    fullName: 'Anjali Deshmukh',
    jobTitle: 'Head of Compliance',
    department: 'ComplianceAndSecretarial',
    lineOfDefence: 'Second',
    roles: ['COMPLIANCE_MGR'],
  },
  {
    key: 'company-secretary',
    fullName: 'Vikram Rao',
    jobTitle: 'Company Secretary',
    department: 'ComplianceAndSecretarial',
    lineOfDefence: 'Second',
    roles: ['COMPLIANCE_MGR'],
  },
  {
    key: 'tax-lead',
    fullName: 'Deepa Iyer',
    jobTitle: 'Finance and Tax Lead',
    department: 'FinanceAndTax',
    lineOfDefence: 'First',
    roles: ['COMPLIANCE_ANALYST'],
  },
  {
    key: 'tax-analyst',
    fullName: 'Rohit Kulkarni',
    jobTitle: 'Tax Analyst',
    department: 'FinanceAndTax',
    lineOfDefence: 'First',
    roles: ['COMPLIANCE_ANALYST'],
  },
  {
    key: 'cro',
    fullName: 'Meera Krishnan',
    jobTitle: 'Chief Risk Officer',
    department: 'Risk',
    lineOfDefence: 'Second',
    roles: ['EXEC', 'RISK_MGR'],
  },
  {
    key: 'ciso',
    fullName: 'Rajesh Iyer',
    jobTitle: 'Chief Information Security Officer',
    department: 'ITAndInformationSecurity',
    lineOfDefence: 'Second',
    roles: ['CONTROL_OWNER'],
  },
  {
    key: 'auditor',
    fullName: 'Sunita Menon',
    jobTitle: 'Head of Internal Audit',
    department: 'InternalAudit',
    lineOfDefence: 'Third',
    roles: ['AUDITOR'],
  },
  {
    key: 'admin',
    fullName: 'Imran Sheikh',
    jobTitle: 'Platform Administrator',
    department: 'Risk',
    lineOfDefence: 'Second',
    roles: ['ADMIN'],
  },
]

export const sampleEmail = (key: string) => `${key}@sample.invalid`

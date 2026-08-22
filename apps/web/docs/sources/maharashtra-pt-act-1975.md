# Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975

**Source-of-record reference** for the OneGRC seed instrument `INST-PT-MAH-1975`.
Captured June 2026 for the SPF demo. Figures verified against the official Maharashtra
GST department and the bare Act; secondary corroboration where the official PDFs were
not machine-readable (noted inline).

## Official sources

- India Code (bare Act): https://www.indiacode.nic.in/handle/123456789/21066
- PRS India (Act PDF, Mah. XVI of 1975): https://prsindia.org/files/bills_acts/acts_states/maharashtra/1975/1975Maharashtra16.pdf
- Maharashtra GST Dept — PT rate schedules: https://mahagst.gov.in/en/rate-schedules-under-professions-tax-act-1975-1
- Law & Judiciary Dept, Maharashtra: https://lj.maharashtra.gov.in/en/document/the-maharashtra-state-tax-on-professions-trades-callings-and-employments-act-1975/

Commenced **1 April 1975** (Mah. Act XVI of 1975). Annual tax capped at **₹2,500 per person**.

## Section map (employer-facing clauses seeded)

| Section | Heading | What it requires (employer view) | Seeded clause |
|---|---|---|---|
| **3** | Levy and charge of tax | Tax levied on professions/trades/callings/employments per Schedule I; max ₹2,500 p.a. per person | `SRC-PT-3` |
| **4** | Employer's liability to deduct and pay tax | Employer must deduct PT from salaries/wages and pay it to the State on employees' behalf (PTRC holder) | `SRC-PT-4` |
| **5** | Registration and enrolment | Employer liable u/s 4 obtains a **Certificate of Registration (PTRC)**; person liable u/s 3(2) obtains a **Certificate of Enrolment (PTEC)**; apply within **30 days** | `SRC-PT-5` |
| **6** | Returns | Registered employer furnishes the PT return in the prescribed form/period; **annual** (due 31 Mar) if PT liability < ₹1,00,000, **monthly** if ≥ ₹1,00,000; late-return fee ₹200 (≤30 days) / ₹1,000 (beyond) | `SRC-PT-6` |
| **7** | Assessment | Prescribed authority assesses the employer/person; best-judgment assessment on default | `SRC-PT-7` |
| **8** | Payment of tax | Tax deducted is deposited with the department; s.8(3) lump-sum/composition option for enrolled persons | `SRC-PT-8` |
| **9** | Interest on failure to pay | Simple interest **1.25% per month** on tax that remains unpaid | `SRC-PT-9` |
| **10** | Penalty for non-payment | Penalty up to **10% of the tax due** (after opportunity to be heard) | `SRC-PT-10` |
| **Schedule I** | Rate schedule | Salary-slab rates for employees (Entry 1) | `SRC-PT-SCH1` |

Administrative/procedural sections (appeals, recovery, authorities, offences — s.11–s.30)
are not seeded individually; the firm-facing compliance clauses above are the demo scope,
consistent with the source-registry convention of ~8–12 material clauses per act.

## Schedule I — salaried-employee rates (Entry 1, current)

| Monthly salary | PT per month | February |
|---|---|---|
| ≤ ₹7,500 | NIL | NIL |
| ₹7,501 – ₹10,000 | ₹175 | ₹175 |
| > ₹10,000 | ₹200 | ₹300 |

- **Women** earning up to **₹25,000/month** are exempt (w.e.f. 1 April 2023).
- Annual liability capped at **₹2,500** per person (the extra ₹100 in February reaches the cap).

## Employer compliance summary (SPF as employer)

- Hold **PTRC** (registration, s.5); enrol the entity for **PTEC** where applicable.
- **Deduct** PT monthly from salaries (s.4) and **deposit** with the department (s.8); employers commonly deposit by the statutory monthly date.
- **File the return** (s.6) — annual (< ₹1,00,000 liability, by 31 Mar) or monthly (≥ ₹1,00,000).
- Late deposit attracts **interest 1.25%/month** (s.9) and **penalty up to 10%** (s.10).

This drives the seeded obligation `OBL-LAB-JUN26-02` (Professional tax remittance, owner Farhan)
and the source→clause→control→evidence→audit chain for the labour/tax tower.

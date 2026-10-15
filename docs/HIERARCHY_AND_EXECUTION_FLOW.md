# Hyperion Hierarchical Risk Topology & API Execution Flow Architecture

## 1. Executive Summary

This release enhances the Hyperion API Security Platform by introducing:
1. **Hierarchical Risk Topology (`/api/risk-hierarchy`)**: Transforms isolated route-level risk scores into a multi-tiered security posture graph: Platform Posture $\rightarrow$ Service Domains $\rightarrow$ Endpoints $\rightarrow$ Threat Findings $\rightarrow$ Traffic Evidence.
2. **Visual 7-Stage Execution & Detection Flow (`/api/execution-flow`)**: Provides an interactive, connected pipeline figure visualizing the chronological journey of an API request through edge ingestion, endpoint resolution, database persistence, security engine behavioral analysis, threat alert creation, risk score updating, and forensic evidence linking.
3. **Command Center Refinements**:
   - Added a dedicated **Execution Flow** workspace tab (`☊`) with real-time signal selector, interactive step highlighting, and deep stage attribute inspection.
   - Enhanced **Risk Intelligence** with a dynamic view-mode switcher: **Hierarchical Topology** (collapsible service domain cards, platform posture metrics, primary risk drivers, nested endpoint trees with alert and traffic evidence chips) vs **Endpoint Breakdown** (granular route exposure cards).
   - Added an overview pipeline teaser card bridging high-level telemetry with visual execution lineage.

---

## 2. Hierarchical Risk Topology

### 2.1 Domain Classification Architecture
The backend maps observed and cataloged API endpoints into enterprise domain clusters:
- **Identity & User Service (`identity`)**: Authentication, user profiles, balance checks, credential management.
- **Payments & Settlement Gateway (`payments`)**: Transactions, payouts, payment transfers, ledger entries.
- **Administrative & Governance Service (`admin`)**: Internal governance, privilege escalation points, administrative exports, debug interfaces.
- **Infrastructure & System Runtime (`system`)**: Root endpoints, health probes, discovery schemas, runtime telemetry.
- **Core Business API Fabric (`core`)**: Unclassified or domain-adjacent microservice routes.

### 2.2 Risk Aggregation & Scoring Formulation
- **Domain Risk Score**: Computed using a weighted combination of peak endpoint severity ($60\%$) and domain average risk ($40\%$):
  $$\text{DomainRisk} = \min\left(100, \max\left(0, \operatorname{round}(0.6 \cdot \max(S) + 0.4 \cdot \operatorname{avg}(S))\right)\right)$$
- **Platform Enterprise Risk Score**: Aggregates all monitored domain risks:
  $$\text{PlatformRisk} = \min\left(100, \max\left(0, \operatorname{round}(0.5 \cdot \max(D) + 0.5 \cdot \operatorname{avg}(D))\right)\right)$$
- **Primary Risk Drivers**: Automatically synthesized from uncataloged shadow routes, active behavioral findings (BOLA, Scraping, Token Misuse), PII exposure, and unauthenticated public surfaces.

---

## 3. Visual 7-Stage API Execution & Detection Flow

The pipeline provides complete lineage tracing across seven distinct stages:

```
[01 Ingress] ➔ [02 Resolution] ➔ [03 Storage] ➔ [04 Detection] ➔ [05 Alert] ➔ [06 Risk Update] ➔ [07 Evidence]
```

1. **Stage 01: Incoming Edge Request (`ingress`)**
   - Intercepts caller IP, HTTP method, target URI, authorization headers, and request payload bytes.
2. **Stage 02: API Endpoint Resolution (`endpoint_resolution`)**
   - Correlates incoming request with the inventory catalog; classifies route as `managed` (OpenAPI) or `shadow` (unannounced route).
3. **Stage 03: Traffic Log Persistence (`traffic_storage`)**
   - Commits an immutable telemetry log record (`api_traffic_logs`) with verified metadata into the SQLite data fabric.
4. **Stage 04: Security Engine Evaluation (`security_detection`)**
   - Evaluates passive behavioral rules (BOLA cross-user resource access, token reuse across disparate IPs, volume-based scraping anomalies).
5. **Stage 05: Alert Creation (`alert_emission`)**
   - Flags security anomalies, binds severity level (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), logs remediation instructions, and assigns alert ID.
6. **Stage 06: Risk Intelligence Update (`risk_update`)**
   - Re-evaluates risk score contributions for the target route and ripples the impact upward into the service domain and platform posture.
7. **Stage 07: Forensic Evidence Trace (`forensic_evidence`)**
   - Establishes bi-directional forensic links between alerts and originating traffic records, providing a seamless jump to deep inspection.

---

## 4. Frontend Integration & User Experience

- **Navigation**: Command Center sidebar and mobile dropdown now feature 7 distinct operational destinations:
  - `Overview` (`◈`)
  - `API inventory` (`⊞`)
  - `Traffic activity` (`≋`)
  - `Threat findings` (`⌁`)
  - `Risk intelligence` (`◉`)
  - `Execution flow` (`☊`)
  - `Investigation` (`⌕`)
- **Interactive Deep Stage Inspection**: Clicking any step in the pipeline track updates the deep inspector card below with structured metadata (headers, detection rule summaries, database indices, timestamps).
- **One-Click Forensics Navigation**: Deep inspector cards provide direct links:
  - *Open finding in Investigation ↗*
  - *Inspect event in Traffic ↗*
  - *Inspect endpoint in inventory ↗*

---

## 5. Verification & Test Suite

| Test Suite | Components Tested | Result | Duration |
| :--- | :--- | :--- | :--- |
| **Backend Integration & Unit (`pytest`)** | 23 tests: Security engines, BOLA detection, token misuse, scraping, risk hierarchy endpoint, execution flow lineage endpoint | **23 passed, 0 failed** | 2.51s |
| **Python Compilation (`compileall`)** | All modules in `backend/`, `database/`, `scripts/`, `tests/` | **Syntax clean** | 3.5s |
| **Frontend Unit & Contract (`node --test`)** | 18 tests: 7-tab routing, polling deduplication, filter matrix, WebGL animation fallback, traffic bucketing, audit tests | **18 passed, 0 failed** | 0.33s |
| **TypeScript Typecheck (`tsc --noEmit`)** | Full codebase typecheck against `frontend/src/types.ts` | **0 errors** | 5.8s |
| **Production Build (`vite build`)** | Bundle production assets and minified CSS/JS | **Built in 3.26s** | 3.26s |

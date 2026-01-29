# Endpoint Audit (Non-Google)

Date: 2026-01-23
Scope: backend/api_specs/*.yml (excluding admob.yml, admanager.yml)

Summary:
- Existing endpoints (unique): 56
- Newly found endpoints (candidate): 14
- Networks with new endpoints: AppLovin, DT Exchange, InMobi, Liftoff (Vungle), Pangle, Unity/ironSource
- Networks with no additional endpoints found in recheck: Mintegral

## New endpoints + basic reachability test (no auth)

### AppLovin
- GET https://r.applovin.com/maxCohort (status=403, 380ms)  
  Source: https://support.axon.ai/en/max/reporting-apis/cohort-api/
- GET https://r.applovin.com/maxCohort/imp (status=403, 179ms)  
  Source: https://support.axon.ai/en/max/reporting-apis/cohort-api/
- GET https://r.applovin.com/maxCohort/session (status=403, 159ms)  
  Source: https://support.axon.ai/en/max/reporting-apis/cohort-api/
- GET https://r.applovin.com/max/userAdRevenueReport (status=403, 172ms)  
  Source: https://support.axon.ai/en/max/reporting-apis/user-level-ad-revenue-api/

### DT Exchange
- POST https://console.fyber.com/api/v2/management/auth (status=400, 375ms)  
  Source: https://developer.digitalturbine.com/hc/en-us/articles/4412488728721-DT-Exchange-Management-API

### InMobi
- GET https://api.inmobi.com/v1.0/generatesession/generate (status=400, 390ms)  
  Source: https://support.inmobi.com/monetize/inmobi-apis/reporting-api
- POST https://api.inmobi.com/v3.0/reporting/publisher (status=400, 353ms)  
  Source: https://support.inmobi.com/monetize/inmobi-apis/reporting-api

### Liftoff (Vungle)
- POST https://auth-api.vungle.com/auth (status=400, 361ms)  
  Source: https://support.vungle.com/hc/en-us/articles/360041251552-Publisher-Management-API-1-3

### Pangle
- GET https://open-api.pangleglobal.com/union/media/open/api/report/user (status=200, 622ms)  
  Source: https://www.pangleglobal.com/integration/reporting-api-v1
- GET https://open-api.pangleglobal.com/union/media/open/api/report/app (status=200, 586ms)  
  Source: https://www.pangleglobal.com/integration/reporting-api-v1
- GET https://open-api.pangleglobal.com/union/media/open/api/report/slot (status=200, 223ms)  
  Source: https://www.pangleglobal.com/integration/reporting-api-v1

### Unity/ironSource
- GET https://platform.ironsrc.com/partners/publisher/auth (status=400, 352ms)  
  Source: https://developers.is.com/ironsource-mobile/authentication/
- GET https://platform.ironsrc.com/partners/publisher/mediation/management/v2 (status=401, 135ms)  
  Source: https://developers.is.com/ironsource-mobile/air/mediation-management-v2/
- GET https://platform.ironsrc.com/levelPlay/reporting/v1 (status=401, 313ms)  
  Source: https://developers.is.com/ironsource-mobile/air/reporting/

## Notes
- Tests used no credentials; 401/403/405 are expected for protected endpoints.
- Pangle Reporting API v1 endpoints respond on GET; POST returned 404 in initial check.
- Vungle doc shows https://auth-api.vungle.com/v2/auth, but live endpoint responding is https://auth-api.vungle.com/auth (v2 returns 404 without auth).
- Vungle provides an OpenAPI attachment (vungle_publisher_api_v1.2.yaml) in the Publisher Management API article; it does not list the auth endpoint.
- ironSource docs show /levelPlay/reporting/v1; YAML previously only had /levelPlay/reporting/v1/monetization.
- InMobi docs point to api.inmobi.com/v3.0 for reporting and v1.0 for session generation; YAML previously only used publisher.inmobi.com.
import asyncio
import httpx
import yaml
import json
from pathlib import Path
import re
import sys

# Configuration
BASE_DIR = Path(__file__).parent.parent
SPECS_DIR = BASE_DIR / "api_specs"

async def probe(client, name, method, url):
    try:
        url = re.sub(r"([^:])//+", r"\1/", url)
        if "googleapis.com" in url and "googleapis.com/" not in url:
            url = url.replace("googleapis.com", "googleapis.com/")
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*"
        }
        
        m = method.upper()
        if m in ["POST", "PUT", "PATCH"]:
            res = await client.request(m, url, headers={**headers, "Content-Length": "0"}, timeout=15.0)
        else:
            res = await client.request(m, url, headers=headers, timeout=15.0)
            
        is_live = (res.status_code != 404)
        return f"{name} [{method}]", url, res.status_code, is_live
    except Exception as e:
        return f"{name} [{method}]", url, "ERR", False

def get_google_endpoints(filename, name):
    path = BASE_DIR / filename
    if not path.exists(): return []
    with open(path, 'r') as f:
        discovery = json.load(f)
    
    root_url = discovery.get("rootUrl").rstrip("/")
    service_path = discovery.get("servicePath", "").strip("/")
    base_url = f"{root_url}/{service_path}".rstrip("/") + "/"
    
    targets = []
    
    def walk(obj):
        if not isinstance(obj, dict): return
        
        # Check for methods in current resource level
        if "methods" in obj:
            for m in obj["methods"].values():
                p = m.get("flatPath") or m.get("path")
                method = m.get("httpMethod", "GET")
                if p:
                    cp = p.replace("{accountsId}", "pub-123").replace("{networksId}", "123")
                    cp = cp.replace("{+name}", "networks/123").replace("{name}", "networks/123")
                    cp = cp.replace("{+parent}", "networks/123").replace("{parent}", "networks/123")
                    if "admob" in name.lower():
                        cp = cp.replace("networks/123", "accounts/pub-123")
                    
                    cp = re.sub(r"\{{.*?\}}", "123", cp)
                    cp = cp.replace("/:", ":")
                    targets.append((name, method, base_url + cp.lstrip("/")))
        
        # Deeply walk resources
        if "resources" in obj:
            for r in obj["resources"].values():
                walk(r)

    walk(discovery)
    return targets

def get_yaml_endpoints(filename):
    path = SPECS_DIR / filename
    if not path.exists(): return []
    with open(path, 'r') as f:
        spec = yaml.safe_load(f)
    
    endpoints = []
    for p, methods in spec.get("paths", {}).items():
        if not p.startswith("/"): continue
        for method_verb in methods.keys():
            if method_verb.lower() not in ["get", "post", "put", "patch", "delete"]: continue
            
            target_base = spec["servers"][0]["url"].rstrip("/")
            if filename == "applovin.yml" and ("maxReport" in p or "report" in p):
                target_base = "https://r.applovin.com"
            if filename == "mintegral.yml":
                target_base = "https://api.mintegral.com"
                
            cp = p
            if filename == "pangle.yml" and not p.startswith("/union"):
                if "/rt/" in p or "/report/" in p: cp = "/union_pangle/open/api" + p.replace("/report", "/rt")
                else: cp = "/union/media/open_api" + p
                
            url = target_base.rstrip("/") + "/" + re.sub(r"\{{.*?\}}", "123", cp).lstrip("/")
            endpoints.append((filename.replace(".yml", ""), method_verb.upper(), url))
    return endpoints

async def run():
    targets = []
    targets.extend(get_google_endpoints("admob_v1beta_discovery.json", "AdMob"))
    targets.extend(get_google_endpoints("admanager_v1_discovery.json", "AdManager"))
    for f in ["unity.yml", "applovin.yml", "dtexchange.yml", "pangle.yml", "liftoff.yml", "inmobi.yml", "mintegral.yml"]:
        targets.extend(get_yaml_endpoints(f))
        
    print(f"Starting Ultimate Verification of {len(targets)} Tool-Endpoint pairs...")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        sem = asyncio.Semaphore(100)
        async def safe_probe(t): return await probe(client, *t)
        results = await asyncio.gather(*(safe_probe(t) for t in targets))

    dead = [r for r in results if not r[3]]
    print("\n" + "="*80)
    print(f"FULL MCP SUITE VERIFICATION REPORT")
    print(f"TOTAL TOOLS: {len(results)}")
    print(f"LIVE:        {len(results) - len(dead)}")
    print(f"DEAD (404):  {len(dead)}")
    print("="*80)
    
    if dead:
        print("\nFAIL: The following tool paths returned 404:")
        for n, u, c, _ in sorted(dead): print(f"  - [{c}] {n} ({u})")
        sys.exit(1)
    else:
        print(f"\n✨ SUCCESS: All {len(results)} tool endpoints verified live.")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(run())
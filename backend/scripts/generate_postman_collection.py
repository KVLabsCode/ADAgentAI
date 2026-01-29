import json
import yaml
from pathlib import Path
import re

# Config
BASE_DIR = Path(__file__).parent.parent
SPECS_DIR = BASE_DIR / "api_specs"
OUTPUT_FILE = BASE_DIR / "ADAgentAI_Postman_Collection.json"

def clean_url(url):
    # Remove double slashes except protocol
    return re.sub(r"([^:])//+", r"\1/", url)

def schema_to_example(schema, schemas_dict, depth=0):
    """Convert a JSON schema to an example value."""
    if depth > 5:  # Prevent infinite recursion
        return {}

    if "$ref" in schema:
        ref_name = schema["$ref"]
        if ref_name in schemas_dict:
            return schema_to_example(schemas_dict[ref_name], schemas_dict, depth + 1)
        return {}

    schema_type = schema.get("type", "object")

    if schema_type == "string":
        if "enum" in schema:
            return schema["enum"][0]
        if "format" in schema:
            if schema["format"] == "date":
                return "2026-01-01"
            if schema["format"] == "int64":
                return "123456789"
        return "string_value"

    elif schema_type == "integer":
        return 0

    elif schema_type == "number":
        return 0.0

    elif schema_type == "boolean":
        return True

    elif schema_type == "array":
        items = schema.get("items", {})
        return [schema_to_example(items, schemas_dict, depth + 1)]

    elif schema_type == "object":
        result = {}
        properties = schema.get("properties", {})
        for prop_name, prop_schema in properties.items():
            result[prop_name] = schema_to_example(prop_schema, schemas_dict, depth + 1)
        return result

    return {}

def get_google_items(filename, provider_name):
    path = BASE_DIR / filename
    if not path.exists(): return []
    with open(path, 'r') as f:
        discovery = json.load(f)

    root_url = discovery.get("rootUrl").rstrip("/")
    service_path = discovery.get("servicePath", "").strip("/")
    base_url = f"{root_url}/{service_path}".rstrip("/") + "/"
    schemas = discovery.get("schemas", {})

    items = []

    def walk(obj, parent_name=""):
        if not isinstance(obj, dict): return

        if "methods" in obj:
            for m_id, m in obj["methods"].items():
                p = m.get("flatPath") or m.get("path")
                method = m.get("httpMethod", "GET")
                if p:
                    # Replace variables with Postman Env vars
                    cp = p.replace("{accountsId}", "{{ADMOB_ACCOUNT_ID}}")
                    cp = cp.replace("{networksId}", "{{AD_MANAGER_NETWORK_CODE}}")
                    cp = cp.replace("{+name}", "networks/{{AD_MANAGER_NETWORK_CODE}}")
                    cp = cp.replace("{name}", "networks/{{AD_MANAGER_NETWORK_CODE}}")
                    cp = cp.replace("{+parent}", "accounts/{{ADMOB_ACCOUNT_ID}}")
                    cp = cp.replace("{parent}", "accounts/{{ADMOB_ACCOUNT_ID}}")

                    # Replace any other {var} with 123
                    cp = re.sub(r"\{.*?\}", "123", cp)
                    cp = cp.replace("/:", ":")

                    raw_url = clean_url(base_url + cp.lstrip("/"))

                    request_obj = {
                        "method": method,
                        "header": [
                            {"key": "Authorization", "value": "Bearer {{GOOGLE_ACCESS_TOKEN}}", "type": "text"},
                            {"key": "Content-Type", "value": "application/json", "type": "text"}
                        ],
                        "url": {
                            "raw": raw_url,
                            "protocol": "https",
                            "host": raw_url.split("//")[1].split("/")[0].split("."),
                            "path": raw_url.split("//")[1].split("/")[1:]
                        },
                        "description": m.get("description", "")
                    }

                    # Add request body for POST/PUT/PATCH methods
                    if method in ["POST", "PUT", "PATCH"] and "request" in m:
                        ref_name = m["request"].get("$ref")
                        if ref_name and ref_name in schemas:
                            example_body = schema_to_example(schemas[ref_name], schemas)
                            request_obj["body"] = {
                                "mode": "raw",
                                "raw": json.dumps(example_body, indent=2),
                                "options": {
                                    "raw": {
                                        "language": "json"
                                    }
                                }
                            }

                    items.append({
                        "name": f"{m_id}",
                        "request": request_obj
                    })

        if "resources" in obj:
            for r_name, r in obj["resources"].items():
                walk(r, f"{parent_name}.{r_name}" if parent_name else r_name)

    walk(discovery)
    return items

# Complete request body schemas from official API documentation
PLACEHOLDER_BODIES = {
    # Unity/ironSource LevelPlay - Groups API v4, Instances API v4, Ad Units API v1
    "unity.yml": {
        "create_application": {
            "appName": "My App",
            "platform": "Android",
            "bundleId": "com.example.app",
            "coppa": False,
            "adSettings": {
                "bannerEnabled": True,
                "interstitialEnabled": True,
                "rewardedEnabled": True
            }
        },
        "create_group_v4": {
            "groupName": "Mediation Group",
            "adFormat": "rewarded",
            "mediationAdUnitId": "string_value",
            "position": 1,
            "abTest": "A",
            "floorPrice": 0.5,
            "countries": ["US", "GB", "CA"],
            "segments": ["segment_1"],
            "instances": [
                {
                    "id": 123456,
                    "groupRate": 2.5,
                    "countriesRate": [
                        {"countryCode": "US", "rate": 3.0},
                        {"countryCode": "GB", "rate": 2.0}
                    ]
                }
            ]
        },
        "update_group_v4": {
            "groupId": 123456,
            "groupName": "Updated Group",
            "position": 2,
            "floorPrice": 0.75,
            "countries": ["US", "GB"],
            "segments": ["segment_1"],
            "instances": [
                {
                    "id": 123456,
                    "groupRate": 3.0,
                    "countriesRate": [
                        {"countryCode": "US", "rate": 3.5}
                    ]
                }
            ]
        },
        "list_groups_v4": None,
        "delete_group_v4": None,
        "create_instance_v4": {
            "instanceName": "AdMob Instance",
            "networkName": "AdMob",
            "adFormat": "rewarded",
            "isBidder": True,
            "appConfig1": "ca-app-pub-xxx",
            "appConfig2": "string_value",
            "instanceConfig1": "ca-app-pub-xxx/123",
            "instanceConfig2": "string_value",
            "groups": [123, 456],
            "isLive": True,
            "rate": 2.5
        },
        "update_instance_v4": {
            "instanceId": 123456,
            "instanceName": "Updated Instance",
            "appConfig1": "ca-app-pub-xxx",
            "instanceConfig1": "ca-app-pub-xxx/123",
            "groups": [123, 456, 789],
            "isLive": True,
            "rate": 3.0
        },
        "list_instances_v4": None,
        "delete_instance_v4": None,
        "create_ad_unit_v1": {
            "adUnitName": "Rewarded Video",
            "adFormat": "rewarded",
            "status": "active",
            "placementSettings": {
                "cappingEnabled": True,
                "cappingValue": 5,
                "cappingInterval": "day",
                "pacingEnabled": True,
                "pacingValue": 60
            }
        },
        "update_ad_unit_v1": {
            "adUnitId": 123456,
            "adUnitName": "Updated Rewarded Video",
            "status": "active",
            "placementSettings": {
                "cappingEnabled": True,
                "cappingValue": 10,
                "cappingInterval": "day"
            }
        },
        "list_ad_units_v1": None,
        "create_mediation_group_v2": {
            "groupName": "Mediation Group v2",
            "adUnit": "rewarded_video",
            "groupPosition": 1,
            "adSourcePriority": "manual",
            "tiers": [
                {
                    "tierType": "manual",
                    "instances": [
                        {"instanceId": 123, "rate": 2.5}
                    ]
                }
            ]
        },
        "update_mediation_group_v2": {
            "groupId": 123456,
            "groupName": "Updated Mediation v2",
            "groupPosition": 2
        },
        "create_placement": {
            "placementName": "Main Rewarded",
            "adUnit": "rewarded_video",
            "capping": {"enabled": True, "value": 5, "interval": "day"},
            "pacing": {"enabled": True, "value": 60}
        },
        "update_placement": {
            "placementId": 123456,
            "placementName": "Updated Placement",
            "capping": {"enabled": True, "value": 10}
        }
    },

    # AppLovin MAX - Ad Unit Management API
    "applovin.yml": {
        "default_post": {
            "name": "Banner Ad Unit",
            "platform": "android",
            "package_name": "com.example.app",
            "ad_format": "BANNER",
            "disabled": False,
            "ad_network_settings": {
                "ADMOB_NETWORK": {
                    "disabled": False,
                    "ad_network_app_id": "ca-app-pub-xxx",
                    "ad_network_ad_units": [
                        {
                            "ad_network_ad_unit_id": "ca-app-pub-xxx/123",
                            "disabled": False,
                            "cpm": "2.50",
                            "countries": {
                                "type": "INCLUDE",
                                "values": ["US", "GB", "CA"]
                            }
                        }
                    ]
                }
            },
            "frequency_capping_settings": [
                {
                    "type": "time",
                    "time_capping_settings": {
                        "day_limit": 10,
                        "minute_frequency": 60
                    },
                    "countries": {
                        "type": "INCLUDE",
                        "values": ["US"]
                    }
                }
            ],
            "bid_floors": [
                {
                    "country_group_name": "Tier 1",
                    "cpm": "1.50",
                    "countries": {
                        "type": "INCLUDE",
                        "values": ["US", "GB"]
                    }
                }
            ],
            "banner_refresh_settings": {
                "interval": 30
            }
        },
        "create_ad_unit": {
            "name": "Interstitial Ad",
            "platform": "ios",
            "package_name": "com.example.app",
            "ad_format": "INTER"
        },
        "create_experiment": {
            "experiment_name": "A/B Test CPM",
            "test_group_allocation": 50,
            "ad_network_settings": {
                "ADMOB_NETWORK": {
                    "ad_network_ad_units": [
                        {
                            "ad_network_ad_unit_id": "ca-app-pub-xxx/456",
                            "cpm": "3.00"
                        }
                    ]
                }
            }
        },
        "create_test_device": {
            "name": "Test iPhone",
            "device_id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
            "disabled": False,
            "network": "APPLOVIN_NETWORK"
        }
    },

    # DT Exchange (Digital Turbine) - Management API
    "dtexchange.yml": {
        "default_post": {
            "name": "Interstitial Placement",
            "appId": 12345,
            "placementType": "Interstitial",
            "coppa": False,
            "ssrConfig": {
                "currency": "dollars",
                "amount": 100,
                "enabled": True
            },
            "targetingEnabled": True,
            "geo": {
                "countries": ["US", "GB", "CA"],
                "include": True
            },
            "connectivity": ["WIFI", "CELLULAR"],
            "floorPrices": [
                {"price": 2.50, "country": "US"},
                {"price": 1.50, "country": "GB"},
                {"price": 1.00, "country": "CA"}
            ],
            "capping": {
                "value": 5,
                "unit": "hour",
                "enabled": True
            },
            "pacing": {
                "value": 30,
                "unit": "second",
                "enabled": True
            }
        },
        "create_placement": {
            "name": "Rewarded Video",
            "appId": 12345,
            "placementType": "Rewarded",
            "coppa": False,
            "ssrConfig": {
                "currency": "coins",
                "amount": 50,
                "enabled": True
            },
            "targetingEnabled": True,
            "geo": {
                "countries": ["US"],
                "include": True
            },
            "floorPrices": [
                {"price": 5.00, "country": "US"}
            ],
            "capping": {
                "value": 3,
                "unit": "day",
                "enabled": True
            }
        },
        "update_placement": {
            "placementId": 67890,
            "name": "Updated Rewarded",
            "status": "active",
            "floorPrices": [
                {"price": 6.00, "country": "US"}
            ],
            "capping": {
                "value": 5,
                "unit": "day",
                "enabled": True
            }
        }
    },

    # Pangle (TikTok for Business) - Ad Group API
    "pangle.yml": {
        "default_post": {
            "adgroup_name": "Pangle Campaign Group",
            "advertiser_id": "123456789",
            "billing_event": "CPC",
            "budget": 1000.00,
            "budget_mode": "BUDGET_MODE_DAY",
            "campaign_id": "987654321",
            "optimization_goal": "CONVERT",
            "pacing": "PACING_MODE_SMOOTH",
            "schedule_start_time": "2026-01-25 00:00:00",
            "schedule_type": "SCHEDULE_START_END",
            "schedule_end_time": "2026-02-25 23:59:59",
            "placement_type": "PLACEMENT_TYPE_NORMAL",
            "placements": ["PLACEMENT_PANGLE"],
            "bid_price": 2.50,
            "bid_type": "BID_TYPE_CUSTOM",
            "age_groups": ["AGE_18_24", "AGE_25_34"],
            "gender": "GENDER_UNLIMITED",
            "location_ids": ["6252001"],
            "operating_systems": ["ANDROID", "IOS"],
            "blocked_pangle_app_ids": [],
            "included_pangle_audience_package_ids": [],
            "excluded_pangle_audience_package_ids": [],
            "frequency": 3,
            "deep_cpa_bid": 5.00,
            "conversion_bid_price": 10.00
        },
        "create_adgroup": {
            "adgroup_name": "Rewarded Video Campaign",
            "advertiser_id": "123456789",
            "campaign_id": "987654321",
            "placements": ["PLACEMENT_PANGLE"],
            "budget": 500.00,
            "budget_mode": "BUDGET_MODE_DAY",
            "schedule_type": "SCHEDULE_FROM_NOW",
            "billing_event": "OCPM",
            "optimization_goal": "INSTALL",
            "bid_type": "BID_TYPE_CUSTOM",
            "bid_price": 3.00,
            "pacing": "PACING_MODE_FAST"
        },
        "update_adgroup": {
            "adgroup_id": "111222333",
            "advertiser_id": "123456789",
            "budget": 750.00,
            "bid_price": 3.50
        },
        "update_pangle_block_list": {
            "advertiser_id": "123456789",
            "pangle_block_app_list_id": "block_list_1",
            "app_ids": ["com.blocked.app1", "com.blocked.app2"]
        }
    },

    # Liftoff/Vungle - Publisher Management API
    "liftoff.yml": {
        "default_post": {
            "name": "Rewarded Placement",
            "vungleAppId": "app123456",
            "placementType": "rewarded",
            "isHeaderBidding": False,
            "isFlatCpm": True,
            "flatCpmValue": 5.00,
            "adRefreshDuration": 0,
            "isActive": True,
            "targeting": {
                "countries": ["US", "GB", "CA"],
                "includeCountries": True
            }
        },
        "create_placement": {
            "name": "Interstitial Ad",
            "vungleAppId": "app123456",
            "placementType": "interstitial",
            "isHeaderBidding": True,
            "isActive": True
        },
        "update_placement": {
            "placementId": "placement789",
            "name": "Updated Placement",
            "isActive": True,
            "flatCpmValue": 6.00
        },
        "create_app": {
            "name": "My Mobile Game",
            "platform": "android",
            "storeId": "com.example.game",
            "isLive": True,
            "coppa": False
        }
    },

    # InMobi - Server-to-Server API
    "inmobi.yml": {
        "default_post": {
            "imp": [
                {
                    "id": "1",
                    "banner": {
                        "w": 320,
                        "h": 50,
                        "pos": 1,
                        "btype": [1],
                        "api": [3, 5]
                    },
                    "displaymanager": "inmobi_sdk",
                    "displaymanagerver": "10.0.0",
                    "instl": 0,
                    "tagid": "placement_id_here",
                    "bidfloor": 0.5,
                    "bidfloorcur": "USD"
                }
            ],
            "app": {
                "id": "app_id_here",
                "name": "My App",
                "bundle": "com.example.app",
                "storeurl": "https://play.google.com/store/apps/details?id=com.example.app",
                "cat": ["IAB1"],
                "ver": "1.0.0",
                "publisher": {
                    "id": "publisher_id_here",
                    "name": "Publisher Name"
                }
            },
            "device": {
                "ua": "Mozilla/5.0 (Linux; Android 10; SM-G975F)",
                "ip": "192.168.1.1",
                "geo": {
                    "country": "USA",
                    "region": "CA",
                    "city": "San Francisco",
                    "lat": 37.7749,
                    "lon": -122.4194
                },
                "make": "Samsung",
                "model": "Galaxy S10",
                "os": "android",
                "osv": "10",
                "connectiontype": 2,
                "ifa": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            },
            "user": {
                "id": "user_id_here",
                "gender": "M",
                "yob": 1990
            },
            "at": 2,
            "tmax": 500
        },
        "native_request": {
            "imp": [
                {
                    "id": "1",
                    "native": {
                        "request": {
                            "ver": "1.2",
                            "assets": [
                                {"id": 1, "required": 1, "title": {"len": 50}},
                                {"id": 2, "required": 1, "img": {"type": 3, "w": 300, "h": 250}},
                                {"id": 3, "required": 0, "data": {"type": 2, "len": 100}}
                            ]
                        }
                    },
                    "tagid": "native_placement_id"
                }
            ]
        }
    },

    # Mintegral - Publisher API v2
    "mintegral.yml": {
        "default_post": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "placement_name": "Rewarded Video",
            "ad_type": "rewarded_video",
            "integrate_type": "sdk",
            "content_type": "video",
            "video_orientation": "both",
            "show_close_button": 1,
            "unit_names": "rv_unit_1,rv_unit_2"
        },
        "create_app": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_name": "My Mobile Game",
            "os": "ANDROID",
            "package": "com.example.game",
            "is_live_in_store": 1,
            "store_url": "https://play.google.com/store/apps/details?id=com.example.game",
            "coppa": 0,
            "campaign_black_rule": 2,
            "auto_storekit": 1,
            "mediation_platform": 0,
            "video_orientation": "both",
            "store": "google_play"
        },
        "edit_app": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "app_name": "Updated Game Name",
            "coppa": 0
        },
        "create_placement": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "placement_name": "Interstitial Placement",
            "ad_type": "new_interstitial",
            "integrate_type": "sdk",
            "content_type": "both",
            "video_orientation": "portrait",
            "show_close_button": 1,
            "auto_fresh": 0,
            "ad_space_type": 1,
            "unit_names": "int_unit_1",
            "skip_time": 5
        },
        "edit_placement": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "placement_id": 67890,
            "placement_name": "Updated Placement",
            "content_type": "video",
            "skip_time": 3
        },
        "delete_placement": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "placement_ids": "67890,67891"
        },
        "create_unit": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "placement_id": 67890,
            "bidding_type": 1,
            "unit_name": "Bidding Unit",
            "target_ecpm": {
                "US": 5.00,
                "GB": 3.00,
                "ALL": 1.00
            }
        },
        "edit_unit": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "app_id": 12345,
            "placement_id": 67890,
            "unit_id": 11111,
            "unit_name": "Updated Unit",
            "target_ecpm": {
                "US": 6.00
            }
        },
        "delete_unit": {
            "skey": "your_skey_here",
            "time": "1706180400",
            "sign": "md5_signature_here",
            "unit_ids": "11111,22222"
        }
    }
}

def get_yaml_items(filename, provider_name):
    path = SPECS_DIR / filename
    if not path.exists(): return []
    with open(path, 'r', encoding='utf-8') as f:
        spec = yaml.safe_load(f)

    items = []
    paths_dict = spec.get("paths", {})
    base_url = spec["servers"][0]["url"].rstrip("/")
    placeholders = PLACEHOLDER_BODIES.get(filename, {})

    for p, methods in paths_dict.items():
        if not p.startswith("/"): continue
        for verb, m_info in methods.items():
            if verb.lower() not in ["get", "post", "put", "patch", "delete"]: continue

            target_base = base_url
            auth_header = "Authorization"
            auth_value = "Bearer {{AUTH_TOKEN}}"

            # Provider Specifics
            if filename == "applovin.yml":
                if "maxReport" in p or "report" in p: target_base = "https://r.applovin.com"
                auth_header = "Api-Key"
                auth_value = "{{APPLOVIN_API_KEY}}"
            elif filename == "mintegral.yml":
                target_base = "https://api.mintegral.com"
            elif filename == "unity.yml":
                auth_header = "Secret-Key"
                auth_value = "{{UNITY_SECRET_KEY}}"

            # Replace variables
            cp = p.replace("{id}", "123").replace("{appKey}", "123")
            cp = re.sub(r"\{.*?\}", "123", cp)

            # Pangle Logic
            if filename == "pangle.yml" and not p.startswith("/union"):
                if "/rt/" in p or "/report/" in p: cp = "/union_pangle/open/api" + p.replace("/report", "/rt")
                else: cp = "/union/media/open_api" + p

            raw_url = clean_url(target_base + "/" + cp.lstrip("/"))
            operation_id = m_info.get('operationId', p.replace("/", "_").strip("_"))

            request_obj = {
                "method": verb.upper(),
                "header": [
                    {"key": auth_header, "value": auth_value, "type": "text"},
                    {"key": "Content-Type", "value": "application/json", "type": "text"}
                ],
                "url": {
                    "raw": raw_url,
                    "protocol": "https",
                    "host": raw_url.split("//")[1].split("/")[0].split("."),
                    "path": raw_url.split("//")[1].split("/")[1:]
                },
                "description": m_info.get("summary", "")
            }

            # Add request body for POST/PUT/PATCH methods
            if verb.upper() in ["POST", "PUT", "PATCH"]:
                body_content = placeholders.get(operation_id, placeholders.get("default_post", {"example": "data"}))
                request_obj["body"] = {
                    "mode": "raw",
                    "raw": json.dumps(body_content, indent=2),
                    "options": {
                        "raw": {
                            "language": "json"
                        }
                    }
                }

            items.append({
                "name": f"{operation_id}",
                "request": request_obj
            })
    return items

def generate():
    collection = {
        "info": {
            "name": "ADAgentAI Full Suite",
            "description": "Comprehensive collection of all 9 Ad Networks (264+ endpoints) verified for 2026.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    }

    # Google
    collection["item"].append({"name": "AdMob", "item": get_google_items("admob_v1beta_discovery.json", "AdMob")})
    collection["item"].append({"name": "AdManager", "item": get_google_items("admanager_v1_discovery.json", "AdManager")})

    # 3rd Parties
    third_parties = [
        ("Unity", "unity.yml"),
        ("AppLovin", "applovin.yml"),
        ("DT Exchange", "dtexchange.yml"),
        ("Pangle", "pangle.yml"),
        ("Liftoff", "liftoff.yml"),
        ("InMobi", "inmobi.yml"),
        ("Mintegral", "mintegral.yml")
    ]

    for name, f in third_parties:
        collection["item"].append({"name": name, "item": get_yaml_items(f, name)})

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(collection, f, indent=2)

    print(f"Postman Collection generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate()

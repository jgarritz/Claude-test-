"""
Pruebas para la API de lectura (READONLY).
Endpoints cubiertos:
  - /api-readonly-incoming
  - /api-readonly-outgoing
  - /api-readonly-campaigns
  - /api-readonly-contacts
  - /api-readonly-dids
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("READONLY_API_KEY")
BASE_URL = os.getenv("BASE_URL", "https://jvhsctzkavvoasvdeivp.supabase.co/functions/v1")

HEADERS = {"Authorization": f"Bearer {API_KEY}"}

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"


def log(label, msg):
    print(f"{label} {msg}")


def check(response, test_name):
    try:
        data = response.json()
    except Exception:
        data = {}

    ok = response.status_code == 200 and data.get("success") is True
    status = PASS if ok else FAIL
    log(status, f"{test_name} — HTTP {response.status_code}")

    if not ok:
        log(INFO, f"  Body: {json.dumps(data, ensure_ascii=False)[:300]}")
    else:
        count = data.get("count", "—")
        total = data.get("total", "—")
        log(INFO, f"  count={count}  total={total}")

    return ok


# ──────────────────────────────────────────────
# 1. INCOMING
# ──────────────────────────────────────────────
def test_incoming_sin_filtros():
    r = requests.get(f"{BASE_URL}/api-readonly-incoming", headers=HEADERS, params={"limit": 5})
    return check(r, "incoming · sin filtros")


def test_incoming_por_fecha():
    params = {
        "from": "2026-05-01T00:00:00Z",
        "to":   "2026-05-04T23:59:59Z",
        "limit": 10,
    }
    r = requests.get(f"{BASE_URL}/api-readonly-incoming", headers=HEADERS, params=params)
    return check(r, "incoming · filtro por fecha")


def test_incoming_por_did():
    params = {"did": "5215671105201", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-incoming", headers=HEADERS, params=params)
    return check(r, "incoming · filtro por DID")


def test_incoming_paginacion():
    params = {"limit": 5, "offset": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-incoming", headers=HEADERS, params=params)
    return check(r, "incoming · paginación offset=5")


# ──────────────────────────────────────────────
# 2. OUTGOING
# ──────────────────────────────────────────────
def test_outgoing_sin_filtros():
    r = requests.get(f"{BASE_URL}/api-readonly-outgoing", headers=HEADERS, params={"limit": 5})
    return check(r, "outgoing · sin filtros")


def test_outgoing_por_fecha():
    params = {
        "from": "2026-05-01T00:00:00Z",
        "to":   "2026-05-04T23:59:59Z",
        "limit": 10,
    }
    r = requests.get(f"{BASE_URL}/api-readonly-outgoing", headers=HEADERS, params=params)
    return check(r, "outgoing · filtro por fecha")


def test_outgoing_con_status():
    params = {"include_status": "true", "limit": 3}
    r = requests.get(f"{BASE_URL}/api-readonly-outgoing", headers=HEADERS, params=params)
    ok = check(r, "outgoing · include_status=true")
    if ok:
        data = r.json()
        tiene_status = "status_updates" in data
        log(INFO if tiene_status else FAIL, f"  status_updates presente: {tiene_status}")
    return ok


def test_outgoing_por_campaign():
    params = {"campaign": "Generica", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-outgoing", headers=HEADERS, params=params)
    return check(r, "outgoing · filtro por campaign")


# ──────────────────────────────────────────────
# 3. CAMPAIGNS
# ──────────────────────────────────────────────
def test_campaigns_listado():
    r = requests.get(f"{BASE_URL}/api-readonly-campaigns", headers=HEADERS, params={"limit": 5})
    return check(r, "campaigns · listado general")


def test_campaigns_por_status():
    params = {"status": "completed", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-campaigns", headers=HEADERS, params=params)
    return check(r, "campaigns · status=completed")


def test_campaigns_por_template():
    params = {"template": "generica", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-campaigns", headers=HEADERS, params=params)
    return check(r, "campaigns · filtro por template")


def test_campaigns_por_fecha():
    params = {"from": "2026-05-01", "to": "2026-05-04", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-campaigns", headers=HEADERS, params=params)
    return check(r, "campaigns · filtro por fecha")


# ──────────────────────────────────────────────
# 4. CONTACTS
# ──────────────────────────────────────────────
def test_contacts_listado():
    r = requests.get(f"{BASE_URL}/api-readonly-contacts", headers=HEADERS, params={"limit": 5})
    return check(r, "contacts · listado general")


def test_contacts_por_did():
    params = {"did": "5215598704231", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-contacts", headers=HEADERS, params=params)
    return check(r, "contacts · filtro por DID")


def test_contacts_busqueda():
    params = {"search": "5512", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-contacts", headers=HEADERS, params=params)
    return check(r, "contacts · búsqueda por substring")


def test_contacts_por_since():
    params = {"since": "2026-04-01T00:00:00Z", "limit": 5}
    r = requests.get(f"{BASE_URL}/api-readonly-contacts", headers=HEADERS, params=params)
    return check(r, "contacts · filtro since")


# ──────────────────────────────────────────────
# 5. DIDS
# ──────────────────────────────────────────────
def test_dids_listado():
    r = requests.get(f"{BASE_URL}/api-readonly-dids", headers=HEADERS)
    return check(r, "dids · listado general")


def test_dids_por_waba_group():
    params = {"waba_group": "grupo_a"}
    r = requests.get(f"{BASE_URL}/api-readonly-dids", headers=HEADERS, params=params)
    return check(r, "dids · filtro por waba_group")


def test_dids_busqueda():
    params = {"search": "5598"}
    r = requests.get(f"{BASE_URL}/api-readonly-dids", headers=HEADERS, params=params)
    return check(r, "dids · búsqueda por substring")


# ──────────────────────────────────────────────
# RUNNER
# ──────────────────────────────────────────────
TESTS = [
    test_incoming_sin_filtros,
    test_incoming_por_fecha,
    test_incoming_por_did,
    test_incoming_paginacion,
    test_outgoing_sin_filtros,
    test_outgoing_por_fecha,
    test_outgoing_con_status,
    test_outgoing_por_campaign,
    test_campaigns_listado,
    test_campaigns_por_status,
    test_campaigns_por_template,
    test_campaigns_por_fecha,
    test_contacts_listado,
    test_contacts_por_did,
    test_contacts_busqueda,
    test_contacts_por_since,
    test_dids_listado,
    test_dids_por_waba_group,
    test_dids_busqueda,
]

if __name__ == "__main__":
    print(f"\n{'='*55}")
    print(f"  API READONLY — Suite de pruebas ({len(TESTS)} tests)")
    print(f"  Base URL: {BASE_URL}")
    print(f"{'='*55}\n")

    resultados = [t() for t in TESTS]

    passed = sum(resultados)
    failed = len(resultados) - passed

    print(f"\n{'='*55}")
    print(f"  Resultado: {passed}/{len(TESTS)} tests pasaron")
    if failed:
        print(f"  {FAIL} {failed} test(s) fallaron")
    else:
        print(f"  {PASS} Todos los tests pasaron")
    print(f"{'='*55}\n")

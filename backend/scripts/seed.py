#!/usr/bin/env python3
"""
Seed Sprint 1 — dos establecimientos aislados para verificar RLS.
Llama exclusivamente a endpoints HTTP reales (Supabase Auth + backend Cloud Run).
"""

import json
import sys
from datetime import datetime, timezone

import requests

SUPABASE_URL = "https://xbjhdtajizeooyisxauo.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiamhkdGFqaXplb295aXN4YXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDE0NjMsImV4cCI6MjA5OTAxNzQ2M30"
    ".TuiP6fnS7oKSlvduKoTyhJrf7jVgu0cqn-JYjE4q9_w"
)
BACKEND_URL = "https://potrero-backend-218640624451.southamerica-east1.run.app"

SEED_USERS = [
    {
        "email": "seed.estancia.a@gmail.com",
        "password": "SeedPotrero1!",
        "establecimiento": {
            "nombre": "Estancia Don Pedro [Seed A]",
            "nombre_propietario": "Pedro Ramírez",
            "fecha_inicio_sistema": "2025-01-01",
            "departamento": "Concepción",
        },
        "potreros": [
            {"nombre": "Potrero Norte",   "superficie_ha": "150.50", "tipo_pastura": "Brachiaria",          "capacidad_max_ug_ha": "0.80"},
            {"nombre": "Potrero Sur",     "superficie_ha": "200.00", "tipo_pastura": "Estrella Africana",   "capacidad_max_ug_ha": "1.00"},
            {"nombre": "Potrero Central", "superficie_ha": "75.25",  "tipo_pastura": "Pangola",             "capacidad_max_ug_ha": "0.90"},
        ],
    },
    {
        "email": "seed.estancia.b@gmail.com",
        "password": "SeedPotrero1!",
        "establecimiento": {
            "nombre": "Estancia La Palmera [Seed B]",
            "nombre_propietario": "María González",
            "fecha_inicio_sistema": "2025-01-01",
            "departamento": "San Pedro",
        },
        "potreros": [
            {"nombre": "Campo Grande", "superficie_ha": "300.00", "tipo_pastura": "Brachiaria Humidicola", "capacidad_max_ug_ha": "0.70"},
            {"nombre": "Campo Chico",  "superficie_ha": "50.00",  "tipo_pastura": "Llorones",              "capacidad_max_ug_ha": "1.20"},
            {"nombre": "Descanso",     "superficie_ha": "120.00", "tipo_pastura": "Grama Nativa",          "capacidad_max_ug_ha": "0.60"},
        ],
    },
]

log = []  # lista de dicts para el reporte final


def _record(method, url, status, body):
    log.append({"method": method, "url": url, "status": status, "body": body})
    ok = "OK" if status < 400 else "ERROR"
    print(f"  [{ok} {status}] {method} {url}")
    if status >= 400:
        print(f"           {json.dumps(body)}")


def supabase_post(path, payload):
    url = f"{SUPABASE_URL}{path}"
    r = requests.post(
        url,
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    try:
        body = r.json()
    except Exception:
        body = r.text
    _record("POST", url, r.status_code, body)
    return body, r.status_code


def backend(method, path, token, payload=None):
    url = f"{BACKEND_URL}/api/v1{path}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = getattr(requests, method)(url, headers=headers, json=payload, timeout=15)
    try:
        body = r.json()
    except Exception:
        body = r.text
    _record(method.upper(), url, r.status_code, body)
    return body, r.status_code


def signup_or_login(email, password):
    """Intenta signup; si el usuario ya existe, hace login directamente."""
    print(f"\n--- Signup {email}")
    body, status = supabase_post("/auth/v1/signup", {"email": email, "password": password})

    # Supabase devuelve access_token en el body si email confirm está desactivado
    token = (body or {}).get("access_token")
    if token:
        return token

    # Si el usuario ya existía o requiere confirmación, intentar login
    print(f"    -> signup sin token (status={status}), intentando login...")
    return login(email, password)


def login(email, password):
    print(f"--- Login {email}")
    body, status = supabase_post(
        "/auth/v1/token?grant_type=password",
        {"email": email, "password": password},
    )
    token = (body or {}).get("access_token")
    if not token:
        print(f"  ERROR: no se obtuvo access_token. Abortando.")
        sys.exit(1)
    return token


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print("=" * 60)


def run():
    tokens = {}

    # ── Fase 1: auth + establecimientos + potreros ──────────────────
    for user in SEED_USERS:
        email = user["email"]
        section(f"Usuario: {email}")

        token = signup_or_login(email, user["password"])
        tokens[email] = token

        print(f"\n--- GET /auth/me")
        backend("get", "/auth/me", token)

        print(f"\n--- POST /establecimientos")
        est_body, est_status = backend("post", "/establecimientos", token, user["establecimiento"])

        if est_status not in (200, 201):
            print(f"    -> establecimiento ya existente o error ({est_status}), continuando con potreros")

        print(f"\n--- POST /potreros (x3)")
        for p in user["potreros"]:
            backend("post", "/potreros", token, p)

        print(f"\n--- GET /categorias")
        backend("get", "/categorias", token)

    # ── Fase 2: verificación de aislamiento RLS ──────────────────────
    section("Verificacion de aislamiento RLS")

    email_a, email_b = SEED_USERS[0]["email"], SEED_USERS[1]["email"]
    token_a, token_b = tokens[email_a], tokens[email_b]

    # Cada usuario ve solo sus propios potreros
    print(f"\n--- GET /potreros con token A (debe ver solo sus 3)")
    body_a, _ = backend("get", "/potreros", token_a)

    print(f"\n--- GET /potreros con token B (debe ver solo sus 3)")
    body_b, _ = backend("get", "/potreros", token_b)

    items_a = (body_a or {}).get("items", [])
    items_b = (body_b or {}).get("items", [])
    total_a = (body_a or {}).get("total", 0)
    total_b = (body_b or {}).get("total", 0)

    # Los establecimiento_id deben ser distintos entre A y B
    est_ids_a = {p["establecimiento_id"] for p in items_a}
    est_ids_b = {p["establecimiento_id"] for p in items_b}
    ids_no_se_mezclan = est_ids_a.isdisjoint(est_ids_b) and len(est_ids_a) == 1 and len(est_ids_b) == 1

    # Cross-check: token A intenta acceder a un potrero de B por ID -> debe ser 404
    potrero_id_b = items_b[0]["id"] if items_b else None
    cross_status_a = None
    if potrero_id_b:
        print(f"\n--- GET /potreros/{{id_de_B}} con token A (debe ser 404)")
        _, cross_status_a = backend("get", f"/potreros/{potrero_id_b}", token_a)

    # Cross-check: token B intenta acceder a un potrero de A por ID -> debe ser 404
    potrero_id_a = items_a[0]["id"] if items_a else None
    cross_status_b = None
    if potrero_id_a:
        print(f"\n--- GET /potreros/{{id_de_A}} con token B (debe ser 404)")
        _, cross_status_b = backend("get", f"/potreros/{potrero_id_a}", token_b)

    # Cross-check: GET /establecimientos/me de A con token B -> debe ser el de B, no el de A
    print(f"\n--- GET /establecimientos/me con token A")
    me_a, _ = backend("get", "/establecimientos/me", token_a)
    print(f"\n--- GET /establecimientos/me con token B")
    me_b, _ = backend("get", "/establecimientos/me", token_b)
    est_id_a = (me_a or {}).get("id")
    est_id_b = (me_b or {}).get("id")
    establecimientos_distintos = est_id_a and est_id_b and est_id_a != est_id_b

    aislamiento_ok = (
        total_a == 3
        and total_b == 3
        and ids_no_se_mezclan
        and cross_status_a == 404
        and cross_status_b == 404
        and establecimientos_distintos
    )

    section("Resultado")
    print(f"  Potreros visibles para A             : {total_a}  (esperado: 3)")
    print(f"  Potreros visibles para B             : {total_b}  (esperado: 3)")
    print(f"  establecimiento_ids distintos        : {'OK' if ids_no_se_mezclan else 'FALLO'}")
    print(f"  Token A no accede a potrero de B     : {'OK' if cross_status_a == 404 else f'FALLO (status={cross_status_a})'}")
    print(f"  Token B no accede a potrero de A     : {'OK' if cross_status_b == 404 else f'FALLO (status={cross_status_b})'}")
    print(f"  Establecimientos distintos           : {'OK' if establecimientos_distintos else 'FALLO'}")
    print(f"  Aislamiento RLS multi-tenant         : {'OK' if aislamiento_ok else 'FALLO'}")

    # ── Reporte JSON ─────────────────────────────────────────────────
    report = {
        "ejecutado_en": datetime.now(timezone.utc).isoformat(),
        "aislamiento_rls": aislamiento_ok,
        "checks": {
            "total_potreros_a": total_a,
            "total_potreros_b": total_b,
            "establecimiento_ids_distintos": ids_no_se_mezclan,
            "cross_status_token_a_vs_potrero_b": cross_status_a,
            "cross_status_token_b_vs_potrero_a": cross_status_b,
            "establecimientos_distintos": establecimientos_distintos,
        },
        "requests": log,
    }
    report_path = "backend/scripts/seed_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n  Reporte completo guardado en: {report_path}")


if __name__ == "__main__":
    run()

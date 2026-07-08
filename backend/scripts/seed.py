#!/usr/bin/env python3
"""
Seed Sprint 1 — dos establecimientos aislados para verificar RLS.
Llama exclusivamente a endpoints HTTP reales (Supabase Auth + backend Cloud Run).
"""

import json
import sys
from datetime import datetime

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
    section("Verificación de aislamiento RLS")

    email_a, email_b = SEED_USERS[0]["email"], SEED_USERS[1]["email"]
    token_a, token_b = tokens[email_a], tokens[email_b]

    print(f"\n--- GET /potreros con token de {email_a}  (debe ver solo sus 3)")
    body_a, _ = backend("get", "/potreros", token_a)

    print(f"\n--- GET /potreros con token de {email_b}  (debe ver solo sus 3)")
    body_b, _ = backend("get", "/potreros", token_b)

    total_a = (body_a or {}).get("total", "?")
    total_b = (body_b or {}).get("total", "?")
    aislamiento_ok = total_a == 3 and total_b == 3

    section("Resultado")
    print(f"  Potreros visibles para Seed A : {total_a}  (esperado: 3)")
    print(f"  Potreros visibles para Seed B : {total_b}  (esperado: 3)")
    print(f"  Aislamiento RLS               : {'OK' if aislamiento_ok else 'FALLO'}")

    # ── Reporte JSON ─────────────────────────────────────────────────
    report = {
        "ejecutado_en": datetime.utcnow().isoformat() + "Z",
        "aislamiento_rls": aislamiento_ok,
        "requests": log,
    }
    report_path = "backend/scripts/seed_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n  Reporte completo guardado en: {report_path}")


if __name__ == "__main__":
    run()

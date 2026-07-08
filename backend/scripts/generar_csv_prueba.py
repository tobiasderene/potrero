"""
Genera un CSV de prueba para testear la importación masiva de animales.

Uso:
    python backend/scripts/generar_csv_prueba.py
    python backend/scripts/generar_csv_prueba.py --potrero "Potrero Norte" --salida mi_test.csv

Produce 1000 filas: 950 válidas + 50 con errores intencionales de distintos tipos.
Los errores cubren todos los casos de validación del backend.
"""

import argparse
import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

RAZAS = ["Hereford", "Aberdeen Angus", "Brahman", "Nelore", "Shorthorn", "Brangus", "Limousin", ""]
CATEGORIAS_VALIDAS = ["ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey"]

# Distribución realista de un rodeo típico
DISTRIBUCION = [
    ("novillo",      "macho",   "comprado", 280),
    ("vaquillona",   "hembra",  "comprado", 150),
    ("vaca",         "hembra",  "nacido",   200),
    ("vaca_con_cria","hembra",  "nacido",   100),
    ("ternero",      "macho",   "nacido",    80),
    ("ternera",      "hembra",  "nacido",    80),
    ("toro",         "macho",   "comprado",  40),
    ("buey",         "macho",   "comprado",  20),
]  # total: 950


def fecha_aleatoria(desde_anios: int, hasta_anios: int) -> str:
    hoy = date.today()
    desde = hoy - timedelta(days=hasta_anios * 365)
    hasta = hoy - timedelta(days=desde_anios * 365)
    delta = (hasta - desde).days
    d = desde + timedelta(days=random.randint(0, delta))
    return d.strftime("%d/%m/%Y")


def generar_filas_validas(potrero: str) -> list[dict]:
    filas = []
    caravana_n = 1
    campo_n = 1

    for categoria, sexo, tipo_origen, cantidad in DISTRIBUCION:
        for _ in range(cantidad):
            tiene_caravana = random.random() < 0.75  # 75% tienen caravana
            tiene_campo = random.random() < 0.60     # 60% tienen numero de campo

            # Al menos uno debe existir
            if not tiene_caravana and not tiene_campo:
                tiene_caravana = True

            caravana = ""
            if tiene_caravana:
                caravana = f"TS{caravana_n:05d}"
                caravana_n += 1

            campo = ""
            if tiene_campo:
                campo = str(campo_n)
                campo_n += 1

            # Edad aproximada según categoría
            if categoria in ("ternero", "ternera"):
                fecha = fecha_aleatoria(0, 1)
            elif categoria in ("novillo", "vaquillona"):
                fecha = fecha_aleatoria(1, 3)
            else:
                fecha = fecha_aleatoria(2, 10) if random.random() < 0.7 else ""

            raza = random.choice(RAZAS)

            filas.append({
                "caravana_senacsa": caravana,
                "numero_campo": campo,
                "categoria": categoria,
                "sexo": sexo,
                "raza": raza,
                "fecha_nacimiento": fecha,
                "tipo_origen": tipo_origen,
                "potrero": potrero,
                "lote": "[Sprint 3]",
            })

    return filas


def generar_filas_con_error() -> list[dict]:
    """50 filas con errores intencionales, 10 de cada tipo."""
    base = {
        "caravana_senacsa": "ER00000",
        "numero_campo": "",
        "categoria": "novillo",
        "sexo": "macho",
        "raza": "Hereford",
        "fecha_nacimiento": "01/01/2023",
        "tipo_origen": "comprado",
        "potrero": "",
        "lote": "",
    }
    filas = []
    n = 1

    # Tipo 1: sin ninguna identificación
    for _ in range(10):
        f = dict(base)
        f["caravana_senacsa"] = ""
        f["numero_campo"] = ""
        f["raza"] = "Sin identificacion"
        filas.append(f)
        n += 1

    # Tipo 2: sexo inválido
    for _ in range(10):
        f = dict(base)
        f["caravana_senacsa"] = f"ER{n:05d}"
        f["sexo"] = random.choice(["M", "F", "masculino", "femenino", "0"])
        filas.append(f)
        n += 1

    # Tipo 3: categoría inválida
    for _ in range(10):
        f = dict(base)
        f["caravana_senacsa"] = f"ER{n:05d}"
        f["categoria"] = random.choice(["vaca_gorda", "toro_viejo", "cria", "gordo", "reproductora"])
        filas.append(f)
        n += 1

    # Tipo 4: tipo_origen inválido
    for _ in range(10):
        f = dict(base)
        f["caravana_senacsa"] = f"ER{n:05d}"
        f["tipo_origen"] = random.choice(["importado", "donado", "propio", "transferido"])
        filas.append(f)
        n += 1

    # Tipo 5: fecha con formato incorrecto
    for _ in range(10):
        f = dict(base)
        f["caravana_senacsa"] = f"ER{n:05d}"
        f["fecha_nacimiento"] = random.choice([
            "2023/06/15",   # separador incorrecto
            "15-06-2023",   # guion en lugar de barra
            "06/15/2023",   # formato MM/DD/YYYY
            "15.06.2023",   # punto
            "enero 2023",   # texto
        ])
        filas.append(f)
        n += 1

    return filas


def main():
    parser = argparse.ArgumentParser(description="Genera CSV de prueba para importación de animales")
    parser.add_argument("--potrero", default="", help="Nombre exacto de un potrero existente (opcional)")
    parser.add_argument("--salida", default="backend/scripts/animales_prueba_1000.csv", help="Ruta del archivo CSV")
    args = parser.parse_args()

    validas = generar_filas_validas(args.potrero)
    errores = generar_filas_con_error()

    # Mezclar errores entre las filas válidas para que aparezcan dispersos
    random.shuffle(errores)
    posiciones = sorted(random.sample(range(len(validas) + len(errores)), len(errores)))

    todas: list[dict] = []
    it_validas = iter(validas)
    it_errores = iter(errores)
    pos_errores = set(posiciones)

    for i in range(len(validas) + len(errores)):
        if i in pos_errores:
            todas.append(next(it_errores))
        else:
            todas.append(next(it_validas))

    salida = Path(args.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)

    campos = ["caravana_senacsa", "numero_campo", "categoria", "sexo", "raza",
              "fecha_nacimiento", "tipo_origen", "potrero", "lote"]

    with open(salida, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=campos)
        writer.writeheader()
        writer.writerows(todas)

    validas_count = len(validas)
    errores_count = len(errores)
    print(f"CSV generado: {salida}")
    print(f"  Total filas:   {validas_count + errores_count}")
    print(f"  Validas:       {validas_count}")
    print(f"  Con errores:   {errores_count} (dispersos entre las validas)")
    print()
    print("Tipos de error incluidos (10 filas cada uno):")
    print("  - Sin caravana ni numero de campo")
    print("  - Sexo invalido (M, F, masculino...)")
    print("  - Categoria invalida (vaca_gorda, gordo...)")
    print("  - Tipo de origen invalido (importado, donado...)")
    print("  - Fecha con formato incorrecto (guiones, puntos, MM/DD...)")
    if args.potrero:
        print(f"\nPotrero asignado: '{args.potrero}'")
        print("IMPORTANTE: ese potrero debe existir en tu establecimiento o esas filas darán error.")
    else:
        print("\nSin potrero asignado — los animales quedarán sin ubicacion inicial.")
        print("Para asignar potrero: python backend/scripts/generar_csv_prueba.py --potrero 'Nombre del Potrero'")


if __name__ == "__main__":
    main()

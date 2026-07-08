-- ═══════════════════════════════════════════════════════════════
-- Esquema completo inicial — tablas, RLS, triggers y funciones.
-- Generado a partir de alembic/versions/0001_initial_schema.py
-- Pegar y correr entero en Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ── Bloque 1: Fundación multi-tenant ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS establecimientos (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre               TEXT NOT NULL,
    departamento         TEXT,
    coordenadas_lat      NUMERIC(10,7),
    coordenadas_lng      NUMERIC(10,7),
    numero_senacsa       TEXT UNIQUE,
    nombre_propietario   TEXT NOT NULL,
    fecha_inicio_sistema DATE NOT NULL,
    ejercicio_inicio_mes INTEGER NOT NULL DEFAULT 7
        CHECK (ejercicio_inicio_mes BETWEEN 1 AND 12),
    activo               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios_establecimientos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL,
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id) ON DELETE CASCADE,
    rol                 TEXT NOT NULL
        CHECK (rol IN ('propietario', 'administrador', 'veterinario')),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, establecimiento_id)
);

CREATE INDEX IF NOT EXISTS idx_ue_user_id
    ON usuarios_establecimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_ue_establecimiento_id
    ON usuarios_establecimientos(establecimiento_id);

CREATE TABLE IF NOT EXISTS tipos_de_cambio (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    tasa_pyg_por_usd    NUMERIC(12,2) NOT NULL,
    fecha_vigencia      DATE NOT NULL,
    usuario_id          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (establecimiento_id, fecha_vigencia)
);

-- ── Bloque 2: Configuración del establecimiento ───────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    nombre              TEXT NOT NULL
        CHECK (nombre IN (
            'ternero','ternera','novillo','vaquillona',
            'toro','vaca','vaca_con_cria','buey'
        )),
    coeficiente_ug      NUMERIC(4,2) NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (establecimiento_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_categorias_establecimiento
    ON categorias(establecimiento_id);

CREATE TABLE IF NOT EXISTS potreros (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    nombre              TEXT NOT NULL,
    superficie_ha       NUMERIC(10,2),
    tipo_pastura        TEXT,
    capacidad_max_ug_ha NUMERIC(6,2),
    estado              TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','en_descanso','en_recuperacion','archivado')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (establecimiento_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_potreros_establecimiento
    ON potreros(establecimiento_id);
CREATE INDEX IF NOT EXISTS idx_potreros_estado
    ON potreros(establecimiento_id, estado);

CREATE TABLE IF NOT EXISTS lotes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id      UUID NOT NULL REFERENCES establecimientos(id),
    nombre                  TEXT NOT NULL,
    proposito               TEXT NOT NULL
        CHECK (proposito IN ('invernada','cria','recria','reproduccion')),
    potrero_principal_id    UUID REFERENCES potreros(id),
    fecha_formacion         DATE NOT NULL,
    fecha_cierre            DATE,
    peso_promedio_ingreso   NUMERIC(7,2),
    peso_objetivo_salida    NUMERIC(7,2),
    plazo_estimado_dias     INTEGER,
    estado                  TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','cerrado')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotes_establecimiento
    ON lotes(establecimiento_id);
CREATE INDEX IF NOT EXISTS idx_lotes_estado
    ON lotes(establecimiento_id, estado);

-- ── Bloque 3: Animales e identidad ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS animales (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id          UUID NOT NULL REFERENCES establecimientos(id),
    caravana_senacsa            TEXT,
    numero_campo                TEXT,
    raza                        TEXT,
    sexo                        TEXT NOT NULL
        CHECK (sexo IN ('macho','hembra')),
    fecha_nacimiento            DATE,
    fecha_nacimiento_estimada   BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_origen                 TEXT NOT NULL
        CHECK (tipo_origen IN ('nacido','comprado')),
    establecimiento_origen      TEXT,
    madre_id                    UUID REFERENCES animales(id),
    padre_id                    UUID REFERENCES animales(id),
    estado                      TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo','egresado')),
    fecha_egreso                DATE,
    tipo_egreso                 TEXT
        CHECK (tipo_egreso IN ('venta','faena','muerte')),
    lote_actual_id              UUID REFERENCES lotes(id),
    potrero_actual_id           UUID REFERENCES potreros(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT animal_tiene_identificacion
        CHECK (caravana_senacsa IS NOT NULL OR numero_campo IS NOT NULL),
    UNIQUE (establecimiento_id, caravana_senacsa),
    UNIQUE (establecimiento_id, numero_campo)
);

CREATE INDEX IF NOT EXISTS idx_animales_establecimiento
    ON animales(establecimiento_id);
CREATE INDEX IF NOT EXISTS idx_animales_estado
    ON animales(establecimiento_id, estado);
CREATE INDEX IF NOT EXISTS idx_animales_lote
    ON animales(lote_actual_id);
CREATE INDEX IF NOT EXISTS idx_animales_potrero
    ON animales(potrero_actual_id);
CREATE INDEX IF NOT EXISTS idx_animales_caravana
    ON animales(establecimiento_id, caravana_senacsa)
    WHERE caravana_senacsa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animales_madre
    ON animales(madre_id)
    WHERE madre_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS animal_categorias (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id   UUID NOT NULL REFERENCES animales(id),
    categoria   TEXT NOT NULL
        CHECK (categoria IN (
            'ternero','ternera','novillo','vaquillona',
            'toro','vaca','vaca_con_cria','buey'
        )),
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE,
    usuario_id   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT una_categoria_activa EXCLUDE USING gist (
        animal_id WITH =,
        daterange(fecha_inicio, fecha_fin, '[)') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_categorias_animal
    ON animal_categorias(animal_id);
CREATE INDEX IF NOT EXISTS idx_categorias_activa
    ON animal_categorias(animal_id)
    WHERE fecha_fin IS NULL;

-- ── Bloque 4: Eventos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    tipo                TEXT NOT NULL
        CHECK (tipo IN (
            'movimiento','pesaje','sanitario_vacunacion',
            'sanitario_tratamiento','sanitario_diagnostico',
            'reproductivo_servicio','reproductivo_diagnostico_prenez',
            'reproductivo_paricion','cambio_categoria'
        )),
    fecha_evento        DATE NOT NULL,
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_id          UUID NOT NULL,
    observaciones       TEXT,
    corregido_por_id    UUID REFERENCES eventos(id),
    es_correccion_de_id UUID REFERENCES eventos(id),
    anulado             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fecha_evento_no_futura
        CHECK (fecha_evento <= CURRENT_DATE)
);

CREATE RULE eventos_no_update AS
    ON UPDATE TO eventos DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_eventos_establecimiento
    ON eventos(establecimiento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo
    ON eventos(establecimiento_id, tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha
    ON eventos(establecimiento_id, fecha_evento DESC);

CREATE TABLE IF NOT EXISTS eventos_animales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id       UUID NOT NULL REFERENCES eventos(id),
    animal_id       UUID NOT NULL REFERENCES animales(id),
    evento_lote_id  UUID REFERENCES eventos(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (evento_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_ea_evento ON eventos_animales(evento_id);
CREATE INDEX IF NOT EXISTS idx_ea_animal ON eventos_animales(animal_id);
CREATE INDEX IF NOT EXISTS idx_ea_animal_tipo
    ON eventos_animales(animal_id)
    INCLUDE (evento_id);

-- ── Bloque 5: Especializaciones de eventos ───────────────────────────────
CREATE TABLE IF NOT EXISTS evento_pesajes (
    evento_id        UUID PRIMARY KEY REFERENCES eventos(id),
    animal_id        UUID REFERENCES animales(id),
    lote_id          UUID REFERENCES lotes(id),
    tipo             TEXT NOT NULL CHECK (tipo IN ('individual','lote_estimado')),
    peso_kg          NUMERIC(7,2) NOT NULL CHECK (peso_kg > 0),
    cantidad_muestra INTEGER,
    gdp_g_dia        NUMERIC(8,2),
    dias_intervalo   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pesajes_animal
    ON evento_pesajes(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pesajes_lote
    ON evento_pesajes(lote_id) WHERE lote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS evento_movimientos (
    evento_id               UUID PRIMARY KEY REFERENCES eventos(id),
    tipo_movimiento         TEXT NOT NULL
        CHECK (tipo_movimiento IN (
            'ingreso_compra','nacimiento','traslado_interno',
            'egreso_venta','egreso_faena','egreso_muerte'
        )),
    potrero_origen_id       UUID REFERENCES potreros(id),
    potrero_destino_id      UUID REFERENCES potreros(id),
    lote_destino_id         UUID REFERENCES lotes(id),
    establecimiento_origen  TEXT,
    numero_guia_senacsa     TEXT,
    proveedor               TEXT,
    precio_unitario         NUMERIC(15,2),
    tipo_precio             TEXT CHECK (tipo_precio IN ('por_cabeza','por_kg')),
    moneda                  TEXT CHECK (moneda IN ('PYG','USD')),
    comprador               TEXT,
    destino_venta           TEXT
        CHECK (destino_venta IN ('frigorifico','remate','venta_directa')),
    precio_venta_unitario   NUMERIC(15,2),
    peso_venta_promedio_kg  NUMERIC(7,2),
    causa_muerte            TEXT,
    padre_id                UUID REFERENCES animales(id)
);

CREATE INDEX IF NOT EXISTS idx_movimientos_tipo
    ON evento_movimientos(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_guia
    ON evento_movimientos(numero_guia_senacsa)
    WHERE numero_guia_senacsa IS NOT NULL;

CREATE TABLE IF NOT EXISTS evento_vacunaciones (
    evento_id               UUID PRIMARY KEY REFERENCES eventos(id),
    biologico               TEXT NOT NULL,
    laboratorio             TEXT,
    numero_lote_biologico   TEXT,
    fecha_vencimiento_biol  DATE,
    dosis_ml                NUMERIC(6,2),
    via_administracion      TEXT
        CHECK (via_administracion IN (
            'subcutanea','intramuscular','intravenosa','oral','topica'
        )),
    es_antiaftosa           BOOLEAN NOT NULL DEFAULT FALSE,
    lote_id                 UUID REFERENCES lotes(id)
);

CREATE TABLE IF NOT EXISTS evento_tratamientos (
    evento_id           UUID PRIMARY KEY REFERENCES eventos(id),
    animal_id           UUID NOT NULL REFERENCES animales(id),
    diagnostico         TEXT,
    medicamento         TEXT NOT NULL,
    dosis               TEXT,
    via_administracion  TEXT
        CHECK (via_administracion IN (
            'subcutanea','intramuscular','intravenosa','oral','topica'
        )),
    duracion_dias       INTEGER,
    dias_carencia       INTEGER NOT NULL DEFAULT 0,
    fecha_fin_carencia  DATE NOT NULL,
    veterinario         TEXT,
    costo               NUMERIC(15,2),
    moneda_costo        TEXT CHECK (moneda_costo IN ('PYG','USD'))
);

CREATE INDEX IF NOT EXISTS idx_tratamientos_animal
    ON evento_tratamientos(animal_id);
CREATE INDEX IF NOT EXISTS idx_tratamientos_carencia
    ON evento_tratamientos(animal_id, fecha_fin_carencia);

CREATE TABLE IF NOT EXISTS evento_diagnosticos (
    evento_id       UUID PRIMARY KEY REFERENCES eventos(id),
    animal_id       UUID NOT NULL REFERENCES animales(id),
    descripcion     TEXT NOT NULL,
    veterinario     TEXT,
    con_tratamiento BOOLEAN NOT NULL DEFAULT FALSE,
    tratamiento_id  UUID REFERENCES evento_tratamientos(evento_id)
);

CREATE TABLE IF NOT EXISTS evento_servicios (
    evento_id                   UUID PRIMARY KEY REFERENCES eventos(id),
    hembra_id                   UUID NOT NULL REFERENCES animales(id),
    tipo_servicio               TEXT NOT NULL
        CHECK (tipo_servicio IN ('monta_natural','inseminacion_artificial')),
    toro_id                     UUID REFERENCES animales(id),
    codigo_semen                TEXT,
    fecha_prevista_diagnostico  DATE
);

CREATE TABLE IF NOT EXISTS evento_diagnosticos_prenez (
    evento_id           UUID PRIMARY KEY REFERENCES eventos(id),
    hembra_id           UUID NOT NULL REFERENCES animales(id),
    servicio_id         UUID REFERENCES evento_servicios(evento_id),
    resultado           TEXT NOT NULL CHECK (resultado IN ('positivo','negativo')),
    metodo              TEXT CHECK (metodo IN ('tacto_rectal','ecografia')),
    veterinario         TEXT,
    fecha_probable_parto DATE
);

CREATE TABLE IF NOT EXISTS evento_pariciones (
    evento_id   UUID PRIMARY KEY REFERENCES eventos(id),
    madre_id    UUID NOT NULL REFERENCES animales(id),
    cria_id     UUID REFERENCES animales(id),
    tipo_parto  TEXT CHECK (tipo_parto IN ('normal','distocico','asistido')),
    estado_cria TEXT CHECK (estado_cria IN ('vivo','nacido_muerto'))
);

-- ── Bloque 6: Eventos económicos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos_economicos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    evento_id           UUID REFERENCES eventos(id),
    animal_id           UUID REFERENCES animales(id),
    lote_id             UUID REFERENCES lotes(id),
    tipo                TEXT NOT NULL
        CHECK (tipo IN (
            'compra_animal','venta_animal','insumo_sanitario',
            'honorario_veterinario','otro_costo'
        )),
    monto               NUMERIC(15,2) NOT NULL,
    moneda              TEXT NOT NULL CHECK (moneda IN ('PYG','USD')),
    tasa_cambio_ref     NUMERIC(12,2),
    descripcion         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ee_animal
    ON eventos_economicos(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ee_lote
    ON eventos_economicos(lote_id) WHERE lote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ee_establecimiento
    ON eventos_economicos(establecimiento_id);

-- ── Bloque 7: Alertas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    tipo                TEXT NOT NULL
        CHECK (tipo IN (
            'antiaftosa_vencida','carencia_activa','vacunacion_proxima',
            'potrero_sobrecargado','sin_pesaje_reciente','gdp_bajo',
            'dias_sistema_excedidos','peso_objetivo_alcanzado'
        )),
    severidad           TEXT NOT NULL
        CHECK (severidad IN ('critica','preventiva','informativa')),
    animal_id           UUID REFERENCES animales(id),
    lote_id             UUID REFERENCES lotes(id),
    potrero_id          UUID REFERENCES potreros(id),
    mensaje             TEXT NOT NULL,
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    resuelta_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_establecimiento
    ON alertas(establecimiento_id, activa)
    WHERE activa = TRUE;

-- ── Bloque 8: Importaciones CSV ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS importaciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establecimiento_id  UUID NOT NULL REFERENCES establecimientos(id),
    usuario_id          UUID NOT NULL,
    nombre_archivo      TEXT NOT NULL,
    total_filas         INTEGER,
    filas_exitosas      INTEGER,
    filas_con_error     INTEGER,
    estado              TEXT NOT NULL DEFAULT 'procesando'
        CHECK (estado IN ('procesando','completado','completado_con_errores','fallido')),
    reporte_errores     JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completado_at       TIMESTAMPTZ
);

-- ── Bloque 9: Row Level Security ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION mis_establecimientos()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT establecimiento_id
    FROM usuarios_establecimientos
    WHERE user_id = auth.uid()
      AND activo = TRUE
$$;

ALTER TABLE establecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE potreros ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_economicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;

ALTER TABLE usuarios_establecimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso propio" ON usuarios_establecimientos
    FOR ALL USING (user_id = auth.uid());

ALTER TABLE animal_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_de_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_pesajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_vacunaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_tratamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_diagnosticos_prenez ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_pariciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crear establecimiento propio" ON establecimientos
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ver mi establecimiento" ON establecimientos
    FOR SELECT USING (id IN (SELECT mis_establecimientos()));
CREATE POLICY "actualizar mi establecimiento" ON establecimientos
    FOR UPDATE USING (id IN (SELECT mis_establecimientos()))
    WITH CHECK (id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON potreros
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON lotes
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON animales
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON eventos
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON eventos_economicos
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON alertas
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON importaciones
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));

CREATE POLICY "acceso via animal" ON animal_categorias
    FOR ALL USING (
        animal_id IN (
            SELECT id FROM animales
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );

CREATE POLICY "acceso via evento" ON eventos_animales
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );

CREATE POLICY "acceso por establecimiento" ON categorias
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));
CREATE POLICY "acceso por establecimiento" ON tipos_de_cambio
    FOR ALL USING (establecimiento_id IN (SELECT mis_establecimientos()));

CREATE POLICY "acceso via evento" ON evento_pesajes
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_movimientos
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_vacunaciones
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_tratamientos
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_diagnosticos
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_servicios
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_diagnosticos_prenez
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );
CREATE POLICY "acceso via evento" ON evento_pariciones
    FOR ALL USING (
        evento_id IN (
            SELECT id FROM eventos
            WHERE establecimiento_id IN (SELECT mis_establecimientos())
        )
    );

-- ── Bloque 10: Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION actualizar_ubicacion_animal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tipo_movimiento = 'traslado_interno' THEN
        UPDATE animales
        SET potrero_actual_id = NEW.potrero_destino_id, updated_at = now()
        WHERE id IN (
            SELECT animal_id FROM eventos_animales WHERE evento_id = NEW.evento_id
        );
    ELSIF NEW.tipo_movimiento IN ('ingreso_compra', 'nacimiento') THEN
        UPDATE animales
        SET potrero_actual_id = NEW.potrero_destino_id,
            lote_actual_id    = NEW.lote_destino_id,
            updated_at        = now()
        WHERE id IN (
            SELECT animal_id FROM eventos_animales WHERE evento_id = NEW.evento_id
        );
    ELSIF NEW.tipo_movimiento IN ('egreso_venta', 'egreso_faena', 'egreso_muerte') THEN
        UPDATE animales
        SET estado            = 'egresado',
            fecha_egreso      = (SELECT fecha_evento FROM eventos WHERE id = NEW.evento_id),
            tipo_egreso       = CASE NEW.tipo_movimiento
                                    WHEN 'egreso_venta'   THEN 'venta'
                                    WHEN 'egreso_faena'   THEN 'faena'
                                    WHEN 'egreso_muerte'  THEN 'muerte'
                                END,
            potrero_actual_id = NULL,
            lote_actual_id    = NULL,
            updated_at        = now()
        WHERE id IN (
            SELECT animal_id FROM eventos_animales WHERE evento_id = NEW.evento_id
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actualizar_ubicacion
    AFTER INSERT ON evento_movimientos
    FOR EACH ROW EXECUTE FUNCTION actualizar_ubicacion_animal();

CREATE OR REPLACE FUNCTION verificar_cierre_lote()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_lote_id         UUID;
    v_fecha_evento    DATE;
    v_animales_activos INTEGER;
BEGIN
    FOR v_lote_id IN
        SELECT DISTINCT a.lote_actual_id
        FROM eventos_animales ea
        JOIN animales a ON a.id = ea.animal_id
        WHERE ea.evento_id = NEW.evento_id
          AND a.lote_actual_id IS NOT NULL
    LOOP
        SELECT count(*) INTO v_animales_activos
        FROM animales
        WHERE lote_actual_id = v_lote_id AND estado = 'activo';

        IF v_animales_activos = 0 THEN
            SELECT fecha_evento INTO v_fecha_evento
            FROM eventos WHERE id = NEW.evento_id;

            UPDATE lotes
            SET estado     = 'cerrado',
                fecha_cierre = v_fecha_evento,
                updated_at   = now()
            WHERE id = v_lote_id;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cierre_lote
    AFTER INSERT ON evento_movimientos
    FOR EACH ROW
    WHEN (NEW.tipo_movimiento IN ('egreso_venta','egreso_faena','egreso_muerte'))
    EXECUTE FUNCTION verificar_cierre_lote();

-- ── Funciones de dominio ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION animales_con_carencia_activa(p_animal_ids UUID[])
RETURNS TABLE (animal_id UUID, fecha_fin_carencia DATE, medicamento TEXT)
LANGUAGE sql STABLE AS $$
    SELECT
        et.animal_id,
        max(et.fecha_fin_carencia)           AS fecha_fin_carencia,
        string_agg(et.medicamento, ', ')     AS medicamento
    FROM evento_tratamientos et
    JOIN eventos e ON e.id = et.evento_id
    WHERE et.animal_id = ANY(p_animal_ids)
      AND et.fecha_fin_carencia >= CURRENT_DATE
      AND e.anulado = FALSE
    GROUP BY et.animal_id
    HAVING max(et.fecha_fin_carencia) >= CURRENT_DATE;
$$;

CREATE OR REPLACE FUNCTION calcular_gdp(p_animal_id UUID)
RETURNS TABLE (gdp_g_dia NUMERIC, peso_anterior NUMERIC, dias_intervalo INTEGER)
LANGUAGE sql STABLE AS $$
    WITH ultimos_dos AS (
        SELECT
            ep.peso_kg,
            e.fecha_evento,
            row_number() OVER (ORDER BY e.fecha_evento DESC) AS rn
        FROM evento_pesajes ep
        JOIN eventos e ON e.id = ep.evento_id
        WHERE ep.animal_id = p_animal_id
          AND ep.tipo = 'individual'
          AND e.anulado = FALSE
        ORDER BY e.fecha_evento DESC
        LIMIT 2
    )
    SELECT
        CASE
            WHEN (max(CASE WHEN rn=1 THEN fecha_evento END) -
                  max(CASE WHEN rn=2 THEN fecha_evento END)) = 0
            THEN NULL
            ELSE round(
                (max(CASE WHEN rn=1 THEN peso_kg END) -
                 max(CASE WHEN rn=2 THEN peso_kg END)) /
                (max(CASE WHEN rn=1 THEN fecha_evento END) -
                 max(CASE WHEN rn=2 THEN fecha_evento END)) * 1000, 2)
        END AS gdp_g_dia,
        max(CASE WHEN rn=2 THEN peso_kg END) AS peso_anterior,
        (max(CASE WHEN rn=1 THEN fecha_evento END) -
         max(CASE WHEN rn=2 THEN fecha_evento END))::INTEGER AS dias_intervalo
    FROM ultimos_dos
    HAVING count(*) = 2;
$$;

CREATE OR REPLACE FUNCTION seed_categorias_establecimiento(p_establecimiento_id UUID)
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO categorias (establecimiento_id, nombre, coeficiente_ug) VALUES
        (p_establecimiento_id, 'ternero',      0.30),
        (p_establecimiento_id, 'ternera',      0.30),
        (p_establecimiento_id, 'novillo',      0.70),
        (p_establecimiento_id, 'vaquillona',   0.70),
        (p_establecimiento_id, 'vaca',         1.00),
        (p_establecimiento_id, 'vaca_con_cria',1.20),
        (p_establecimiento_id, 'toro',         1.20),
        (p_establecimiento_id, 'buey',         1.00)
    ON CONFLICT (establecimiento_id, nombre) DO NOTHING;
$$;

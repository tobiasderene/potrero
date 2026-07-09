"""replace_eventos_rule_with_trigger_allow_anular

Revision ID: 5fd86a36622a
Revises: 0001
Create Date: 2026-07-09 16:11:08.546024

"""
from typing import Sequence, Union

from alembic import op


revision: str = '5fd86a36622a'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La regla anterior bloqueaba TODO update en eventos (DO INSTEAD NOTHING),
    # lo que impide marcar anulado=TRUE desde la aplicación.
    # La reemplazamos con un trigger que solo permite cambiar anulado FALSE→TRUE.
    op.execute("DROP RULE IF EXISTS eventos_no_update ON eventos")
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_eventos_inmutables()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Único UPDATE permitido: anulado FALSE → TRUE sin tocar otros campos
            IF NEW.anulado = TRUE AND OLD.anulado = FALSE
               AND NEW.tipo              = OLD.tipo
               AND NEW.fecha_evento      = OLD.fecha_evento
               AND NEW.usuario_id        = OLD.usuario_id
               AND (NEW.observaciones    IS NOT DISTINCT FROM OLD.observaciones)
               AND (NEW.corregido_por_id IS NOT DISTINCT FROM OLD.corregido_por_id)
               AND (NEW.es_correccion_de_id IS NOT DISTINCT FROM OLD.es_correccion_de_id)
            THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Los eventos son inmutables (RN-15). Solo se permite anular (anulado=TRUE).';
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_eventos_inmutables
            BEFORE UPDATE ON eventos
            FOR EACH ROW
            EXECUTE FUNCTION fn_eventos_inmutables();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_eventos_inmutables ON eventos")
    op.execute("DROP FUNCTION IF EXISTS fn_eventos_inmutables()")
    op.execute("""
        CREATE RULE eventos_no_update AS
            ON UPDATE TO eventos DO INSTEAD NOTHING
    """)

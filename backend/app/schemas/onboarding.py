from pydantic import BaseModel


class OnboardingProgreso(BaseModel):
    tiene_potreros: bool
    tiene_categorias: bool
    tiene_lotes: bool
    tiene_animales: bool
    porcentaje: int

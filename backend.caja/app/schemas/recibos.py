from pydantic import BaseModel, Field


class ReciboDetalle(BaseModel):
    accountCode: str
    description: str
    amount: float = Field(gt=0)


class ReciboCreate(BaseModel):
    customerCode: str | None = None
    lines: list[ReciboDetalle] = Field(min_length=1, max_length=5)
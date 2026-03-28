from pydantic import BaseModel, Field


class ColumnSchema(BaseModel):
    name: str
    data_type: str = Field(default="")


class TableSchema(BaseModel):
    name: str
    columns: list[ColumnSchema]


class SchemaResponse(BaseModel):
    tables: list[TableSchema]

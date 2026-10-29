export const initialCategories = [
  ["food", "Alimentación"],
  ["housing", "Vivienda"],
  ["transport", "Transporte"],
  ["health", "Salud"],
  ["education", "Educación"],
  ["leisure", "Ocio"],
  ["clothing_personal_care", "Ropa y cuidado personal"],
  ["other", "Otros"],
  ["house_construction", "Casa Nueva"],
  ["mother", "Mama"],
  ["onix_fuel", "Onix - Nafta"],
  ["onix_other", "Onix - Otros"],
  ["natura", "Natura"],
  ["nutrients", "Nutrientes"],
  ["amanita", "Amanita"],
  ["ute", "UTE"],
  ["antel_internet", "ANTEL - Internet"],
  ["antel_mobile", "ANTEL - celular"],
  ["ose_country_house", "OSE Casa de campo"],
  ["facu", "Facu"],
  ["manual_adjustment", "Ajuste manual"],
] as const;

export type InitialCategoryKey = (typeof initialCategories)[number][0];

export type CategoryView = {
  id: string;
  name: string;
  systemKey: InitialCategoryKey | null;
  archivedAt?: Date | null;
};

export function validateCategoryName(
  input: unknown,
):
  { ok: true; value: { name: string } } | { ok: false; error: "INVALID_NAME" } {
  const value = typeof input === "object" && input !== null ? input : {};
  const name =
    "name" in value && typeof value.name === "string" ? value.name.trim() : "";
  if (name.length === 0 || name.length > 80) {
    return { ok: false, error: "INVALID_NAME" };
  }
  return { ok: true, value: { name } };
}

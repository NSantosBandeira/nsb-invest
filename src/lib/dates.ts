/**
 * Interpreta YYYY-MM-DD do input type="date" como dia civil no fuso de Brasília.
 * Evita que 26/05 vire 25/05 ao salvar em UTC.
 */
export function parseCalendarDateInput(value: string): Date {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00-03:00`);
  }
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return new Date(`${br[3]}-${m}-${d}T12:00:00-03:00`);
  }
  return new Date(trimmed);
}

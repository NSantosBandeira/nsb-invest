import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { PRESET_INSTITUTIONS } from "@/lib/institutions/presets";

type Institution = { id: string; name: string };

type InstitutionSelectProps = {
  institutions: Institution[];
  name?: string;
  defaultValue?: string;
  label?: string;
  id?: string;
};

export function InstitutionSelect({
  institutions,
  name = "institutionId",
  defaultValue = "none",
  label = "Instituição",
  id,
}: InstitutionSelectProps) {
  const presetSet = new Set(
    PRESET_INSTITUTIONS.map((p) => p.toLowerCase()),
  );
  const custom = institutions.filter(
    (i) => !presetSet.has(i.name.toLowerCase()),
  );
  const presets = institutions.filter((i) =>
    presetSet.has(i.name.toLowerCase()),
  );

  const sortByPresetOrder = (a: Institution, b: Institution) => {
    const ia = PRESET_INSTITUTIONS.findIndex(
      (p) => p.toLowerCase() === a.name.toLowerCase(),
    );
    const ib = PRESET_INSTITUTIONS.findIndex(
      (p) => p.toLowerCase() === b.name.toLowerCase(),
    );
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  };

  presets.sort(sortByPresetOrder);
  custom.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect name={name} id={id} defaultValue={defaultValue}>
        <option value="none">Nenhuma</option>
        {presets.length > 0 && (
          <optgroup label="Mais usadas">
            {presets.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        )}
        {custom.length > 0 && (
          <optgroup label="Outras">
            {custom.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        )}
      </NativeSelect>
    </div>
  );
}

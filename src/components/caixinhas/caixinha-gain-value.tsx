import { GainValue } from "@/components/ganhos/gain-value";

export function CaixinhaGainValue({
  value,
  isEstimated,
}: {
  value: number;
  isEstimated?: boolean;
}) {
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <GainValue value={value} />
      {isEstimated && (
        <span className="text-[0.65rem] font-normal text-muted-foreground" title="Estimativa pelo CDI">
          est.
        </span>
      )}
    </span>
  );
}

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatMoneyDigits,
  moneyToDigits,
  parseMoneyDigitsToNumber,
  pastedTextToMoneyDigits,
} from "@/lib/money";

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange" | "name"
> & {
  name: string;
  defaultValue?: string | number;
};

export function CurrencyInput({
  name,
  id,
  defaultValue,
  className,
  required,
  placeholder = "0,00",
  ...props
}: CurrencyInputProps) {
  const initialDigits = moneyToDigits(defaultValue ?? "");
  const [digits, setDigits] = React.useState(initialDigits);

  const display = formatMoneyDigits(digits);
  const hiddenValue = digits ? parseMoneyDigitsToNumber(digits).toFixed(2) : "";

  function updateFromRaw(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, 14);
    setDigits(next);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateFromRaw(e.target.value);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    updateFromRaw(pastedTextToMoneyDigits(pasted));
  }

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={hiddenValue}
        required={required}
      />
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={cn(className)}
        aria-required={required}
        {...props}
      />
    </>
  );
}

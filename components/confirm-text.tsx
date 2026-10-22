import { Fragment } from "react";
import { CONFIRM } from "@/lib/content/sobre";

// Texto com marcações "[CONFIRMAR]" destacadas (dados que dependem da empresa real; ver lib/content/sobre.ts).
export function ConfirmText({ text }: { text: string }) {
  const parts = text.split(CONFIRM);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <mark className="rounded bg-[#b94f01]/10 px-1 text-[0.85em] font-semibold text-[#8a3a00]">{CONFIRM}</mark>
          )}
        </Fragment>
      ))}
    </>
  );
}

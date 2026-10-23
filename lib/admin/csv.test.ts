import { describe, expect, it } from "vitest";
import { centsToDecimal, csvDateTime, dayBoundary, toCsv } from "./csv";

describe("CSV do painel", () => {
  it("BOM, ponto e vírgula, CRLF, aspas e proteção contra fórmula", () => {
    const csv = toCsv(["a", "b"], [["x;y", '=HYPERLINK("z")'], [true, null]]);
    expect(csv.startsWith("﻿a;b\r\n")).toBe(true);
    expect(csv).toContain('"x;y";"\'=HYPERLINK(""z"")"');
    expect(csv).toContain("sim;\r\n");
  });

  it("vírgula decimal sem milhar", () => {
    expect(centsToDecimal(123456)).toBe("1234,56");
    expect(centsToDecimal(5)).toBe("0,05");
    expect(centsToDecimal(-250)).toBe("-2,50");
    expect(centsToDecimal(null)).toBe("0,00");
  });

  it("datas em São Paulo e limites do período", () => {
    expect(csvDateTime("2026-10-23T02:30:00Z")).toBe("2026-10-22 23:30");
    expect(dayBoundary("2026-10-22")).toBe("2026-10-22T03:00:00.000Z");
    expect(dayBoundary("2026-10-22", true)).toBe("2026-10-23T03:00:00.000Z");
    expect(dayBoundary("22/10/2026")).toBeNull();
  });
});

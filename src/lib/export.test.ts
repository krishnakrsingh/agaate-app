import { describe, expect, it } from "vitest";
import { escapeCsvCell, generateCsvString } from "./export";

describe("CSV Export Utility", () => {
  it("escapes cells containing commas and quotes properly", () => {
    expect(escapeCsvCell("Simple")).toBe("Simple");
    expect(escapeCsvCell(123.45)).toBe("123.45");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell("Tomatoes, Grade A")).toBe('"Tomatoes, Grade A"');
    expect(escapeCsvCell('Said "Hello" to farmer')).toBe('"Said ""Hello"" to farmer"');
  });

  it("generates full RFC 4180 CSV strings with CRLF endings", () => {
    const headers = ["Date", "Item", "Amount"];
    const rows = [
      ["2026-09-08", "NPK 19-19-19", 4500],
      ["2026-09-09", "Labour, Weeding", 1200],
    ];

    const result = generateCsvString(headers, rows);
    const lines = result.split("\r\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Date,Item,Amount");
    expect(lines[1]).toBe("2026-09-08,NPK 19-19-19,4500");
    expect(lines[2]).toBe('2026-09-09,"Labour, Weeding",1200');
  });
});

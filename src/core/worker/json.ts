import { readFileSync } from "node:fs";

export const MAX_JSON_BYTES = 256 * 1024;

type JsonPathSegment = string | number;

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface StrictJsonDocument {
  readonly value: JsonValue;
  readonly integerPaths: ReadonlySet<string>;
  readonly positiveIntegerPaths: ReadonlySet<string>;
}

export class StrictJsonError extends Error {}

export function pathKey(path: readonly JsonPathSegment[]): string {
  return JSON.stringify(path);
}

function isJsonWhitespace(codeUnit: number): boolean {
  return codeUnit === 0x20 || codeUnit === 0x09 || codeUnit === 0x0a || codeUnit === 0x0d;
}

function isHexDigit(codeUnit: number): boolean {
  return (
    (codeUnit >= 0x30 && codeUnit <= 0x39) ||
    (codeUnit >= 0x41 && codeUnit <= 0x46) ||
    (codeUnit >= 0x61 && codeUnit <= 0x66)
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ScanResult {
  readonly duplicateKey: string | undefined;
  readonly integerPaths: ReadonlySet<string>;
  readonly positiveIntegerPaths: ReadonlySet<string>;
}

class StrictJsonScanner {
  private index = 0;
  private duplicateKey: string | undefined;
  private readonly integerPaths = new Set<string>();
  private readonly positiveIntegerPaths = new Set<string>();

  public constructor(private readonly text: string) {}

  public scan(): ScanResult {
    this.skipWhitespace();
    this.parseValue([]);
    this.skipWhitespace();
    if (this.index !== this.text.length) this.syntax("unexpected trailing data");
    return {
      duplicateKey: this.duplicateKey,
      integerPaths: this.integerPaths,
      positiveIntegerPaths: this.positiveIntegerPaths,
    };
  }

  private parseValue(path: readonly JsonPathSegment[]): void {
    this.skipWhitespace();
    const character = this.text[this.index];
    switch (character) {
      case "{":
        this.parseObject(path);
        return;
      case "[":
        this.parseArray(path);
        return;
      case '"':
        this.scanString();
        return;
      case "t":
        this.parseLiteral("true");
        return;
      case "f":
        this.parseLiteral("false");
        return;
      case "n":
        this.parseLiteral("null");
        return;
      case "N":
        this.rejectConstant("NaN");
        return;
      case "I":
        this.rejectConstant("Infinity");
        return;
      case "-":
        if (this.text.startsWith("-Infinity", this.index)) this.rejectConstant("-Infinity");
        this.parseNumber(path);
        return;
      default:
        if (character !== undefined && character >= "0" && character <= "9") {
          this.parseNumber(path);
          return;
        }
        this.syntax("unexpected token");
    }
  }

  private parseObject(path: readonly JsonPathSegment[]): void {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();
    if (this.text[this.index] === "}") {
      this.index += 1;
      return;
    }

    while (true) {
      if (this.text[this.index] !== '"') this.syntax("object keys must be strings");
      const key = this.scanString();
      if (keys.has(key)) {
        if (this.duplicateKey === undefined) this.duplicateKey = key;
      } else {
        keys.add(key);
      }
      this.skipWhitespace();
      if (this.text[this.index] !== ":") this.syntax("object key must be followed by a colon");
      this.index += 1;
      this.parseValue([...path, key]);
      this.skipWhitespace();
      if (this.text[this.index] === "}") {
        this.index += 1;
        return;
      }
      if (this.text[this.index] !== ",") this.syntax("object entries must be comma-separated");
      this.index += 1;
      this.skipWhitespace();
      if (this.text[this.index] === "}") this.syntax("trailing object comma");
    }
  }

  private parseArray(path: readonly JsonPathSegment[]): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.text[this.index] === "]") {
      this.index += 1;
      return;
    }

    let index = 0;
    while (true) {
      this.parseValue([...path, index]);
      index += 1;
      this.skipWhitespace();
      if (this.text[this.index] === "]") {
        this.index += 1;
        return;
      }
      if (this.text[this.index] !== ",") this.syntax("array entries must be comma-separated");
      this.index += 1;
      this.skipWhitespace();
      if (this.text[this.index] === "]") this.syntax("trailing array comma");
    }
  }

  private scanString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.text.length) {
      const codeUnit = this.text.charCodeAt(this.index);
      if (codeUnit === 0x22) {
        this.index += 1;
        const raw = this.text.slice(start, this.index);
        try {
          return JSON.parse(raw) as string;
        } catch (error) {
          this.syntax(errorMessage(error));
        }
      }
      if (codeUnit === 0x5c) {
        this.index += 1;
        if (this.index >= this.text.length) this.syntax("unterminated escape");
        const escape = this.text.charCodeAt(this.index);
        if (escape === 0x75) {
          for (let offset = 1; offset <= 4; offset += 1) {
            if (!isHexDigit(this.text.charCodeAt(this.index + offset))) this.syntax("invalid Unicode escape");
          }
          this.index += 5;
          continue;
        }
        if (![0x22, 0x2f, 0x5c, 0x62, 0x66, 0x6e, 0x72, 0x74].includes(escape)) {
          this.syntax("invalid escape");
        }
        this.index += 1;
        continue;
      }
      if (codeUnit < 0x20) this.syntax("unescaped control character in string");
      this.index += 1;
    }
    this.syntax("unterminated string");
  }

  private parseLiteral(literal: string): void {
    if (!this.text.startsWith(literal, this.index)) this.syntax("invalid literal");
    this.index += literal.length;
  }

  private parseNumber(path: readonly JsonPathSegment[]): void {
    const start = this.index;
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(this.text.slice(start));
    if (match === null) this.syntax("invalid number");
    const lexeme = match[0];
    this.index += lexeme.length;
    if (!/[.eE]/.test(lexeme)) {
      const key = pathKey(path);
      this.integerPaths.add(key);
      if (lexeme !== "0" && !lexeme.startsWith("-")) this.positiveIntegerPaths.add(key);
    }
  }

  private rejectConstant(constant: string): never {
    throw new StrictJsonError(`invalid JSON constant: ${constant}`);
  }

  private skipWhitespace(): void {
    while (this.index < this.text.length && isJsonWhitespace(this.text.charCodeAt(this.index))) this.index += 1;
  }

  private syntax(message: string): never {
    throw new StrictJsonError(`${message} at position ${this.index}`);
  }
}

export function parseStrictJson(bytes: Uint8Array): StrictJsonDocument {
  if (bytes.byteLength > MAX_JSON_BYTES) throw new StrictJsonError("input exceeds the canonical size limit");

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new StrictJsonError("invalid UTF-8");
  }

  const scan = new StrictJsonScanner(text).scan();
  let value: JsonValue;
  try {
    value = JSON.parse(text) as JsonValue;
  } catch (error) {
    throw new StrictJsonError(errorMessage(error));
  }
  if (scan.duplicateKey !== undefined) throw new StrictJsonError(`duplicate object key: ${scan.duplicateKey}`);
  return {
    value,
    integerPaths: scan.integerPaths,
    positiveIntegerPaths: scan.positiveIntegerPaths,
  };
}

export function loadJson(source: string, label: "brief" | "result"): StrictJsonDocument {
  let bytes: Uint8Array;
  try {
    bytes = source === "-" ? readFileSync(0) : readFileSync(source);
  } catch (error) {
    throw new Error(`${label} file could not be read: ${errorMessage(error)}`);
  }
  if (bytes.byteLength > MAX_JSON_BYTES) {
    throw new Error(`${label === "brief" ? "worker briefing" : "worker result"} exceeds the canonical size limit`);
  }
  try {
    return parseStrictJson(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid unambiguous JSON: ${errorMessage(error)}`);
  }
}

export function isPositiveIntegerAt(
  document: StrictJsonDocument,
  value: JsonValue,
  path: readonly JsonPathSegment[],
): boolean {
  return typeof value === "number" && document.integerPaths.has(pathKey(path)) && document.positiveIntegerPaths.has(pathKey(path));
}

export function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

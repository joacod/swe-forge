import { isJsonObject, type JsonObject, type JsonValue } from "./json";

export function fail(message: string): never {
  throw new Error(message);
}

export function hasOwnField(value: JsonObject, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function comparePythonStrings(left: string, right: string): number {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftCodePoint = left.codePointAt(leftIndex) as number;
    const rightCodePoint = right.codePointAt(rightIndex) as number;
    if (leftCodePoint !== rightCodePoint) return leftCodePoint < rightCodePoint ? -1 : 1;
    leftIndex += leftCodePoint > 0xffff ? 2 : 1;
    rightIndex += rightCodePoint > 0xffff ? 2 : 1;
  }
  if (leftIndex === left.length && rightIndex === right.length) return 0;
  return leftIndex === left.length ? -1 : 1;
}

export function unknownFields(value: JsonObject, allowed: readonly string[]): string[] {
  const allowedFields = new Set(allowed);
  return Object.keys(value)
    .filter((key) => !allowedFields.has(key))
    .sort(comparePythonStrings);
}

export function objectWithKeys(
  value: JsonValue,
  label: string,
  required: readonly string[],
  optional: readonly string[] = [],
): JsonObject {
  if (!isJsonObject(value)) fail(`${label} must be an object`);
  const unknown = unknownFields(value, [...required, ...optional]);
  if (unknown.length > 0) fail(`${label} contains unknown field: ${unknown[0]}`);
  for (const key of required) {
    if (!hasOwnField(value, key)) fail(`${label} is missing ${key}`);
  }
  return value;
}

function isPythonWhitespace(codePoint: number): boolean {
  return (
    (codePoint >= 0x09 && codePoint <= 0x0d) ||
    (codePoint >= 0x1c && codePoint <= 0x20) ||
    codePoint === 0x85 ||
    codePoint === 0xa0 ||
    codePoint === 0x1680 ||
    (codePoint >= 0x2000 && codePoint <= 0x200a) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    codePoint === 0x202f ||
    codePoint === 0x205f ||
    codePoint === 0x3000
  );
}

function hasNonWhitespace(value: string): boolean {
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index) as number;
    if (!isPythonWhitespace(codePoint)) return true;
    index += codePoint > 0xffff ? 2 : 1;
  }
  return false;
}

export function safeString(value: JsonValue, label: string): string {
  if (typeof value !== "string" || !hasNonWhitespace(value)) fail(`${label} must be a non-empty string`);
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index) as number;
    if (codePoint < 32 || codePoint === 127) fail(`${label} contains a control character`);
    index += codePoint > 0xffff ? 2 : 1;
  }
  return value;
}

export function stringList(value: JsonValue, label: string, minimum = 0): string[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (value.length < minimum) fail(`${label} must contain at least one item`);
  return value.map((item) => safeString(item, `${label} item`));
}

export function enumValue<T extends string>(value: JsonValue, choices: readonly T[], label: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) fail(`invalid ${label}: ${String(value)}`);
  return value as T;
}

export function actionSet(value: readonly string[], expected: readonly string[], label: string): void {
  const unique = new Set(value);
  if (unique.size !== value.length || unique.size !== expected.length || !expected.every((item) => unique.has(item))) {
    fail(`${label} do not match the canonical worker boundary`);
  }
}

export function requiredStringArray(value: JsonValue, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must contain at least one item`);
  return value.map((item) => safeString(item, `${label} item`));
}

export function optionalStringArray(value: JsonValue | undefined, label: string): void {
  if (value === undefined || value === null) return;
  requiredStringArray(value, label);
}

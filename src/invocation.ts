export type DeliveryMode = "GUIDED" | "PR";
export type InputStatus = "COMPLETE" | "EMPTY" | "INCOMPLETE";

export interface NormalizedInvocation {
  raw_arguments: string;
  parsed_ticket: string;
  delivery_mode: DeliveryMode;
  input_status: InputStatus;
}

function isInvocationWhitespace(codeUnit: number): boolean {
  return (
    codeUnit === 0x20 ||
    codeUnit === 0x09 ||
    codeUnit === 0x0a ||
    codeUnit === 0x0d ||
    codeUnit === 0x0c ||
    codeUnit === 0x0b
  );
}

function trimLeadingWhitespace(value: string): string {
  let start = 0;
  while (start < value.length && isInvocationWhitespace(value.charCodeAt(start))) start += 1;
  return value.slice(start);
}

function trimTrailingWhitespace(value: string): string {
  let end = value.length;
  while (end > 0 && isInvocationWhitespace(value.charCodeAt(end - 1))) end -= 1;
  return value.slice(0, end);
}

function tokenEnd(value: string): number {
  let end = 0;
  while (end < value.length && !isInvocationWhitespace(value.charCodeAt(end))) end += 1;
  return end;
}

export function parseInvocation(rawArguments: string): NormalizedInvocation {
  const trimmedInput = trimLeadingWhitespace(rawArguments);
  if (trimmedInput === "") {
    return {
      raw_arguments: rawArguments,
      parsed_ticket: "",
      delivery_mode: "PR",
      input_status: "EMPTY",
    };
  }

  const firstTokenEnd = tokenEnd(trimmedInput);
  const firstToken = trimmedInput.slice(0, firstTokenEnd);
  const remainder = trimmedInput.slice(firstTokenEnd);

  if (firstToken === "guided" || firstToken === "pr") {
    const parsedTicket = trimTrailingWhitespace(trimLeadingWhitespace(remainder));
    return {
      raw_arguments: rawArguments,
      parsed_ticket: parsedTicket,
      delivery_mode: firstToken === "guided" ? "GUIDED" : "PR",
      input_status: parsedTicket === "" ? "INCOMPLETE" : "COMPLETE",
    };
  }

  const parsedTicket = trimTrailingWhitespace(trimLeadingWhitespace(rawArguments));
  return {
    raw_arguments: rawArguments,
    parsed_ticket: parsedTicket,
    delivery_mode: "PR",
    input_status: "COMPLETE",
  };
}

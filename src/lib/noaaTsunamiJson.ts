function repairTrailingDecimalNumbers(value: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    result += character;

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character !== "." || !/\d/.test(value[index - 1] ?? "")) continue;
    let nextIndex = index + 1;
    while (/\s/.test(value[nextIndex] ?? "")) nextIndex += 1;
    if ([",", "}", "]"].includes(value[nextIndex] ?? "")) result += "0";
  }

  return result;
}

export function normalizeNoaaTsunamiJson(value: string): string {
  const unwrapped = value.trim()
    .replace(/^\(/, "")
    .replace(/\);?$/, "")
    .replace(/,\s*([}\]])/g, "$1");
  return repairTrailingDecimalNumbers(unwrapped);
}

export function parseNoaaTsunamiJson<T>(value: string): T {
  return JSON.parse(normalizeNoaaTsunamiJson(value)) as T;
}

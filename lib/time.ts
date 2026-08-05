export const CHINA_TIME_ZONE = "Asia/Shanghai";

type TimeInput = Date | string | number;

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: CHINA_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function toDate(value: TimeInput) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid timestamp");
  return date;
}

function parts(value: TimeInput, formatter: Intl.DateTimeFormat) {
  return Object.fromEntries(
    formatter
      .formatToParts(toDate(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function formatChinaDateTime(value: TimeInput = new Date()) {
  const valueParts = parts(value, dateTimeFormatter);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day} ${valueParts.hour}:${valueParts.minute}`;
}

export function formatChinaDate(value: TimeInput = new Date()) {
  const valueParts = parts(value, dateFormatter);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}`;
}

export function formatChinaDateCode(value: TimeInput = new Date()) {
  return formatChinaDate(value).slice(2).replaceAll("-", "");
}

export function formatChinaLongDate(value: TimeInput = new Date()) {
  return longDateFormatter.format(toDate(value));
}

export function parseChinaDateTime(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const explicitDate = new Date(normalized);
    return Number.isNaN(explicitDate.getTime()) ? null : explicitDate;
  }

  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText = "0", minuteText = "0", secondText = "0"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;

  const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  const expected = `${yearText}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")} ${hourText.padStart(2, "0")}:${minuteText.padStart(2, "0")}`;
  return formatChinaDateTime(date) === expected ? date : null;
}

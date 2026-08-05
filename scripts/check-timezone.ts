import {
  CHINA_TIME_ZONE,
  formatChinaDate,
  formatChinaDateCode,
  formatChinaDateTime,
  parseChinaDateTime,
} from "../lib/time";

const utcReviewTime = new Date("2026-08-03T02:10:13.067Z");
const chinaMidnightBoundary = new Date("2026-08-03T16:30:00.000Z");
const parsedChinaTime = parseChinaDateTime("2026-08-03 10:10");

const status = {
  timeZone: CHINA_TIME_ZONE,
  utcToChinaMatched: formatChinaDateTime(utcReviewTime) === "2026-08-03 10:10",
  chinaDateMatched: formatChinaDate(utcReviewTime) === "2026-08-03",
  dateBoundaryMatched: formatChinaDateCode(chinaMidnightBoundary) === "260804",
  chinaInputParsedAsUtc: parsedChinaTime?.toISOString() === "2026-08-03T02:10:00.000Z",
  invalidInputRejected: parseChinaDateTime("2026-02-30 10:10") === null,
};

console.log(JSON.stringify(status));
if (!Object.entries(status).filter(([key]) => key !== "timeZone").every(([, value]) => value === true)) {
  process.exitCode = 1;
}

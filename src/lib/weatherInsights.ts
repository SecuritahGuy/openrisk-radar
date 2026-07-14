import type { HourlyWeatherPeriod } from "../services/weather";

function timeLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString("en-US", { hour: "numeric" });
}

export function buildWeatherInsights(hourly: HourlyWeatherPeriod[]): string[] {
  const next = hourly.slice(0, 24);
  if (next.length === 0) return [];
  const insights: string[] = [];

  const wet = next.filter((period) => (period.precipitationChance ?? 0) >= 40);
  if (wet.length > 0) {
    const peak = wet.reduce((best, period) =>
      (period.precipitationChance ?? 0) > (best.precipitationChance ?? 0) ? period : best
    );
    insights.push(
      `Precipitation becomes likely around ${timeLabel(wet[0].startTime)}; peak chance ${Math.round(peak.precipitationChance ?? 0)}% around ${timeLabel(peak.startTime)}.`
    );
  }

  const gustPeriods = next.filter((period) => period.windGust != null);
  if (gustPeriods.length > 0) {
    const peak = gustPeriods.reduce((best, period) =>
      (period.windGust ?? 0) > (best.windGust ?? 0) ? period : best
    );
    if ((peak.windGust ?? 0) >= 20) {
      insights.push(`Strongest gusts: ${Math.round(peak.windGust ?? 0)} mph around ${timeLabel(peak.startTime)}.`);
    }
  }

  const temperatures = next.map((period) => period.temperature);
  const swing = Math.max(...temperatures) - Math.min(...temperatures);
  if (swing >= 15) {
    insights.push(`Temperature changes by about ${Math.round(swing)}° over the next 24 hours.`);
  }

  return insights;
}

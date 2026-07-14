import { cachedPublicProxy, jsonError, type PagesContext } from "../../_shared/proxy";

const COUNTRY_SLUGS = new Set([
  "andorra", "austria", "belgium", "bosnia-herzegovina", "bulgaria", "croatia",
  "cyprus", "czechia", "denmark", "estonia", "finland", "france", "germany",
  "greece", "hungary", "iceland", "ireland", "israel", "italy", "latvia",
  "lithuania", "luxembourg", "malta", "moldova", "montenegro", "netherlands",
  "norway", "poland", "portugal", "republic-of-north-macedonia", "romania",
  "serbia", "slovakia", "slovenia", "spain", "sweden", "switzerland",
  "ukraine", "united-kingdom",
]);

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const country = new URL(request.url).searchParams.get("country")?.toLowerCase() ?? "";
  if (!COUNTRY_SLUGS.has(country)) {
    return jsonError({
      code: "INVALID_COUNTRY",
      message: "A supported Meteoalarm country is required",
      provider: "Meteoalarm",
      status: 400,
    });
  }

  return cachedPublicProxy(
    request,
    new URL(`https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${country}`),
    300,
    "*/*",
    "Meteoalarm"
  );
}

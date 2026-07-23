import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalSummaryPanel } from "../components/update/SignalSummaryPanel";
import { normalize, type GvpProperties } from "../services/gvp";

const volcano: GvpProperties = {
  Volcano_Number: "332010",
  Volcano_Name: "Kilauea",
  Primary_Volcano_Type: "Shield",
  Volcanic_Landform: "Shield volcano",
  Last_Eruption_Year: "2026",
  Country: "United States",
  Region: "Hawaii and Pacific Ocean",
  Subregion: "Hawaiian Islands",
  Latitude: "19.421",
  Longitude: "-155.287",
  Elevation: "1247",
  Tectonic_Setting: "Intraplate / Hotspot",
  Geologic_Epoch: "Holocene",
  Evidence_Category: "Eruption Dated",
  Major_Rock_Type: "Basalt / Picro-Basalt",
};

describe("GVP baseline presentation", () => {
  it("labels the record as historical and outside current risk", () => {
    const html = renderToStaticMarkup(
      <SignalSummaryPanel
        weatherAlerts={[]}
        earthquakes={[]}
        wildfires={[]}
        spcOutlooks={[]}
        spcReports={[]}
        nhcStorms={[]}
        gdacsEvents={[]}
        eonetEvents={[]}
        emscEvents={[]}
        geonetEvents={[]}
        geonetVolcanoEvents={[]}
        dwdEvents={[]}
        supplementalSignals={[]}
        baselineSignals={[normalize(volcano)]}
        isFetching={false}
      />
    );

    expect(html).toContain('data-testid="volcano-baseline-context"');
    expect(html).toContain("Nearby baseline context");
    expect(html).toContain("not current activity alerts");
    expect(html).toContain("do not affect risk posture or background notifications");
    expect(html).toContain("Kilauea");
    expect(html).toContain("Smithsonian GVP record");
  });
});

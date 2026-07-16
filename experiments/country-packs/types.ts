// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Research scaffold for country-intelligence packs.
// Reuses core types from the state-packs experiment.

import type {
  Capability,
  OutputModel,
  AccessType,
  SourceFormat,
  SourceStatus,
} from "../state-packs/types.ts";

export type { Capability, OutputModel, AccessType, SourceFormat, SourceStatus };

export interface CountrySourceDefinition {
  id: string;
  authority: string;
  coverage: {
    countries: string[];
    regions?: string[];
    gridZone?: string;
  };
  capability: Capability;
  outputModel: OutputModel;
  access: AccessType;
  format: SourceFormat;
  endpoint: string;
  refreshSeconds: number;
  proxyRequired: boolean;
  attribution: string;
  termsUrl: string;
  status: SourceStatus;
  notes?: string;
}

export interface CountryIntelligencePack {
  country: string;
  name: string;
  sources: CountrySourceDefinition[];
}

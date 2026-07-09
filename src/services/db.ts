import Dexie, { type Table } from "dexie";
import type { Location } from "../types/location";

export class OpenRiskDB extends Dexie {
  locations!: Table<Location, string>;

  constructor() {
    super("OpenRiskRadar");
    this.version(1).stores({
      locations: "&id, city, state, label, createdAt",
    });
  }
}

export const db = new OpenRiskDB();

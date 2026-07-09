import { v4 as uuidv4 } from "uuid";

export function newLocationId(): string {
  return `loc_${uuidv4().slice(0, 8)}`;
}

export function newEventId(): string {
  return `evt_${uuidv4().slice(0, 8)}`;
}

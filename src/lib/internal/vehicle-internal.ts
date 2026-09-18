import "server-only";

/**
 * INTERNAL-ONLY vehicle records: cost, VIN, private notes. This module is
 * guarded by `server-only`, so importing it from a client component fails the
 * build instead of shipping the data to browsers.
 *
 * Nothing public may read from here. Values are unknown for the demo fleet.
 */
export interface VehicleInternal {
  vehicleId: string;
  vin: string | null;
  acquisitionCost: number | null;
  privateNotes: string | null;
}

const internalRecords: VehicleInternal[] = [
  "awc-101",
  "awc-102",
  "awc-103",
  "awc-104",
  "awc-105",
  "awc-106",
].map((vehicleId) => ({ vehicleId, vin: null, acquisitionCost: null, privateNotes: null }));

export function getVehicleInternal(vehicleId: string): VehicleInternal | undefined {
  return internalRecords.find((r) => r.vehicleId === vehicleId);
}

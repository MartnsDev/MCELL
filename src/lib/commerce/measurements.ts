type Measurements = { weight_g: number; height_cm: number; width_cm: number; length_cm: number };
export function hasShippingMeasurements(value: Measurements) {
  return [value.weight_g,value.height_cm,value.width_cm,value.length_cm].every(n=>Number.isSafeInteger(n) && n>0);
}

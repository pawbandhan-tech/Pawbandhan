export const VEHICLE_RULES = {
  dog: { small: '2-wheeler', medium: '2-wheeler', large: '4-wheeler' },
  cat: { default: '2-wheeler' },
  rabbit: { default: '2-wheeler' },
  bird: { default: '2-wheeler' },
  goat: { default: '4-wheeler' },
  sheep: { default: '4-wheeler' },
  pig: { default: '4-wheeler' },
  monkey: { default: '4-wheeler' },
  cow: { default: 'truck' },
  buffalo: { default: 'truck' },
  horse: { default: 'truck' },
  donkey: { default: 'truck' },
  snake: { default: '4-wheeler' },
  other: { default: '4-wheeler' },
};

export function getRecommendedVehicle(animalType, size) {
  const rules = VEHICLE_RULES[animalType?.toLowerCase()] || VEHICLE_RULES.other;
  if (size && rules[size]) return rules[size];
  return rules.default || '4-wheeler';
}

export function getVehicleLabel(vehicleType) {
  const labels = {
    '2-wheeler': 'Bike with Carrier',
    '4-wheeler': 'Van / Auto',
    'truck': 'Truck / Large Vehicle',
  };
  return labels[vehicleType] || vehicleType;
}

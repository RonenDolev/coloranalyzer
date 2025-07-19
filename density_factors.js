// density_factors.js

export function getDensityFactor(channel, densityValue) {
  switch (channel) {
    case 'K':
      if (densityValue < 1.5) return 13.0;
      if (densityValue < 1.65) return 12.0;
      if (densityValue < 1.75) return 11.0;
      return 10.0; // דנסיטי גבוה
    case 'Y':
      if (densityValue < 0.8) return 8.0;
      if (densityValue < 1.0) return 7.5;
      return 7.0;
    case 'C':
    case 'M':
      if (densityValue < 1.2) return 9.0;
      if (densityValue < 1.35) return 8.7;
      return 8.5;
    default:
      return 8.5;
  }
}

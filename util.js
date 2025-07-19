// util.js

export const channels = ['C', 'M', 'Y', 'K', 'O', 'V', 'G'];
export const tonePercents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// מחשב DeltaE2000 בין שני ערכי LAB
export function deltaE2000(lab1, lab2) {
  let { L: L1, a: a1, A: A1, b: b1, B: B1 } = lab1;
  let { L: L2, a: a2, A: A2, b: b2, B: B2 } = lab2;

  a1 = (a1 !== undefined) ? a1 : A1;
  b1 = (b1 !== undefined) ? b1 : B1;
  a2 = (a2 !== undefined) ? a2 : A2;
  b2 = (b2 !== undefined) ? b2 : B2;

  // CIEDE2000 calculations
  const avg_L = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avg_C = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avg_C, 7) / (Math.pow(avg_C, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const avg_Cp = (C1p + C2p) / 2;

  const h1p = ((Math.atan2(b1, a1p) * 180 / Math.PI) + 360) % 360;
  const h2p = ((Math.atan2(b2, a2p) * 180 / Math.PI) + 360) % 360;

  let deltahp;
  if (C1p * C2p === 0) {
    deltahp = 0;
  } else if (Math.abs(h1p - h2p) <= 180) {
    deltahp = h2p - h1p;
  } else {
    deltahp = (h2p <= h1p) ? h2p - h1p + 360 : h2p - h1p - 360;
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((deltahp * Math.PI / 180) / 2);

  const avg_Lp = (L1 + L2) / 2;
  const avg_Cpp = (C1p + C2p) / 2;

  let avghp;
  if (C1p * C2p === 0) {
    avghp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) > 180) {
    avghp = (h1p + h2p + 360) / 2;
  } else {
    avghp = (h1p + h2p) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((avghp - 30) * Math.PI / 180) +
    0.24 * Math.cos((2 * avghp) * Math.PI / 180) +
    0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180) -
    0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);

  const deltaRo = 30 * Math.exp(-(((avghp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Math.pow(avg_Cpp, 7) / (Math.pow(avg_Cpp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * ((avg_Lp - 50) ** 2)) / Math.sqrt(20 + ((avg_Lp - 50) ** 2));
  const Sc = 1 + 0.045 * avg_Cpp;
  const Sh = 1 + 0.015 * avg_Cpp * T;
  const Rt = -Math.sin(2 * deltaRo * Math.PI / 180) * Rc;

  const deltaE = Math.sqrt(
    (deltaLp / Sl) ** 2 +
    (deltaCp / Sc) ** 2 +
    (deltaHp / Sh) ** 2 +
    Rt * (deltaCp / Sc) * (deltaHp / Sh)
  );

  return deltaE;
}

// מאפשר ייבוא בשם deltaE
export const deltaE = deltaE2000;

// פונקציה: שליפת ערכי LAB מתוך localStorage (שנה לפי הצורך שלך)
export function getMeasuredLabFromInputs(channel, percent) {
  // דוגמת שליפה - עדכן לפי איך שאתה שומר את הערכים!
  const l = parseFloat(localStorage.getItem(`lab_${channel}_${percent}_l`));
  const a = parseFloat(localStorage.getItem(`lab_${channel}_${percent}_a`));
  const b = parseFloat(localStorage.getItem(`lab_${channel}_${percent}_b`));
  if (isNaN(l) || isNaN(a) || isNaN(b)) return null;
  return { L: l, a, b };
}

// פונקציה: חישוב Dot Area אידיאלי מה־LAB (דוגמה - עדכן לפי הצורך שלך)
export function getTargetDotAreaFromLab(targetLab, channel, standard) {
  if (targetLab && typeof targetLab.dotArea === "number") return targetLab.dotArea;
  return null;
}

import json
from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color

def cmyk_to_rgb(c, m, y, k):
    r = 255 * (1 - c / 100) * (1 - k / 100)
    g = 255 * (1 - m / 100) * (1 - k / 100)
    b = 255 * (1 - y / 100) * (1 - k / 100)
    return int(r), int(g), int(b)

def generate_lab_from_cmyk(pantone):
    cmyk = pantone.get("cmyk", {})
    c = cmyk.get("C", 0)
    m = cmyk.get("M", 0)
    y = cmyk.get("Y", 0)
    k = cmyk.get("K", 0)
    r, g, b = cmyk_to_rgb(c, m, y, k)

    rgb_color = sRGBColor(r / 255, g / 255, b / 255)
    lab_color = convert_color(rgb_color, LabColor)

    return {
        "L": round(lab_color.lab_l, 2),
        "A": round(lab_color.lab_a, 2),
        "B": round(lab_color.lab_b, 2)
    }

# Load input
with open("pantoneDB.json", "r", encoding="utf-8") as f:
    pantone_data = json.load(f)

# Update records
for p in pantone_data:
    lab = p.get("lab", {})
    if lab.get("L") is None or lab.get("A") is None or lab.get("B") is None:
        p["lab"] = generate_lab_from_cmyk(p)

# Save output
with open("pantoneDB_with_LAB.json", "w", encoding="utf-8") as f:
    json.dump(pantone_data, f, ensure_ascii=False, indent=2)

print("✔️ LAB values generated and saved to pantoneDB_with_LAB.json")

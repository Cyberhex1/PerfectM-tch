/**
 * Approximate price tier for a brand's foundations (US retail, rough guide).
 * 1 = drugstore (under ~$20), 2 = mid ($20–40), 3 = prestige ($40–60), 4 = luxury ($60+)
 */
export const BRAND_TIERS = {
  // 1 — drugstore / budget
  "Almay": 1, "Catrice": 1, "ColourPop": 1, "CoverGirl": 1, "e.l.f. Cosmetics": 1, "Essence": 1,
  "FLOWER Beauty": 1, "L'Oréal": 1, "L.A. Girl": 1, "Makeup Revolution": 1, "Maybelline": 1,
  "Milani": 1, "NYX Professional Makeup": 1, "Physicians Formula": 1, "Revlon": 1, "Wet n Wild": 1,
  "The Ordinary": 1, "ULTA": 1, "J.Cat Beauty": 1, "Burt's Bees": 1, "Pacifica": 1, "Black Up": 2,
  "SEPHORA COLLECTION": 1, "Exa": 2, "florence by mills": 1, "Morphe": 1, "KIKO Milano": 1,
  // 2 — mid
  "Beauty Bakerie": 2, "BLK/OPL": 1, "Au Naturale": 2, "Bite Beauty": 2, "Dose Of Colors": 2,
  "Elcie Cosmetics": 2, "Juvia's Place": 2, "Ofra Cosmetics": 2, "UOMA Beauty": 2, "Winky Lux": 2,
  "ZOEVA": 2, "W3LL PEOPLE": 2, "Juice Beauty": 2, "PÜR": 2, "LORAC": 2, "Hynt Beauty": 2,
  "Pretty Vulgar": 2, "Jouer Cosmetics": 2, "Wander Beauty": 2, "LAWLESS": 2, "Antonym": 2,
  "Rare Beauty by Selena Gomez": 2, "MILK MAKEUP": 2, "Tarte": 2, "Too Faced": 2,
  "Urban Decay Cosmetics": 2, "Smashbox": 2, "KVD Vegan Beauty": 2, "Benefit Cosmetics": 2,
  "Origins": 2, "boscia": 2, "beautyblender": 2, "COOLA": 2, "Erborian": 2, "VDL": 2,
  "MAC": 2, "FENTY BEAUTY by Rihanna": 2, "HUDA BEAUTY": 3, "Anastasia Beverly Hills": 2,
  "It Cosmetics": 2, "bareMinerals": 2, "NUDESTIX": 2, "Kosas": 3, "ILIA": 3, "rms beauty": 3,
  "COVER FX": 2, "Josie Maran": 2, "Dermablend": 2, "Marc Jacobs Beauty": 3,
  // 3 — prestige
  "BECCA Cosmetics": 3, "Clinique": 2, "Estée Lauder": 3, "Lancôme": 3, "Laura Mercier": 3,
  "NARS": 3, "HOURGLASS": 3, "MAKE UP FOR EVER": 3, "Bobbi Brown": 3, "Shiseido": 3,
  "Charlotte Tilbury": 3, "Dr. Jart+": 3, "Natasha Denona": 3, "KEVYN AUCOIN": 3,
  "Koh Gen Do": 3, "surratt beauty": 3, "lilah b.": 3, "Dr. Dennis Gross Skincare": 3,
  "jane iredale": 3, "PAT McGRATH LABS": 4, "Perricone MD": 3, "Smith & Cult": 3, "SMITH & CULT": 3,
  "AMOREPACIFIC": 4,
  // 4 — luxury
  "Armani Beauty": 4, "Dior": 3, "Gucci": 4, "Yves Saint Laurent": 4, "TOM FORD": 4, "La Mer": 4,
  "Guerlain": 4, "Givenchy": 4,
};

// Iterated combat candidate, frozen with each measurement.
export const RULES = {
  "label": "round2-soft-counter",
  "elements": true,
  "advantage": 1.08,
  "disadvantage": 0.92,
  "burnLayer": 3,
  "burnTurns": 2,
  "burnDefense": true,
  "intentPower": 7,
  "edgePower": 10,
  "brokenMultiplier": 1.15,
  "coldPower": 18,
  "chainPower": 8,
  "waterCleanse": 1,
  "parasitePower": 6,
  "anchorReaction": true,
  "secondShield": 0,
  "stats": {
    "sword": {
      "hp": 220,
      "magical": 32
    },
    "earth": {
      "physical": 32,
      "magical": 36
    }
  },
  "skills": {
    "sword": {
      "swift": {
        "power": 28
      },
      "strike": {
        "power": 50
      },
      "guard": {
        "shield": 20,
        "intent": 1
      }
    },
    "water": {
      "waterbolt": {
        "power": 28
      },
      "frost": {
        "power": 22
      },
      "repulse": {
        "power": 18
      },
      "gather": {
        "setupShield": 8
      },
      "surge": {
        "power": 32,
        "tidePower": 18
      },
      "waterwall": {
        "shield": 22
      },
      "rinse": {
        "heal": 18
      }
    },
    "wood": {
      "wooddart": {
        "power": 28
      },
      "cultivate": {
        "setupShield": 8
      },
      "bloomstrike": {
        "power": 30,
        "growthPower": 18
      },
      "bloomguard": {
        "shield": 14,
        "growthShield": 12
      },
      "bloomheal": {
        "heal": 12,
        "growthHeal": 10,
        "clearBurn": 2
      },
      "reap": {
        "power": 30,
        "parasitePower": 18
      }
    },
    "earth": {
      "stonebolt": {
        "power": 28
      },
      "foundation": {
        "setupShield": 12
      },
      "rampart": {
        "terrainShield": 12
      },
      "landbreak": {
        "power": 34,
        "terrainPower": 18
      },
      "mountain": {
        "power": 72,
        "terrainPower": 18
      },
      "earthenwall": {
        "shield": 22
      },
      "anchor": {
        "kind": "reaction",
        "ap": 0
      }
    },
    "fire": {
      "blaze": {
        "power": 42
      }
    }
  },
  "loadouts": {
    "water": {
      "cold": [
        "waterbolt",
        "frost",
        "repulse",
        "gather",
        "waterwall",
        "rinse"
      ],
      "tidal": [
        "waterbolt",
        "gather",
        "surge",
        "waterwall",
        "rinse",
        "ebb"
      ]
    },
    "wood": {
      "parasitic": [
        "wooddart",
        "parasite",
        "reap",
        "cultivate",
        "bloomheal",
        "prune"
      ]
    },
    "earth": {
      "bastion": [
        "stonebolt",
        "foundation",
        "rampart",
        "landbreak",
        "anchor",
        "quakesunder"
      ]
    }
  },
  "reactionRange": true,
  "burnScore": true
};

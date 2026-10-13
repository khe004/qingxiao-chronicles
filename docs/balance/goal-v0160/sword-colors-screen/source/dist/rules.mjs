// Isolated numerical candidate.
export const RULES = {
  "label": "v0.16.0-j",
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
  "purifyHeal": 8,
  "parasitePower": 4,
  "anchorReaction": true,
  "secondShield": 8,
  "stats": {
    "sword": {
      "hp": 220,
      "magical": 32,
      "gen": {
        "metal": 4,
        "water": 1
      }
    },
    "earth": {
      "physical": 32,
      "magical": 34
    },
    "wood": {
      "hp": 225,
      "physical": 28,
      "magical": 34
    }
  },
  "skills": {
    "sword": {
      "swift": {
        "power": 30
      },
      "strike": {
        "power": 50
      },
      "guard": {
        "shield": 18,
        "intent": 0
      },
      "riposte": {
        "shield": 16,
        "intent": 1
      },
      "cleave": {
        "power": 46
      },
      "lunge": {
        "power": 40
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
        "setupShield": 8,
        "cost": {
          "any": 1
        }
      },
      "surge": {
        "power": 32,
        "tidePower": 12,
        "consumeTide": 3,
        "range": [
          0,
          1,
          2
        ],
        "farPrep": "tide"
      },
      "waterwall": {
        "shield": 22
      },
      "rinse": {
        "heal": 16,
        "clearBurn": 1
      },
      "tidespear": {
        "power": 52
      },
      "icebreaker": {
        "cost": {
          "water": 1,
          "any": 1
        },
        "power": 30,
        "chillPower": 16
      }
    },
    "wood": {
      "wooddart": {
        "power": 31
      },
      "cultivate": {
        "setupShield": 12
      },
      "bloomstrike": {
        "power": 30,
        "growthPower": 18,
        "range": [
          0,
          1,
          2
        ],
        "farPrep": "growth"
      },
      "bloomguard": {
        "shield": 14,
        "growthShield": 12
      },
      "bloomheal": {
        "cost": {
          "wood": 2
        },
        "heal": 16,
        "growthHeal": 6,
        "clearBurn": 1
      },
      "reap": {
        "power": 30,
        "parasitePower": 18,
        "range": [
          0,
          1,
          2
        ],
        "farPrep": "parasite",
        "shieldPierce": 0.25
      },
      "parasite": {
        "initialPower": 2
      }
    },
    "earth": {
      "stonebolt": {
        "power": 36
      },
      "foundation": {
        "setupShield": 8
      },
      "rampart": {
        "terrainShield": 14
      },
      "landbreak": {
        "power": 32,
        "terrainPower": 14
      },
      "mountain": {
        "power": 58,
        "terrainPower": 14
      },
      "earthenwall": {
        "shield": 22
      },
      "anchor": {
        "kind": "reaction",
        "ap": 0
      },
      "earthmend": {
        "clearBurn": 2
      },
      "gravel": {
        "power": 20
      }
    },
    "fire": {
      "blaze": {
        "power": 42
      },
      "nourish": {
        "heal": 18
      },
      "sproutguard": {
        "shield": 20
      }
    },
    "flame": {
      "eruption": {
        "power": 44,
        "breakPrep": true,
        "breakPrepAmount": 1
      },
      "firestorm": {
        "power": 48
      },
      "flare": {
        "power": 24
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
        "earthenwall",
        "quakesunder"
      ]
    }
  },
  "reactionRange": true,
  "burnScore": true,
  "bastionShield": 12,
  "mountainBonus": 6,
  "unparasiteCost": 2
};

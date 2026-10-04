// Isolated v0.13 proposal candidate.
export const RULES = {
  "label": "proposal-stats-original-loadouts",
  "elements": true,
  "advantage": 1.15,
  "disadvantage": 0.85,
  "burnLayer": 3,
  "burnTurns": 2,
  "burnDefense": true,
  "intentPower": 6,
  "edgePower": 8,
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
        "power": 46
      },
      "guard": {
        "shield": 20,
        "intent": 0
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
    }
  },
  "loadouts": {}
};

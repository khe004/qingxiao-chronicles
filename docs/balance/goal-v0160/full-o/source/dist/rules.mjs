// Isolated numerical candidate.
export const RULES = {
  "label": "v0.16.0-o",
  "elements": true,
  "advantage": 1.08,
  "disadvantage": 0.92,
  "burnLayer": 3,
  "burnTurns": 2,
  "burnDefense": true,
  "intentPower": 7,
  "edgePower": 12,
  "brokenMultiplier": 1.15,
  "coldPower": 18,
  "chainPower": 8,
  "waterCleanse": 1,
  "purifyHeal": 8,
  "parasitePower": 4,
  "anchorReaction": true,
  "secondShield": 18,
  "stats": {
    "sword": {
      "hp": 220,
      "magical": 32,
      "gen": {
        "metal": 3,
        "water": 1,
        "any": 1
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
        "power": 28
      },
      "strike": {
        "power": 40,
        "cost": {
          "metal": 1,
          "water": 1,
          "any": 1
        }
      },
      "guard": {
        "shield": 20,
        "intent": 1
      },
      "riposte": {
        "shield": 16,
        "intent": 1
      },
      "cleave": {
        "power": 46
      },
      "lunge": {
        "power": 48
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
        "setupShield": 6,
        "cost": {
          "any": 1
        }
      },
      "surge": {
        "power": 30,
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
        "power": 56,
        "shieldPierce": 0.35,
        "cost": {
          "water": 2,
          "any": 1
        }
      },
      "icebreaker": {
        "cost": {
          "water": 1,
          "any": 1
        },
        "power": 34,
        "chillPower": 18,
        "shieldPierce": 0.35
      }
    },
    "wood": {
      "wooddart": {
        "power": 32
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
        "heal": 18,
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
        "power": 28
      },
      "foundation": {
        "setupShield": 8
      },
      "rampart": {
        "terrainShield": 14
      },
      "landbreak": {
        "power": 30,
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
        "clearBurn": 1,
        "heal": 4,
        "terrainHeal": 5
      },
      "gravel": {
        "power": 20,
        "cost": {
          "earth": 1,
          "any": 1
        },
        "breakPrep": true,
        "breakPrepAmount": 1
      },
      "quakesunder": {
        "power": 26,
        "shieldPierce": 0.25,
        "range": [
          0,
          1,
          2
        ],
        "desc": "支付1土气与1任意气，造成26基础土伤，25%越过护盾，仍受防御与五行减免；破除1地势或2生长，不打断；1行动，全距。"
      }
    },
    "fire": {
      "blaze": {
        "power": 42
      },
      "nourish": {
        "heal": 16
      },
      "sproutguard": {
        "shield": 18
      },
      "heal": {
        "cost": {
          "wood": 1,
          "any": 1
        },
        "once": true,
        "desc": "恢复18气血，清除自身至多5层灼烧；每回合一次。"
      },
      "inferno": {
        "power": 72
      },
      "spark": {
        "power": 28
      }
    },
    "flame": {
      "eruption": {
        "power": 46,
        "breakPrep": true,
        "breakPrepAmount": 1
      },
      "firestorm": {
        "power": 44
      },
      "flare": {
        "power": 26
      },
      "ashenward": {
        "shield": 18,
        "reflect": 14,
        "desc": "获得18护盾，准备2次反击，每次至多14基础火伤，至下次自身阶段到期；每回合一次，不递归反伤。"
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
  "mountainBonus": 4,
  "unparasiteCost": 2
};

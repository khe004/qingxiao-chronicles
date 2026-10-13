// Isolated numerical candidate.
export const RULES = {
  "label": "v0.16.0-bm",
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
  "secondShield": 9,
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
        "power": 32
      },
      "strike": {
        "power": 44,
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
        "shield": 20,
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
        "power": 22
      },
      "gather": {
        "setupShield": 6,
        "cost": {
          "any": 1
        }
      },
      "surge": {
        "power": 36,
        "tidePower": 10,
        "consumeTide": 3,
        "range": [
          0,
          1,
          2
        ],
        "farPrep": "tide"
      },
      "waterwall": {
        "shield": 36,
        "cost": {
          "water": 2
        },
        "desc": "获得36护盾，有潮势时消费1层再增加12；总盾上限60。"
      },
      "rinse": {
        "heal": 12,
        "clearBurn": 2,
        "cost": {
          "water": 1,
          "any": 1
        }
      },
      "tidespear": {
        "power": 36,
        "shieldPierce": 0.35,
        "cost": {
          "water": 2,
          "any": 1
        },
        "ap": 1,
        "interrupt": true,
        "tag": "潮势打断"
      },
      "icebreaker": {
        "cost": {
          "water": 1,
          "any": 1
        },
        "power": 32,
        "chillPower": 22,
        "shieldPierce": 0.6
      },
      "mirrorwater": {
        "reflect": 14,
        "reflectHits": 2,
        "shield": 10,
        "desc": "获得10护盾；消费至多1潮势，准备2次反击，每次14基础水伤加每潮势8，至下次自身阶段到期；每回合一次，不递归反伤。"
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
        "power": 40,
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
        "power": 46,
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
        "power": 30
      },
      "foundation": {
        "setupShield": 8
      },
      "rampart": {
        "terrainShield": 14
      },
      "landbreak": {
        "power": 26,
        "terrainPower": 12
      },
      "mountain": {
        "power": 54,
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
        "clearBurn": 3,
        "heal": 4,
        "terrainHeal": 5
      },
      "gravel": {
        "power": 16,
        "cost": {
          "any": 1
        },
        "breakPrep": true,
        "breakPrepAmount": 1
      },
      "stoneback": {
        "reflect": 18,
        "shield": 10
      }
    },
    "fire": {
      "blaze": {
        "power": 42
      },
      "nourish": {
        "heal": 20,
        "cost": {
          "wood": 2,
          "any": 1
        }
      },
      "sproutguard": {
        "shield": 20
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
        "power": 68,
        "cost": {
          "fire": 3,
          "wood": 1,
          "any": 1
        }
      },
      "spark": {
        "power": 28
      }
    },
    "flame": {
      "eruption": {
        "power": 50,
        "breakPrep": true,
        "breakPrepAmount": 1
      },
      "firestorm": {
        "power": 38,
        "cost": {
          "fire": 3,
          "any": 2
        },
        "ap": 1,
        "once": true
      },
      "flare": {
        "power": 26
      },
      "cinder": {
        "power": 26,
        "cost": {
          "fire": 2
        }
      },
      "ashenward": {
        "shield": 14,
        "reflect": 12,
        "desc": "获得14护盾，准备2次反击，每次至多12基础火伤，至下次自身阶段到期；每回合一次，不递归反伤。"
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
  "bastionShield": 8,
  "mountainBonus": 4,
  "unparasiteCost": 2,
  "majorHp": {
    "fire": {
      "ignite": 230,
      "sustain": 235
    },
    "flame": {
      "fierce": 210,
      "smolder": 225
    },
    "water": {
      "tidal": 205,
      "cold": 204
    },
    "wood": {
      "parasitic": 220,
      "symbiosis": 215
    },
    "earth": {
      "mountain": 224,
      "bastion": 225
    },
    "sword": {
      "quick": 225
    }
  }
};

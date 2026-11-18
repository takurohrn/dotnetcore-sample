// このファイルは scripts/build-parts.ts が assets/parts/*.svg から生成します。直接編集しないでください。
export interface PartShape {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const PART_SHAPES: Record<string, PartShape[]> = {
  "eye1": [
    {
      "d": "M8 50 A42 42 0 1 0 92 50 A42 42 0 1 0 8 50 Z",
      "fill": "#ffffff",
      "stroke": "#22252b",
      "strokeWidth": 5
    },
    {
      "d": "M36 52 A20 20 0 1 0 76 52 A20 20 0 1 0 36 52 Z",
      "fill": "#22252b"
    },
    {
      "d": "M57 43 A7 7 0 1 0 71 43 A7 7 0 1 0 57 43 Z",
      "fill": "#ffffff"
    }
  ],
  "eye2": [
    {
      "d": "M4 50 A46 30 0 1 0 96 50 A46 30 0 1 0 4 50 Z",
      "fill": "#f6c443",
      "stroke": "#22252b",
      "strokeWidth": 5
    },
    {
      "d": "M42 50 A8 27 0 1 0 58 50 A8 27 0 1 0 42 50 Z",
      "fill": "#22252b"
    }
  ],
  "eye3": [
    {
      "d": "M4 30 L96 52 Q84 90 50 88 Q14 84 4 30 Z",
      "fill": "#ffffff",
      "stroke": "#22252b",
      "strokeWidth": 5
    },
    {
      "d": "M37 62 A15 15 0 1 0 67 62 A15 15 0 1 0 37 62 Z",
      "fill": "#c8362e"
    },
    {
      "d": "M46 62 A6 6 0 1 0 58 62 A6 6 0 1 0 46 62 Z",
      "fill": "#22252b"
    }
  ],
  "fang": [
    {
      "d": "M24 8 L76 8 Q68 60 50 96 Q32 60 24 8 Z",
      "fill": "#ffffff",
      "stroke": "#22252b",
      "strokeWidth": 5
    }
  ],
  "flame": [
    {
      "d": "M6 50 Q36 8 96 22 Q70 38 98 50 Q70 60 96 80 Q36 92 6 50 Z",
      "fill": "#ef7d22",
      "stroke": "#b9461a",
      "strokeWidth": 4
    },
    {
      "d": "M16 50 Q38 28 70 34 Q54 44 72 50 Q54 56 70 66 Q38 72 16 50 Z",
      "fill": "#fbd648"
    }
  ],
  "horn1": [
    {
      "d": "M18 95 Q22 34 74 4 Q60 50 64 95 Z",
      "fill": "#f3ead2",
      "stroke": "#22252b",
      "strokeWidth": 5
    },
    {
      "d": "M30 70 Q42 64 58 70 M36 46 Q46 42 58 47",
      "stroke": "#b9a983",
      "strokeWidth": 4
    }
  ],
  "horn2": [
    {
      "d": "M50 96 L50 56 L24 22 M50 56 L80 16 M36 38 L14 44 M66 35 L90 42",
      "stroke": "#8a5a2b",
      "strokeWidth": 10
    }
  ],
  "orb": [
    {
      "d": "M8 50 A42 42 0 1 0 92 50 A42 42 0 1 0 8 50 Z",
      "fill": "#3fa7a0",
      "stroke": "#1c5a57",
      "strokeWidth": 5
    },
    {
      "d": "M23 50 A27 27 0 1 0 77 50 A27 27 0 1 0 23 50 Z",
      "stroke": "#bfe9e4",
      "strokeWidth": 3
    },
    {
      "d": "M26 34 A11 7 0 1 0 48 34 A11 7 0 1 0 26 34 Z",
      "fill": "#ffffff"
    }
  ],
  "whisker": [
    {
      "d": "M6 30 Q36 6 56 44 Q70 72 96 62",
      "stroke": "#d9a520",
      "strokeWidth": 7
    },
    {
      "d": "M6 30 Q30 30 44 62 Q54 86 80 90",
      "stroke": "#d9a520",
      "strokeWidth": 5
    }
  ],
  "wing": [
    {
      "d": "M4 92 Q18 30 94 6 Q82 34 94 56 Q76 50 70 72 Q56 58 46 80 Q34 68 4 92 Z",
      "fill": "#a3352c",
      "stroke": "#22252b",
      "strokeWidth": 5
    },
    {
      "d": "M4 92 Q40 50 94 6 M4 92 Q40 66 70 72 M4 92 Q30 76 46 80",
      "stroke": "#22252b",
      "strokeWidth": 3
    }
  ]
};

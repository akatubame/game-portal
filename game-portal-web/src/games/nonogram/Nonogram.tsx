import { Eye, Grid3X3, Paintbrush, RotateCcw, Sparkles, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { RankingPanel, useRanking } from "../ranking";
import type { NonogramCell, NonogramPuzzle, NonogramRecord, NonogramStatus, NonogramTool } from "./types";

type NonogramProps = {
  onBack: () => void;
};

type DragState = {
  active: boolean;
  startRow: number;
  startColumn: number;
  nextCell: NonogramCell;
  lastKey: string;
};

const RECORD_KEY = "game-shelf-nonogram-record";

const puzzles: NonogramPuzzle[] = [
  {
    id: "heart5",
    name: "ハート",
    sizeLabel: "5x5",
    difficulty: "入門",
    solution: [
      [false, true, false, true, false],
      [true, true, true, true, true],
      [true, true, true, true, true],
      [false, true, true, true, false],
      [false, false, true, false, false]
    ]
  },
  {
    id: "fish8",
    name: "魚",
    sizeLabel: "8x8",
    difficulty: "やさしめ",
    solution: [
      [false, false, false, true, true, false, false, false],
      [false, false, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, false],
      [true, true, false, true, true, true, true, true],
      [true, true, true, true, true, true, false, true],
      [false, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, false, false],
      [false, false, false, true, true, false, false, false]
    ]
  },
  {
    id: "house10",
    name: "家",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, false, false, true, true, false, false],
      [false, false, true, true, false, false, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false]
    ]
  },
  {
    id: "cat10",
    name: "猫",
    sizeLabel: "10x10",
    difficulty: "試作",
    solution: [
      [true, false, false, false, false, false, false, false, false, true],
      [true, true, false, false, false, false, false, false, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, false, true, true, true, true, false, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, true, false, true, true, false, true, true, true],
      [false, true, true, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, false, false, false, false, true, false, false],
      [false, true, true, false, false, false, false, true, true, false]
    ]
  },
  {
    id: "rocket10",
    name: "ロケット",
    sizeLabel: "10x10",
    difficulty: "試作",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, false, true, false, false, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, false, true, true, false, true, true, false],
      [true, true, false, false, true, true, false, false, true, true],
      [true, false, false, false, true, true, false, false, false, true],
      [false, false, false, true, false, false, true, false, false, false]
    ]
  },
  {
    id: "star8",
    name: "星",
    sizeLabel: "8x8",
    difficulty: "やさしめ",
    solution: [
      [false, false, false, true, true, false, false, false],
      [false, false, false, true, true, false, false, false],
      [true, true, true, true, true, true, true, true],
      [false, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, false, false],
      [false, true, true, false, false, true, true, false],
      [true, true, false, false, false, false, true, true],
      [true, false, false, false, false, false, false, true]
    ]
  },
  {
    id: "tree10",
    name: "木",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false]
    ]
  },
  {
    id: "umbrella10",
    name: "傘",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, false, true, true, false, true, true, false, true],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, false, false, false, false]
    ]
  },
  {
    id: "car10",
    name: "車",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, false, false, false, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, false, false, false, false, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, false, true, true, true, true, false, true, true],
      [false, true, true, false, false, false, false, true, true, false],
      [false, false, true, true, false, false, true, true, false, false],
      [false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "coffee12",
    name: "コーヒー",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, true, false, false, true, false, false, true, false, false],
      [false, false, false, false, true, false, false, true, false, false, false, false],
      [false, true, true, true, true, true, true, true, false, false, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, false, true, true, false],
      [false, true, true, true, true, true, true, true, false, true, true, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, true, false, false, false],
      [false, false, false, true, true, true, true, true, false, false, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "key12",
    name: "鍵",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, true, true, true, true, false, false, false, false, false, false],
      [false, true, true, false, false, true, true, false, false, false, false, false],
      [true, true, false, false, false, false, true, true, false, false, false, false],
      [true, true, false, false, false, false, true, true, true, true, true, true],
      [true, true, false, false, false, false, true, true, false, false, true, false],
      [false, true, true, false, false, true, true, false, false, false, true, true],
      [false, false, true, true, true, true, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "music12",
    name: "音符",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, false, false, true, true, true, true, false, false, false],
      [false, false, false, false, false, true, false, false, true, false, false, false],
      [false, false, false, false, false, true, false, false, true, false, false, false],
      [false, false, false, false, false, true, false, false, true, false, false, false],
      [false, false, false, false, false, true, false, false, true, false, false, false],
      [false, false, false, false, false, true, false, false, true, false, false, false],
      [false, false, false, true, true, true, false, false, true, false, false, false],
      [false, false, true, true, true, true, false, true, true, true, false, false],
      [false, false, true, true, true, false, false, true, true, true, false, false],
      [false, false, false, true, false, false, false, false, true, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "butterfly10",
    name: "蝶",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [true, true, false, false, true, true, false, false, true, true],
      [true, true, true, false, true, true, false, true, true, true],
      [false, true, true, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, false],
      [true, true, true, false, true, true, false, true, true, true],
      [true, true, false, false, true, true, false, false, true, true]
    ]
  },
  {
    id: "crown10",
    name: "王冠",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [true, false, false, false, true, true, false, false, false, true],
      [true, true, false, true, true, true, true, false, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [false, true, true, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, false, true, true, false, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "cactus10",
    name: "サボテン",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, true, true, false, true, true, false, true, true, false],
      [false, true, true, false, true, true, false, true, true, false],
      [false, true, true, true, true, true, true, true, true, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false]
    ]
  },
  {
    id: "boat12",
    name: "船",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, false, false, true, false, false, false, false, false, false],
      [false, false, false, false, true, true, true, false, false, false, false, false],
      [false, false, false, true, true, true, true, true, false, false, false, false],
      [false, false, false, false, false, true, false, false, false, false, false, false],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, false, false, false, false, false, false, false, false],
      [false, true, false, true, false, true, false, true, false, true, false, false],
      [true, true, true, true, true, true, true, true, true, true, true, false]
    ]
  },
  {
    id: "apple12",
    name: "りんご",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, false, false, true, true, false, false, false, false, false],
      [false, false, false, false, true, true, false, false, false, false, false, false],
      [false, false, false, true, true, true, true, true, false, false, false, false],
      [false, false, true, true, true, true, true, true, true, false, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, true, false, false, false],
      [false, false, false, true, true, true, true, true, false, false, false, false],
      [false, false, false, false, true, true, true, false, false, false, false, false],
      [false, false, false, false, false, true, false, false, false, false, false, false]
    ]
  },
  {
    id: "camera12",
    name: "カメラ",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, true, true, true, true, false, false, false, false, false],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [true, true, false, false, true, true, true, true, false, false, true, true],
      [true, true, false, true, true, false, false, true, true, false, true, true],
      [true, true, true, true, false, false, false, false, true, true, true, true],
      [true, true, true, true, false, false, false, false, true, true, true, true],
      [true, true, false, true, true, false, false, true, true, false, true, true],
      [true, true, false, false, true, true, true, true, false, false, true, true],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [false, false, false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "diamond12",
    name: "ダイヤ",
    sizeLabel: "12x12",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, false, true, true, false, false, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true, true, true, true, true, true],
      [false, true, true, true, true, true, true, true, true, true, true, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, false, false, true, true, false, false, false, false, false]
    ]
  },
  {
    id: "bell10",
    name: "ベル",
    sizeLabel: "10x10",
    difficulty: "やさしめ",
    solution: [
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, true, true, true, true, true, true, false],
      [false, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, true, true, true, true, true, true, true, true],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, false, false, false, false]
    ]
  },
  {
    id: "mushroom10",
    name: "きのこ",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, true, true, false, true, true, false, true, true, false],
      [true, true, true, true, true, true, true, true, true, true],
      [true, true, false, true, true, true, true, false, true, true],
      [false, false, false, false, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, false, false]
    ]
  },
  {
    id: "anchor12",
    name: "アンカー",
    sizeLabel: "12x12",
    difficulty: "試作",
    solution: [
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, true, true, false, false, true, true, false, false, false],
      [false, false, false, true, true, false, false, true, true, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, false, false, true, true, false, false, false, false, false],
      [false, false, false, false, false, true, true, false, false, false, false, false],
      [true, false, false, false, false, true, true, false, false, false, false, true],
      [true, true, false, false, false, true, true, false, false, false, true, true],
      [false, true, true, false, false, true, true, false, false, true, true, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false]
    ]
  },
  {
    id: "flower10",
    name: "花",
    sizeLabel: "10x10",
    difficulty: "やさしめ",
    solution: [
      [false, false, false, true, true, true, true, false, false, false],
      [false, false, true, true, false, false, true, true, false, false],
      [false, true, true, false, true, true, false, true, true, false],
      [true, true, false, true, true, true, true, false, true, true],
      [true, false, true, true, true, true, true, true, false, true],
      [true, false, true, true, true, true, true, true, false, true],
      [true, true, false, true, true, true, true, false, true, true],
      [false, true, true, false, true, true, false, true, true, false],
      [false, false, true, true, false, false, true, true, false, false],
      [false, false, false, true, true, true, true, false, false, false]
    ]
  },
  {
    id: "flag10",
    name: "旗",
    sizeLabel: "10x10",
    difficulty: "やさしめ",
    solution: [
      [true, true, true, true, true, true, true, false, false, false],
      [true, true, true, true, true, true, true, true, false, false],
      [true, true, true, true, true, true, true, true, true, false],
      [true, true, true, true, true, true, true, true, false, false],
      [true, true, true, true, true, true, true, false, false, false],
      [true, true, false, false, false, false, false, false, false, false],
      [true, true, false, false, false, false, false, false, false, false],
      [true, true, false, false, false, false, false, false, false, false],
      [true, true, false, false, false, false, false, false, false, false],
      [true, true, true, true, false, false, false, false, false, false]
    ]
  },
  {
    id: "glasses10",
    name: "メガネ",
    sizeLabel: "10x10",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, false, false, false, false, false, false],
      [false, true, true, true, false, false, true, true, true, false],
      [true, true, false, true, true, true, true, false, true, true],
      [true, false, false, false, true, true, false, false, false, true],
      [true, false, false, false, true, true, false, false, false, true],
      [true, true, false, true, true, true, true, false, true, true],
      [false, true, true, true, false, false, true, true, true, false],
      [false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false],
      [false, false, false, false, false, false, false, false, false, false]
    ]
  },
  {
    id: "lightbulb12",
    name: "電球",
    sizeLabel: "12x12",
    difficulty: "ふつう",
    solution: [
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, true, true, true, true, true, true, true, true, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, true, true, false, false, true, true, false, false, false],
      [false, false, false, true, true, true, true, true, true, false, false, false],
      [false, false, false, false, true, true, true, true, false, false, false, false]
    ]
  }
];

function readRecord(): NonogramRecord {
  const stored = window.localStorage.getItem(RECORD_KEY);
  return stored ? (JSON.parse(stored) as NonogramRecord) : {};
}

function createEmptyGrid(puzzle: NonogramPuzzle): NonogramCell[][] {
  return puzzle.solution.map((row) => row.map(() => "unknown"));
}

function getLineHints(line: boolean[]) {
  const hints: number[] = [];
  let count = 0;

  line.forEach((filled) => {
    if (filled) {
      count += 1;
      return;
    }

    if (count > 0) {
      hints.push(count);
      count = 0;
    }
  });

  if (count > 0) {
    hints.push(count);
  }

  return hints.length > 0 ? hints : [0];
}

function isSolved(grid: NonogramCell[][], solution: boolean[][]) {
  return grid.every((row, rowIndex) =>
    row.every((cell, columnIndex) => {
      if (solution[rowIndex][columnIndex]) {
        return cell === "filled";
      }

      return cell !== "filled";
    })
  );
}

function countFilled(solution: boolean[][]) {
  return solution.flat().filter(Boolean).length;
}

function isLineComplete(cells: NonogramCell[], solution: boolean[]) {
  return cells.every((cell, index) => {
    if (solution[index]) {
      return cell === "filled";
    }

    return cell !== "filled";
  });
}

function applyAutoMarks(grid: NonogramCell[][], solution: boolean[][]) {
  const nextGrid = grid.map((row) => [...row]);
  const rows = solution.length;
  const columns = solution[0].length;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    if (!isLineComplete(nextGrid[rowIndex], solution[rowIndex])) {
      continue;
    }

    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      if (!solution[rowIndex][columnIndex] && nextGrid[rowIndex][columnIndex] === "unknown") {
        nextGrid[rowIndex][columnIndex] = "marked";
      }
    }
  }

  for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
    const columnCells = Array.from({ length: rows }, (_, rowIndex) => nextGrid[rowIndex][columnIndex]);
    const columnSolution = Array.from({ length: rows }, (_, rowIndex) => solution[rowIndex][columnIndex]);

    if (!isLineComplete(columnCells, columnSolution)) {
      continue;
    }

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      if (!solution[rowIndex][columnIndex] && nextGrid[rowIndex][columnIndex] === "unknown") {
        nextGrid[rowIndex][columnIndex] = "marked";
      }
    }
  }

  return nextGrid;
}

function getToolCell(tool: NonogramTool): NonogramCell {
  return tool === "fill" ? "filled" : "marked";
}

function getLineTargets(startRow: number, startColumn: number, endRow: number, endColumn: number) {
  const targets: { rowIndex: number; columnIndex: number }[] = [];
  const rowDistance = Math.abs(endRow - startRow);
  const columnDistance = Math.abs(endColumn - startColumn);

  if (rowDistance > columnDistance) {
    const from = Math.min(startRow, endRow);
    const to = Math.max(startRow, endRow);

    for (let rowIndex = from; rowIndex <= to; rowIndex += 1) {
      targets.push({ rowIndex, columnIndex: startColumn });
    }

    return targets;
  }

  const from = Math.min(startColumn, endColumn);
  const to = Math.max(startColumn, endColumn);

  for (let columnIndex = from; columnIndex <= to; columnIndex += 1) {
    targets.push({ rowIndex: startRow, columnIndex });
  }

  return targets;
}

export function Nonogram({ onBack }: NonogramProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [grid, setGrid] = useState<NonogramCell[][]>(() => applyAutoMarks(createEmptyGrid(puzzles[0]), puzzles[0].solution));
  const [tool, setTool] = useState<NonogramTool>("fill");
  const [status, setStatus] = useState<NonogramStatus>("playing");
  const [moves, setMoves] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [record, setRecord] = useState<NonogramRecord>(() => readRecord());
  const [message, setMessage] = useState("数字ヒントを頼りに、絵柄になるマスを塗ってください。ドラッグで横・縦の直線をまとめて入力できます。");
  const dragState = useRef<DragState | null>(null);

  const puzzle = puzzles[puzzleIndex];
  const ranking = useRanking({ gameId: `nonogram-${puzzle.id}`, metricLabel: "Moves", mode: "lower" });
  const rows = puzzle.solution.length;
  const columns = puzzle.solution[0].length;
  const rowHints = useMemo(() => puzzle.solution.map(getLineHints), [puzzle]);
  const columnHints = useMemo(
    () =>
      Array.from({ length: columns }, (_, columnIndex) =>
        getLineHints(Array.from({ length: rows }, (_, rowIndex) => puzzle.solution[rowIndex][columnIndex]))
      ),
    [columns, puzzle, rows]
  );
  const filledCount = grid.flat().filter((cell) => cell === "filled").length;
  const answerCount = useMemo(() => countFilled(puzzle.solution), [puzzle]);
  const bestMoves = record[puzzle.id] ?? null;
  const rowCompletions = useMemo(() => grid.map((row, rowIndex) => isLineComplete(row, puzzle.solution[rowIndex])), [grid, puzzle]);
  const columnCompletions = useMemo(
    () =>
      Array.from({ length: columns }, (_, columnIndex) =>
        isLineComplete(
          Array.from({ length: rows }, (_, rowIndex) => grid[rowIndex][columnIndex]),
          Array.from({ length: rows }, (_, rowIndex) => puzzle.solution[rowIndex][columnIndex])
        )
      ),
    [columns, grid, puzzle, rows]
  );

  useEffect(() => {
    const stopDrag = () => {
      dragState.current = null;
    };

    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  const startPuzzle = (nextPuzzleIndex = puzzleIndex) => {
    const nextPuzzle = puzzles[nextPuzzleIndex];

    dragState.current = null;
    setPuzzleIndex(nextPuzzleIndex);
    setGrid(applyAutoMarks(createEmptyGrid(nextPuzzle), nextPuzzle.solution));
    setStatus("playing");
    setMoves(0);
    setShowAnswer(false);
    setMessage(`${nextPuzzle.name}を開始しました。塗る/×印を切り替えながら解いてみてください。`);
  };

  const finishIfSolved = (nextGrid: NonogramCell[][], nextMoves: number) => {
    if (!isSolved(nextGrid, puzzle.solution)) {
      return false;
    }

    const nextRecord = {
      ...record,
      [puzzle.id]: bestMoves === null ? nextMoves : Math.min(bestMoves, nextMoves)
    };

    setRecord(nextRecord);
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
    setStatus("cleared");
    setMessage(`完成！ ${nextMoves}手で「${puzzle.name}」を解きました。`);

    return true;
  };

  const applyCells = (targets: { rowIndex: number; columnIndex: number }[], nextCell: NonogramCell, shouldCountMove: boolean) => {
    if (status !== "playing") {
      return;
    }

    const targetKeys = new Set(targets.map((target) => `${target.rowIndex}-${target.columnIndex}`));
    const editedGrid = grid.map((row, rowIndex) =>
      row.map((cell, columnIndex) => (targetKeys.has(`${rowIndex}-${columnIndex}`) ? nextCell : cell))
    );
    const nextGrid = applyAutoMarks(editedGrid, puzzle.solution);
    const changed = nextGrid.some((row, rowIndex) => row.some((cell, columnIndex) => cell !== grid[rowIndex][columnIndex]));

    if (!changed) {
      return;
    }

    const nextMoves = moves + (shouldCountMove ? 1 : 0);

    setGrid(nextGrid);

    if (shouldCountMove) {
      setMoves(nextMoves);
    }

    if (!finishIfSolved(nextGrid, nextMoves)) {
      setMessage(tool === "fill" ? "マスを塗りました。ヒントの並びと合っているか確認しましょう。" : "×印を置きました。ここは塗らない候補です。");
    }
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>, rowIndex: number, columnIndex: number) => {
    if (status !== "playing") {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const targetCell = getToolCell(tool);
    const nextCell = grid[rowIndex][columnIndex] === targetCell ? "unknown" : targetCell;

    dragState.current = {
      active: true,
      startRow: rowIndex,
      startColumn: columnIndex,
      nextCell,
      lastKey: `${rowIndex}-${columnIndex}`
    };
    applyCells([{ rowIndex, columnIndex }], nextCell, true);
  };

  const dragOverCell = (rowIndex: number, columnIndex: number) => {
    const drag = dragState.current;

    if (!drag?.active) {
      return;
    }

    const nextKey = `${rowIndex}-${columnIndex}`;

    if (drag.lastKey === nextKey) {
      return;
    }

    drag.lastKey = nextKey;
    applyCells(getLineTargets(drag.startRow, drag.startColumn, rowIndex, columnIndex), drag.nextCell, false);
  };

  const dragAcrossBoard = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;

    if (!drag?.active) {
      return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".nonogram-cell");
    const rowIndex = Number(element?.dataset.row);
    const columnIndex = Number(element?.dataset.column);

    if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
      return;
    }

    dragOverCell(rowIndex, columnIndex);
  };

  const stopDrag = () => {
    dragState.current = null;
  };

  const resetRecord = () => {
    setRecord({});
    window.localStorage.setItem(RECORD_KEY, JSON.stringify({}));
  };

  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [boardWrapWidth, setBoardWrapWidth] = useState(0);

  useEffect(() => {
    const element = boardWrapRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setBoardWrapWidth(Math.floor(element.getBoundingClientRect().width));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [puzzle.id]);

  const maxRowHintCount = useMemo(() => Math.max(...rowHints.map((hints) => hints.length), 1), [rowHints]);
  const maxColumnHintCount = useMemo(() => Math.max(...columnHints.map((hints) => hints.length), 1), [columnHints]);

  const boardMetrics = useMemo(() => {
    const defaultCellSize = columns >= 12 ? 28 : columns >= 10 ? 34 : columns >= 8 ? 38 : 42;
    const defaultRowHintWidth = 86;
    const defaultColumnHintHeight = 90;

    if (boardWrapWidth <= 0 || boardWrapWidth > 560) {
      return {
        cellSize: defaultCellSize,
        rowHintWidth: defaultRowHintWidth,
        columnHintHeight: defaultColumnHintHeight
      };
    }

    const availableWidth = Math.max(260, boardWrapWidth - 2);
    const preferredRowHintWidth = Math.min(64, Math.max(maxRowHintCount >= 4 ? 54 : maxRowHintCount >= 3 ? 48 : 42, Math.floor(availableWidth * 0.17)));
    const compactRowHintWidth = Math.max(34, availableWidth - columns * 20 - 2);
    const rowHintWidth = Math.floor(Math.min(preferredRowHintWidth, compactRowHintWidth));
    const maxCellSize = columns >= 12 ? 29 : columns >= 10 ? 32 : columns >= 8 ? 36 : 44;
    const fittedCellSize = Math.floor((availableWidth - rowHintWidth - 2) / columns);
    const cellSize = Math.max(18, Math.min(maxCellSize, fittedCellSize));
    const columnHintHeight = Math.min(78, Math.max(54, cellSize * Math.min(maxColumnHintCount, 4) + 18));

    return {
      cellSize,
      rowHintWidth,
      columnHintHeight
    };
  }, [boardWrapWidth, columns, maxColumnHintCount, maxRowHintCount]);

  const boardStyle = {
    "--nonogram-cols": columns,
    "--nonogram-rows": rows,
    "--nonogram-cell": `${boardMetrics.cellSize}px`,
    "--nonogram-row-hint": `${boardMetrics.rowHintWidth}px`,
    "--nonogram-column-hint": `${boardMetrics.columnHintHeight}px`
  } as CSSProperties;

  return (
    <section className="puzzle-shell nonogram-shell" aria-labelledby="nonogram-title">
      <div className="puzzle-hero">
        <div>
          <p className="eyebrow">PICTURE LOGIC / INTERNAL GAME</p>
          <h1 id="nonogram-title">イラストロジック</h1>
          <p className="lead">{message}</p>
        </div>
        <div className="score-panel nonogram-score" aria-label="イラストロジックの状態">
          <div>
            <span>Problem</span>
            <strong>{puzzle.name}</strong>
          </div>
          <div>
            <span>Move</span>
            <strong>{moves}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestMoves ?? "--"}</strong>
          </div>
        </div>
      </div>

      <div className="puzzle-layout nonogram-layout">
        <div className="nonogram-play-area">
          <div className="nonogram-toolbar" aria-label="操作モード">
            <button className={tool === "fill" ? "is-active" : ""} type="button" onClick={() => setTool("fill")}>
              <Paintbrush aria-hidden="true" />
              塗る
            </button>
            <button className={tool === "mark" ? "is-active" : ""} type="button" onClick={() => setTool("mark")}>
              <X aria-hidden="true" />
              ×印
            </button>
            <button className={showAnswer ? "is-active" : ""} type="button" onClick={() => setShowAnswer((current) => !current)}>
              <Eye aria-hidden="true" />
              答え確認
            </button>
          </div>

          <div className="nonogram-board-wrap" ref={boardWrapRef}>
            <div className="nonogram-board" style={boardStyle} onPointerMove={dragAcrossBoard}>
              <div className="nonogram-corner">
                <Grid3X3 aria-hidden="true" />
              </div>
              {columnHints.map((hints, columnIndex) => (
                <div className={`nonogram-column-hint${columnCompletions[columnIndex] ? " is-complete" : ""}`} key={`column-${columnIndex}`}>
                  {hints.map((hint, index) => (
                    <span className="nonogram-hint-number" key={`${hint}-${index}`}>
                      {hint}
                    </span>
                  ))}
                </div>
              ))}
              {grid.map((row, rowIndex) => (
                <Fragment key={`row-${rowIndex}`}>
                  <div className={`nonogram-row-hint${rowCompletions[rowIndex] ? " is-complete" : ""}`}>
                    {rowHints[rowIndex].map((hint, index) => (
                      <span className="nonogram-hint-number" key={`${hint}-${index}`}>
                        {hint}
                      </span>
                    ))}
                  </div>
                  {row.map((cell, columnIndex) => (
                    <button
                      className={`nonogram-cell is-${cell}${showAnswer && puzzle.solution[rowIndex][columnIndex] ? " is-answer" : ""}${(columnIndex + 1) % 5 === 0 ? " is-block-right" : ""}${(rowIndex + 1) % 5 === 0 ? " is-block-bottom" : ""}`}
                      key={`${rowIndex}-${columnIndex}`}
                      type="button"
                      data-row={rowIndex}
                      data-column={columnIndex}
                      onPointerDown={(event) => startDrag(event, rowIndex, columnIndex)}
                      onPointerUp={stopDrag}
                      aria-label={`${rowIndex + 1}行 ${columnIndex + 1}列`}
                    >
                      {cell === "marked" ? "×" : ""}
                    </button>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <aside className="puzzle-side nonogram-side">
          <div className="rule-card">
            <h2>遊び方</h2>
            <p>
              行と列の数字は、連続して塗るマス数を表します。例えば「3」「1」なら、3マス連続で塗った後に1マス以上空けて、1マス塗ります。
              左ドラッグで横または縦の直線をまとめて塗ったり、×印を置いたりできます。
            </p>
          </div>

          <div className="nonogram-puzzles" aria-label="問題選択">
            {puzzles.map((item, index) => (
              <button className={index === puzzleIndex ? "is-active" : ""} key={item.id} type="button" onClick={() => startPuzzle(index)}>
                <span>{item.name}</span>
                <small>
                  {item.sizeLabel} / {item.difficulty}
                </small>
              </button>
            ))}
          </div>

          <div className="nonogram-status">
            <span>塗り: {filledCount} / 解答 {answerCount}</span>
            <span>状態: {status === "cleared" ? "クリア" : "挑戦中"}</span>
            <span>現在の道具: {tool === "fill" ? "塗る" : "×印"}</span>
          </div>

          <RankingPanel
            ranking={ranking}
            pendingScore={status === "cleared" ? { score: moves, display: `${moves}手`, meta: `${puzzle.name} / ${columns}×${rows}` } : null}
          />

          <div className="control-row">
            <button className="primary-button" type="button" onClick={() => startPuzzle()}>
              <Sparkles aria-hidden="true" />
              やり直し
            </button>
            <button className="ghost-button" type="button" onClick={resetRecord}>
              <RotateCcw aria-hidden="true" />
              記録リセット
            </button>
          </div>

          <button className="ghost-button shelf-button" type="button" onClick={onBack}>
            棚へ戻る
          </button>
        </aside>
      </div>
    </section>
  );
}

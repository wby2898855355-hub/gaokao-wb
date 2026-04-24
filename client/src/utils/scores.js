// Generate score brackets based on rules:
// 1-200: single bracket
// 200-400: 5-point brackets (200-205, 205-210, ...)
// 400-650: 5-point brackets
// 650-700: 5-point brackets
// 700-750: single bracket
// All in descending order

export function generateScoreBrackets() {
  const brackets = [];

  // 700-750 (single bracket)
  brackets.push({ label: '700-750', value: '700-750', min: 700, max: 750 });

  // 650-700 (5-point brackets, descending)
  for (let s = 695; s >= 650; s -= 5) {
    brackets.push({ label: `${s}-${s+5}`, value: `${s}-${s+5}`, min: s, max: s + 5 });
  }

  // 400-650 (5-point brackets, descending)
  for (let s = 645; s >= 400; s -= 5) {
    brackets.push({ label: `${s}-${s+5}`, value: `${s}-${s+5}`, min: s, max: s + 5 });
  }

  // 200-400 (5-point brackets, descending)
  for (let s = 395; s >= 200; s -= 5) {
    brackets.push({ label: `${s}-${s+5}`, value: `${s}-${s+5}`, min: s, max: s + 5 });
  }

  // 1-200 (single bracket)
  brackets.push({ label: '1-200', value: '1-200', min: 1, max: 200 });

  return brackets;
}

export function getScoreBracket(score) {
  if (score >= 700) return '700-750';
  if (score >= 1 && score <= 200) return '1-200';
  // Floor to nearest 5
  const low = Math.floor(score / 5) * 5;
  const high = low + 5;
  return `${low}-${high}`;
}

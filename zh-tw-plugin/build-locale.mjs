// 台灣繁體中文外掛：把上游的 zh-Hant 翻譯轉成台灣用語，寫回 src/i18n/locales/zh-Hant.json。
//
//   node zh-tw-plugin/build-locale.mjs          轉換並寫回
//   node zh-tw-plugin/build-locale.mjs --dry    只印出改了哪些（不寫檔）
//
// 步驟：OpenCC（t → twp，含台灣片語）→ 本外掛的補充詞表（terms.json）→ 引號改「」。
// 上游更新後重跑一次即可；原檔先備份成 zh-Hant.upstream.json。
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TARGET = path.join(ROOT, 'src/i18n/locales/zh-Hant.json');
const BACKUP = path.join(HERE, 'zh-Hant.upstream.json');
const dry = process.argv.includes('--dry');

// 第一次跑時把上游的 zh-Hant 存成備份，之後一律從備份轉換（重跑結果一樣）。
// 上游更新翻譯後：git checkout 上游的 zh-Hant.json、刪掉備份，再重跑。
if (!existsSync(BACKUP)) copyFileSync(TARGET, BACKUP);
const source = JSON.parse(readFileSync(BACKUP, 'utf8'));

const opencc = OpenCC.Converter({ from: 't', to: 'twp' });
const terms = JSON.parse(readFileSync(path.join(HERE, 'terms.json'), 'utf8'));
const pairs = Object.entries(terms).filter(([k]) => !k.startsWith('//'));
// 長的詞先換，避免「數據源」被「數據」搶先。
pairs.sort((a, b) => b[0].length - a[0].length);

function protect(text, fn) {
  // {placeholder} 不能動。
  const slots = [];
  const masked = text.replace(/\{[^{}]*\}/g, (m) => {
    slots.push(m);
    return `\u0000${slots.length - 1}\u0000`;
  });
  return fn(masked).replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)]);
}

function toTaiwan(text) {
  return protect(text, (s) => {
    let out = opencc(s);
    for (const [from, to] of pairs) out = out.split(from).join(to);
    return out
      .replace(/“/g, '「')
      .replace(/”/g, '」')
      .replace(/‘/g, '『')
      .replace(/’/g, '』');
  });
}

const result = {};
let changed = 0;
const samples = [];
for (const [key, value] of Object.entries(source)) {
  if (typeof value === 'string') {
    result[key] = toTaiwan(value);
    if (result[key] !== value) {
      changed++;
      if (samples.length < 60) samples.push(`${value}  →  ${result[key]}`);
    }
  } else {
    result[key] = Object.fromEntries(
      Object.entries(value).map(([form, text]) => [form, toTaiwan(text)]),
    );
  }
}

if (dry) {
  console.log(samples.join('\n'));
  console.log(`\n共 ${Object.keys(source).length} 條，改了 ${changed} 條（--dry，未寫檔）`);
} else {
  writeFileSync(TARGET, JSON.stringify(result, null, 2) + '\n');
  console.log(`已寫入 ${path.relative(ROOT, TARGET)}：${changed} 條改成台灣用語`);
}

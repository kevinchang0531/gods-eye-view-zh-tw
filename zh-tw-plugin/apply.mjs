// 台灣繁體中文外掛：一次套用全部修改（可重複執行）。
//
//   node zh-tw-plugin/apply.mjs
//
// 1. 翻譯檔改成台灣用語（build-locale.mjs）
// 2. 語言選單把 zh-Hant 顯示成「中文（台灣）」
// 3. 第一次開啟一律用繁體中文（網址 ?lang=en 或在右下角地球鈕切換仍可改，選擇會被記住）
// 4. <html lang> 改成 zh-Hant，載入畫面一開始就是中文
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function patch(rel, edits) {
  const file = path.join(ROOT, rel);
  let text = readFileSync(file, 'utf8');
  for (const [from, to] of edits) {
    if (text.includes(to)) continue; // 已套用
    if (!text.includes(from)) throw new Error(`${rel}：找不到要替換的內容，上游可能改版了：\n${from}`);
    text = text.replace(from, to);
  }
  writeFileSync(file, text);
  console.log(`已修改 ${rel}`);
}

execFileSync(process.execPath, [path.join(HERE, 'build-locale.mjs')], { stdio: 'inherit' });

patch('src/i18n/locale.js', [
  ["'zh-Hant': '中文（繁體）',", "'zh-Hant': '中文（台灣）',"],
  [
    '  const stored = readStoredLocale(storage);\n  if (stored) return stored;\n',
    '  const stored = readStoredLocale(storage);\n  if (stored) return stored;\n' +
      '  // zh-tw-plugin：沒有指定語言時一律用台灣繁體中文。\n' +
      "  if (FIRST_VISIT_LOCALE) return FIRST_VISIT_LOCALE;\n",
  ],
  [
    "export const DEFAULT_LOCALE = 'en';\n",
    "export const DEFAULT_LOCALE = 'en';\n\n" +
      '/** zh-tw-plugin：第一次開啟的語言（設成 null 就恢復跟隨瀏覽器）。 */\n' +
      "export const FIRST_VISIT_LOCALE = 'zh-Hant';\n",
  ],
]);

patch('index.html', [['<html lang="en">', '<html lang="zh-Hant">']]);

console.log('完成。npm run dev 或 npm run build 就會是台灣繁體中文介面。');

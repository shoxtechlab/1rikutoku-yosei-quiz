import fs from "node:fs";
import vm from "node:vm";

const bank=JSON.parse(fs.readFileSync("questions.json","utf8")).questions;
const errors=[];
const ids=new Set();
for(const q of bank){
  if(ids.has(q.id))errors.push(`ID重複: ${q.id}`);ids.add(q.id);
  if(!["無線工学","法規"].includes(q.subject))errors.push(`科目不正: ${q.id}`);
  if(q.choices.length!==4)errors.push(`選択肢数不正: ${q.id}`);
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.choices.length)errors.push(`正答不正: ${q.id}`);
  if(new Set(q.choices).size!==q.choices.length)errors.push(`選択肢重複: ${q.id}`);
  if(!q.question||!q.explanation||!q.tag||!q.difficulty)errors.push(`必須項目不足: ${q.id}`);
  if(q.subject==="法規"&&(!q.source?.url||!q.source?.label))errors.push(`法規根拠不足: ${q.id}`);
}
for(const [subject,count] of [["無線工学",20],["法規",10]]){
  if(bank.filter(q=>q.subject===subject).length<count)errors.push(`${subject}の問題数が${count}未満です`);
}
const html=fs.readFileSync("index.html","utf8");
const easyBank = JSON.parse(fs.readFileSync("questions-easy.json", "utf8")).questions;
const engineeringIds = new Set(bank.filter(q => q.subject === "無線工学").map(q => q.id));
for (const question of bank.filter(q => q.subject === "無線工学")) {
  const chapter = Number.parseInt(question.tag, 10);
  const expectedSubject = chapter <= 8 ? "無線工学A"
    : [9, 10, 11, 16, 18].includes(chapter) ? "無線工学B" : "無線工学C";
  if (!/^(?:[1-9]|1[0-8])章_.+$/.test(question.tag) || question.courseSubject !== expectedSubject) {
    errors.push(`科目・章タグが不正: ${question.id}`);
  }
}
for (const question of easyBank) {
  if (!engineeringIds.delete(question.originalId) || ids.has(question.id)
      || question.subject !== "無線工学" || !question.question
      || !question.explanation || question.choices.length !== 4
      || new Set(question.choices).size !== 4 || !Number.isInteger(question.answer)
      || question.answer < 0 || question.answer > 3) {
    errors.push(`やさしい版のデータ不正: ${question.id}`);
  }
  ids.add(question.id);
  const original = bank.find(item => item.id === question.originalId);
  if (original && (original.tag !== question.tag || original.courseSubject !== question.courseSubject)) {
    errors.push(`通常版と科目・章タグが異なる: ${question.id}`);
  }
  if (bank.find(original => original.id === question.originalId)?.question === question.question) {
    errors.push(`やさしい版の問題文が通常版と同一: ${question.id}`);
  }
}
if (engineeringIds.size) errors.push(`やさしい版の未作成: ${[...engineeringIds].join(", ")}`);
if (!html.includes('id="easy-engineering"')) errors.push("やさしい版の開始ボタンなし");
for(const id of ["start-screen","quiz-screen","result-screen","quiz-form","review-list"]){if(!html.includes(`id="${id}"`))errors.push(`画面要素不足: ${id}`)}
const appScript = new vm.Script(fs.readFileSync("app.js", "utf8"), {filename: "app.js"});
const context = vm.createContext({
  location: {hostname: "localhost"},
  document: {getElementById: () => ({addEventListener() {}})},
  fetch: () => new Promise(() => {})
});
appScript.runInContext(context);
const drawEngineering = vm.runInContext("drawEngineering", context);
for (const pool of [bank, easyBank]) {
  for (let trial = 0; trial < 100; trial++) {
    const selected = drawEngineering(pool);
    const chapters = new Map();
    for (const q of selected) chapters.set(q.tag, (chapters.get(q.tag) ?? 0) + 1);
    const counts = ["A", "B", "C"].map(group =>
      selected.filter(q => q.courseSubject === "無線工学" + group).length);
    if (counts.join(",") !== "7,7,6" || new Set(selected.map(q => q.id)).size !== 20
        || [...chapters.values()].some(count => count > 3)) {
      errors.push("無線工学の抽選条件が不正");
      break;
    }
  }
}
const {drawLaw, canDrawLaw} = vm.runInContext("({drawLaw, canDrawLaw})", context);
const lawGroups = [[1, 2], [3], [4], [5], [6, 7, 8]];
for (let trial = 0; trial < 100; trial++) {
  const selected = drawLaw(bank);
  const counts = lawGroups.map(chapters =>
    selected.filter(q => chapters.includes(Number.parseInt(q.tag, 10))).length);
  if (counts.join(",") !== "2,2,1,2,3" || new Set(selected.map(q => q.id)).size !== 10
      || selected.some(q => q.subject !== "法規" || q.deleted === true)) {
    errors.push("法規の抽選条件が不正");
    break;
  }
}
const missingLawChapter = bank.map(q =>
  q.subject === "法規" && q.tag.startsWith("3章_") ? {...q, deleted: true} : q);
if (!canDrawLaw(bank) || canDrawLaw(missingLawChapter)) errors.push("法規の章別在庫判定が不正");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`OK: 問題バンク${bank.length}問。出題数に必要な在庫、ID・4択・正答範囲・選択肢重複・必須項目・法規根拠・JS構文を確認`);

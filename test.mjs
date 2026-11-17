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
for(const id of ["start-screen","quiz-screen","result-screen","quiz-form","review-list"]){if(!html.includes(`id="${id}"`))errors.push(`画面要素不足: ${id}`)}
new vm.Script(fs.readFileSync("app.js","utf8"),{filename:"app.js"});
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`OK: 問題バンク${bank.length}問。出題数に必要な在庫、ID・4択・正答範囲・選択肢重複・必須項目・法規根拠・JS構文を確認`);

"use strict";

if (location.hostname === "shoxtechlab.github.io") {
  const counter = document.getElementById("access-counter");
  counter.addEventListener("load", () => { counter.hidden = false; }, {once: true});
  counter.src = "https://hits.sh/shoxtechlab.github.io/1rikutoku-yosei-quiz.svg?label=Page%20views";
}
const state={bank:[],easyBank:[],questions:[],answers:new Map(),results:[]},$=id=>document.getElementById(id),screens=["start-screen","quiz-screen","result-screen"];
const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const escapeHtml=v=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function show(id){screens.forEach(x=>$(x).hidden=x!==id);window.scrollTo({top:0,behavior:"smooth"})}
function validateBank(list){const e=[],ids=new Set;if(!Array.isArray(list))return["questions が配列ではありません"];list.forEach((q,i)=>{if(!q.id||ids.has(q.id))e.push(`${i+1}番: idが未設定または重複`);ids.add(q.id);if(!["無線工学","法規"].includes(q.subject))e.push(`${q.id}: 科目が不正`);if(!Array.isArray(q.choices)||q.choices.length!==4)e.push(`${q.id}: 選択肢は4個必要`);if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)e.push(`${q.id}: 正答番号が不正`);["question","explanation","tag","difficulty"].forEach(k=>{if(!q[k])e.push(`${q.id}: ${k}が未設定`)})});[["無線工学",20],["法規",10]].forEach(([s,n])=>{if(list.filter(q=>q.subject===s).length<n)e.push(`${s}は${n}問以上必要`)});return e}
async function loadQuestions(){try{const r=await fetch("questions.json",{cache:"no-cache"});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json(),errors=validateBank(data.questions);if(errors.length)throw Error(errors.join(" / "));state.bank=data.questions;$("load-status").textContent=`${state.bank.length}問の問題データを確認しました。`;$("start-button").disabled=false;$("all-engineering").disabled=false;$("all-law").disabled=false}catch(error){$("load-status").classList.add("error");$("load-status").textContent="問題データを読み込めません。静的Webサーバー経由で開いてください。";console.error(error)}}
async function loadEasyQuestions() {
  try {
    const response = await fetch("questions-easy.json", {cache: "no-cache"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const {questions} = await response.json();
    if (!Array.isArray(questions) || questions.length < 20) {
      throw new Error("やさしい問題が20問未満です");
    }
    state.easyBank = questions;
    $("easy-engineering").disabled = false;
  } catch (error) {
    $("easy-status").textContent = "やさしい問題を読み込めませんでした。";
    console.error(error);
  }
}
const studyOrder = [
  "電磁気", "電気回路", "高周波回路", "立体回路", "給電線", "マイクロ波増幅",
  "電子回路", "PLL", "変復調", "デジタル変調", "信号品質", "多元接続", "OFDM",
  "多重通信", "PCM", "スペクトル拡散", "ベースバンド", "誤り制御", "受信機",
  "CDMA", "衛星通信", "中継方式", "レーダー", "アンテナ", "電波・伝搬",
  "デシベル", "回線設計", "混信対策", "電源", "測定", "送信機", "保守",
  "目的・定義", "無線局免許", "無線設備", "無線従事者", "一陸特の範囲",
  "無線局運用", "非常時の通信", "通信の秘密", "業務書類", "監督", "罰則"
];
const studyRank = new Map(studyOrder.map((tag, index) => [tag, index]));
function prepareExam(mode) {
  state.mode = mode;
  state.answers.clear();
  state.results = [];
  const engineering = state.bank.filter(q => q.subject === "無線工学");
  const law = state.bank.filter(q => q.subject === "法規");
  const order = q => q.id === "eng-001" ? -1 : (studyRank.get(q.tag) ?? studyRank.size);
  const byTopic = (a, b) => order(a) - order(b);
  const questions = mode === "easy"
    ? shuffle(state.easyBank).slice(0, 20)
    : mode !== "random"
    ? (mode === "無線工学" ? engineering : law).sort(byTopic)
    : [...shuffle(engineering).slice(0, 20), ...shuffle(law).slice(0, 10)];
  state.questions = questions.map(q => {
    const choices = q.choices.map((text, index) => ({text, index}));
    return {...q, displayChoices: mode === "random" || mode === "easy" ? shuffle(choices) : choices};
  });
  $("retry-button").textContent = mode === "easy" ? "やさしい20問に再挑戦" : mode !== "random" ? `${mode}をもう一度解く` : "ランダム30問に再挑戦";
  renderQuiz();
  show("quiz-screen");
}
function renderQuiz(){$("questions").innerHTML=state.questions.map((q,i)=>`<article class="question-card" id="question-${i}"><div class="question-meta"><span class="question-number">問${i+1}</span><span class="pill">${q.subject}</span><span class="pill">${q.tag}</span><span class="difficulty">難易度：${q.difficulty}</span></div><fieldset><legend>${escapeHtml(q.question)}</legend>${q.hint ? `<details class="study-hint"><summary>ヒント</summary><p>${escapeHtml(q.hint)}</p></details>` : ""}${q.displayChoices.map((c,j)=>`<label class="choice"><input type="radio" name="q${i}" value="${c.index}"><span class="choice-letter">${"ABCD"[j]}</span><span>${escapeHtml(c.text)}</span></label>`).join("")}</fieldset><button type="button" class="button secondary check-answer" data-index="${i}" disabled>答え合わせ</button><div class="review-answer check-feedback" id="feedback-${i}" role="status" hidden></div></article>`).join("");$("question-nav").innerHTML=state.questions.map((_,i)=>`<button type="button" data-index="${i}" aria-label="問${i+1}へ移動">${i+1}</button>`).join("");$("questions").querySelectorAll("input").forEach(x=>x.addEventListener("change",e=>{const i=Number(e.target.name.slice(1));state.answers.set(i,Number(e.target.value));$("question-"+i).querySelector(".check-answer").disabled=false;updateProgress()}));
  $("questions").querySelectorAll(".check-answer").forEach(button=>button.addEventListener("click",()=>checkAnswer(button)));
  $("question-nav").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>$("question-"+b.dataset.index).scrollIntoView({behavior:"smooth"})));updateProgress()}

function checkAnswer(button) {
  const index = Number(button.dataset.index);
  const question = state.questions[index];
  const selected = state.answers.get(index);
  if (selected === undefined) return;

  const feedback = $("feedback-" + index);
  const correct = selected === question.answer;
  const describeChoice = originalIndex => {
    const displayedIndex = question.displayChoices.findIndex(choice => choice.index === originalIndex);
    return `${"ABCD"[displayedIndex]}「${question.choices[originalIndex]}」`;
  };
  feedback.classList.toggle("incorrect", !correct);
  const verdict = document.createElement("strong");
  verdict.textContent = correct ? "正解" : "不正解";
  feedback.append(verdict);
  const addLine = (label, text) => {
    const line = document.createElement("p");
    line.textContent = label + text;
    feedback.append(line);
  };
  if (!correct) addLine("あなたの回答：", describeChoice(selected));
  addLine("正答：", describeChoice(question.answer));
  addLine("解説：", question.explanation);
  feedback.hidden = false;
  const navButton = $("question-nav").querySelector(`button[data-index="${index}"]`);
  navButton.classList.add(correct ? "correct" : "incorrect");
  navButton.textContent = `${index + 1}${correct ? "✓" : "×"}`;
  navButton.setAttribute("aria-label", `問${index + 1}、${correct ? "正解" : "不正解"}。問題へ移動`);
  $("question-" + index).querySelector("fieldset").disabled = true;
  button.disabled = true;
  button.textContent = "確認済み";
}
function updateProgress(){const n=state.answers.size,t=state.questions.length;$("progress-text").textContent=`回答 ${n} / ${t}`;$("remaining-text").textContent=`残り${t-n}問`;$("progress-bar").style.width=`${n/t*100}%`;$("question-nav").querySelectorAll("button").forEach((b,i)=>b.classList.toggle("answered",state.answers.has(i)))}
function grade(event){event.preventDefault();state.results=state.questions.map((q,index)=>({q,index,selected:state.answers.get(index),correct:state.answers.get(index)===q.answer}));renderResults();show("result-screen")}
function renderResults(){const subjects=(state.mode==="random"?["無線工学","法規"]:[state.mode==="easy"?"無線工学":state.mode]).map(name=>{const rows=state.results.filter(r=>r.q.subject===name),correct=rows.filter(r=>r.correct).length;return{name,total:rows.length,correct,rate:Math.round(correct/rows.length*100),pass:correct/rows.length>=.6}}),passed=subjects.every(s=>s.pass),total=state.results.filter(r=>r.correct).length;$("result-summary").innerHTML=`<div class="result-hero"><div><h1>${state.mode!=="random"?`${state.mode==="easy"?"無線工学・やさしい20問":state.mode}の結果`:passed?"合格":"不合格"}</h1>${state.mode!=="random"?"":"<p>合格基準：各科目60%以上</p>"}</div><div class="score-ring">${total}<small>/${state.results.length}</small></div></div><div class="subject-scores">${subjects.map(s=>`<div class="subject-score"><div class="score-line"><span>${s.name}</span><b>${s.correct}<small> / ${s.total}</small></b></div><span class="${s.pass?"pass":"fail"}">正答率 ${s.rate}%</span></div>`).join("")}</div>`;const tags={};state.results.forEach(r=>{tags[r.q.tag]??={total:0,correct:0};tags[r.q.tag].total++;if(r.correct)tags[r.q.tag].correct++});$("tag-results").innerHTML=Object.entries(tags).sort().map(([tag,x])=>{const rate=Math.round(x.correct/x.total*100);return`<div class="tag-row"><span>${tag}</span><div class="tag-track"><div class="tag-fill" style="width:${rate}%"></div></div><b>${rate}%</b></div>`}).join("");renderReview(false);const wrong=state.results.filter(r=>!r.correct).length;$("review-wrong-button").disabled=!wrong;$("review-wrong-button").textContent=wrong?`間違えた${wrong}問だけ復習`:"全問正解しました"}
function renderReview(wrongOnly){const rows=wrongOnly?state.results.filter(r=>!r.correct):state.results;$("review-list").innerHTML=rows.map(r=>{const selected=r.selected===undefined?"未回答":r.q.choices[r.selected],source=r.q.source?`<p class="source">根拠：${r.q.source.url?`<a href="${r.q.source.url}" target="_blank" rel="noopener">${escapeHtml(r.q.source.label)}</a>`:escapeHtml(r.q.source.label)}</p>`:"";return`<article class="review-card ${r.correct?"":"incorrect"}"><h3>問${r.index+1}｜${escapeHtml(r.q.question)}</h3><p class="review-answer"><b>${r.correct?"正解":"不正解"}</b>　あなたの回答：${escapeHtml(selected)}<br>正答：${escapeHtml(r.q.choices[r.q.answer])}</p><p>${escapeHtml(r.q.explanation)}</p>${source}</article>`}).join("")}
$("easy-engineering").addEventListener("click",()=>prepareExam("easy"));
$("start-button").disabled=true;$("start-button").addEventListener("click",()=>prepareExam("random"));$("all-engineering").addEventListener("click",()=>prepareExam("無線工学"));$("all-law").addEventListener("click",()=>prepareExam("法規"));$("quiz-form").addEventListener("submit",grade);$("retry-button").addEventListener("click",()=>prepareExam(state.mode));["quit-button","back-button"].forEach(id=>$(id).addEventListener("click",()=>show("start-screen")));$("wrong-only").addEventListener("change",e=>renderReview(e.target.checked));$("review-wrong-button").addEventListener("click",()=>{$("wrong-only").checked=true;renderReview(true);$("review-title").scrollIntoView({behavior:"smooth"})});loadQuestions();
loadEasyQuestions();

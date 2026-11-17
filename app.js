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

function returnHome(event) {
  event.preventDefault();
  if (!$("quiz-screen").hidden && !window.confirm("回答を中断してホームに戻りますか？ この回の回答は保存されません。")) {
    return;
  }
  show("start-screen");
}
function validateBank(list){const e=[],ids=new Set;if(!Array.isArray(list))return["questions が配列ではありません"];list.forEach((q,i)=>{if(!q.id||ids.has(q.id))e.push(`${i+1}番: idが未設定または重複`);ids.add(q.id);if(!["無線工学","法規"].includes(q.subject))e.push(`${q.id}: 科目が不正`);if(!Array.isArray(q.choices)||q.choices.length!==4)e.push(`${q.id}: 選択肢は4個必要`);if(!Number.isInteger(q.answer)||q.answer<0||q.answer>3)e.push(`${q.id}: 正答番号が不正`);["question","explanation","tag","difficulty"].forEach(k=>{if(!q[k])e.push(`${q.id}: ${k}が未設定`)})});[["無線工学",20],["法規",10]].forEach(([s,n])=>{if(list.filter(q=>q.subject===s).length<n)e.push(`${s}は${n}問以上必要`)});return e}
async function loadQuestions(){try{const r=await fetch("questions.json",{cache:"no-cache"});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json(),errors=validateBank(data.questions);if(errors.length)throw Error(errors.join(" / "));state.bank=data.questions.filter(q=>q.deleted!==true);$("load-status").textContent=`${state.bank.length}問の問題データを確認しました。`;const lawCount=state.bank.filter(q=>q.subject==="法規").length;$("start-button").disabled=!canDrawLaw(state.bank)||!canDrawEngineering(state.bank);$("all-engineering").disabled=!state.bank.some(q=>q.subject==="無線工学");$("all-law").disabled=!lawCount;if($("start-button").disabled)$("load-status").textContent+=" ランダム30問に必要な問題が不足しています。"}catch(error){$("load-status").classList.add("error");$("load-status").textContent="問題データを読み込めません。静的Webサーバー経由で開いてください。";console.error(error)}}
async function loadEasyQuestions() {
  try {
    const response = await fetch("questions-easy.json", {cache: "no-cache"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const {questions} = await response.json();
    if (!Array.isArray(questions) || questions.length < 20) {
      throw new Error("やさしい問題が20問未満です");
    }
    state.easyBank = questions.filter(question => question.deleted !== true);
    $("easy-engineering").disabled = !canDrawEngineering(state.easyBank);
    $("all-easy-engineering").disabled = !state.easyBank.length;
    if ($("easy-engineering").disabled) {
      $("easy-status").textContent = "やさしいランダム20問に必要な問題が不足しています。";
    }
  } catch (error) {
    $("easy-status").textContent = "やさしい問題を読み込めませんでした。";
    console.error(error);
  }
}
const chapterOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 18, 12, 13, 14, 15, 17];

function studyPosition(question) {
  const chapter = Number.parseInt(question.tag, 10);
  if (question.subject === "法規") return chapter;
  const position = chapterOrder.indexOf(chapter);
  return position < 0 ? chapterOrder.length : position;
}
const engineeringQuotas = [["無線工学A", 7], ["無線工学B", 7], ["無線工学C", 6]];
const chapterLimit = 3;

function canDrawEngineering(bank) {
  return engineeringQuotas.every(([subject, quota]) => {
    const counts = new Map();
    for (const question of bank) {
      if (question.courseSubject !== subject) continue;
      counts.set(question.tag, (counts.get(question.tag) ?? 0) + 1);
    }
    const capacity = [...counts.values()].reduce((sum, count) => sum + Math.min(count, chapterLimit), 0);
    return capacity >= quota;
  });
}

function drawEngineering(bank) {
  const selected = [];

  for (const [subject, quota] of engineeringQuotas) {
    const byChapter = new Map();
    for (const question of shuffle(bank.filter(q => q.courseSubject === subject))) {
      if (!byChapter.has(question.tag)) byChapter.set(question.tag, []);
      byChapter.get(question.tag).push(question);
    }
    const chapters = [...byChapter.values()].map(questions => ({
      questions,
      remaining: Math.min(questions.length, chapterLimit),
      weight: Math.sqrt(questions.length)
    }));

    for (let count = 0; count < quota; count++) {
      const eligible = chapters.filter(chapter => chapter.remaining > 0);
      if (!eligible.length) throw new Error(`${subject}のランダム出題に必要な問題が不足しています`);
      const totalWeight = eligible.reduce((sum, chapter) => sum + chapter.weight, 0);
      let ticket = Math.random() * totalWeight;
      const chapter = eligible.find(item => (ticket -= item.weight) < 0) ?? eligible.at(-1);
      selected.push(chapter.questions.pop());
      chapter.remaining--;
    }
  }
  return shuffle(selected);
}

const lawQuotas = [[[1, 2], 2], [[3], 2], [[4], 1], [[5], 2], [[6, 7, 8], 3]];

function lawPools(bank) {
  const law = bank.filter(q => q.subject === "法規" && q.deleted !== true);
  return lawQuotas.map(([chapters, quota]) => ({
    questions: law.filter(q => chapters.includes(studyPosition(q))),
    quota
  }));
}

function canDrawLaw(bank) {
  return lawPools(bank).every(({questions, quota}) => questions.length >= quota);
}

function drawLaw(bank) {
  return shuffle(lawPools(bank).flatMap(({questions, quota}) => {
    if (questions.length < quota) throw new Error("法規のランダム出題に必要な問題が不足しています");
    return shuffle(questions).slice(0, quota);
  }));
}

function prepareExam(mode) {
  state.mode = mode;
  state.answers.clear();
  state.results = [];
  const engineering = state.bank.filter(q => q.subject === "無線工学");
  const law = state.bank.filter(q => q.subject === "法規");
  const byTopic = (a, b) => studyPosition(a) - studyPosition(b);
  const questions = mode === "easy"
    ? drawEngineering(state.easyBank)
    : mode === "easy-all"
    ? [...state.easyBank].sort(byTopic)
    : mode !== "random"
    ? (mode === "無線工学" ? engineering : law).sort(byTopic)
    : [...drawEngineering(engineering), ...drawLaw(law)];
  state.questions = questions.map(q => {
    const choices = q.choices.map((text, index) => ({text, index}));
    return {...q, displayChoices: mode === "random" || mode === "easy" ? shuffle(choices) : choices};
  });
  $("retry-button").textContent = mode === "easy-all" ? "やさしい全問をもう一度解く"
    : mode === "easy" ? "やさしい20問に再挑戦" : mode !== "random" ? `${mode}をもう一度解く` : "ランダム30問に再挑戦";
  renderQuiz();
  renderChapterJump();
  show("quiz-screen");
}

function renderChapterJump() {
  const fullPractice = state.mode === "無線工学" || state.mode === "法規" || state.mode === "easy-all";
  $("chapter-jump").hidden = !fullPractice;
  const select = $("chapter-select");
  select.replaceChildren(new Option("章を選ぶ", ""));
  if (!fullPractice) return;

  const chapters = new Map();
  state.questions.forEach((question, index) => {
    if (!chapters.has(question.tag)) chapters.set(question.tag, {index, count: 0});
    chapters.get(question.tag).count++;
  });
  for (const [tag, {index, count}] of chapters) {
    const label = tag.replace("_", "　");
    select.add(new Option(`${label}（${count}問）`, String(index)));
  }
}

$("chapter-select").addEventListener("change", event => {
  const select = event.currentTarget;
  if (select.value === "") return;
  $("question-" + select.value).scrollIntoView({block: "start"});
  select.value = "";
});
function questionFigure(question) {
  if (question.figure !== "directional-coupler") return "";
  return '<img src="directional-coupler.svg" width="440" style="display:block;max-width:100%;height:auto;margin:0.75rem 0" alt="二孔形方向性結合器。主導波管は左が送信機側、右が負荷側。矢印は右向き。上下の導波管の共通壁に二つの結合孔があり、副導波管の左端はA、右端はB。">';
}

function formatQuestion(question) {
  return escapeHtml(question).replace(/誤っているものを一つ選べ/g, "<strong><u>function renderQuiz()</u></strong>");
}

function renderQuiz(){$("questions").innerHTML=state.questions.map((q,i)=>`<article class="question-card" id="question-${i}"><div class="question-meta"><span class="question-number">問${i+1}</span><span class="pill">${escapeHtml(q.courseSubject ?? q.subject)}</span><span class="pill">${q.tag}</span><span class="difficulty">難易度：${q.difficulty}</span></div><fieldset><legend>${formatQuestion(q.question)}</legend>${questionFigure(q)}${q.hint ? `<details class="study-hint"><summary>ヒント</summary><p>${escapeHtml(q.hint)}</p></details>` : ""}${q.displayChoices.map((c,j)=>`<label class="choice"><input type="radio" name="q${i}" value="${c.index}"><span class="choice-letter">${"ABCD"[j]}</span><span>${escapeHtml(c.text)}</span></label>`).join("")}</fieldset><button type="button" class="button secondary check-answer" data-index="${i}" disabled>答え合わせ</button><div class="review-answer check-feedback" id="feedback-${i}" role="status" hidden></div></article>`).join("");$("question-nav").innerHTML=state.questions.map((_,i)=>`<button type="button" data-index="${i}" aria-label="問${i+1}へ移動">${i+1}</button>`).join("");$("questions").querySelectorAll("input").forEach(x=>x.addEventListener("change",e=>{const i=Number(e.target.name.slice(1));state.answers.set(i,Number(e.target.value));$("question-"+i).querySelector(".check-answer").disabled=false;updateProgress()}));
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
function renderResults(){const subjects=(state.mode==="random"?["無線工学","法規"]:[state.questions[0].subject]).map(name=>{const rows=state.results.filter(r=>r.q.subject===name),correct=rows.filter(r=>r.correct).length;return{name,total:rows.length,correct,rate:Math.round(correct/rows.length*100),pass:correct/rows.length>=.6}}),passed=subjects.every(s=>s.pass),total=state.results.filter(r=>r.correct).length;$("result-summary").innerHTML=`<div class="result-hero"><div><h1>${state.mode!=="random"?`${state.mode==="easy-all"?"無線工学・やさしい全問":state.mode==="easy"?"無線工学・やさしい20問":state.mode}の結果`:passed?"合格":"不合格"}</h1>${state.mode!=="random"?"":"<p>合格基準：各科目60%以上</p>"}</div><div class="score-ring">${total}<small>/${state.results.length}</small></div></div><div class="subject-scores">${subjects.map(s=>`<div class="subject-score"><div class="score-line"><span>${s.name}</span><b>${s.correct}<small> / ${s.total}</small></b></div><span class="${s.pass?"pass":"fail"}">正答率 ${s.rate}%</span></div>`).join("")}</div>`;const tags={};state.results.forEach(r=>{tags[r.q.tag]??={total:0,correct:0};tags[r.q.tag].total++;if(r.correct)tags[r.q.tag].correct++});$("tag-results").innerHTML=Object.entries(tags).map(([tag,x])=>{const rate=Math.round(x.correct/x.total*100);return`<div class="tag-row"><span>${tag}</span><div class="tag-track"><div class="tag-fill" style="width:${rate}%"></div></div><b>${rate}%</b></div>`}).join("");renderReview(false);const wrong=state.results.filter(r=>!r.correct).length;$("review-wrong-button").disabled=!wrong;$("review-wrong-button").textContent=wrong?`間違えた${wrong}問だけ復習`:"全問正解しました"}
function renderReview(wrongOnly){const rows=wrongOnly?state.results.filter(r=>!r.correct):state.results;$("review-list").innerHTML=rows.map(r=>{const selected=r.selected===undefined?"未回答":r.q.choices[r.selected],source=r.q.source?`<p class="source">根拠：${r.q.source.url?`<a href="${r.q.source.url}" target="_blank" rel="noopener">${escapeHtml(r.q.source.label)}</a>`:escapeHtml(r.q.source.label)}</p>`:"";return`<article class="review-card ${r.correct?"":"incorrect"}"><h3>問${r.index+1}｜${formatQuestion(r.q.question)}</h3>${questionFigure(r.q)}<p class="review-answer"><b>${r.correct?"正解":"不正解"}</b>　あなたの回答：${escapeHtml(selected)}<br>正答：${escapeHtml(r.q.choices[r.q.answer])}</p><p>${escapeHtml(r.q.explanation)}</p>${source}</article>`}).join("")}
$("easy-engineering").addEventListener("click",()=>prepareExam("easy"));
$("all-easy-engineering").addEventListener("click",()=>prepareExam("easy-all"));
$("start-button").disabled=true;$("start-button").addEventListener("click",()=>prepareExam("random"));$("all-engineering").addEventListener("click",()=>prepareExam("無線工学"));$("all-law").addEventListener("click",()=>prepareExam("法規"));$("quiz-form").addEventListener("submit",grade);$("retry-button").addEventListener("click",()=>prepareExam(state.mode));["home-link","quit-button","back-button"].forEach(id=>$(id).addEventListener("click",returnHome));$("wrong-only").addEventListener("change",e=>renderReview(e.target.checked));$("review-wrong-button").addEventListener("click",()=>{$("wrong-only").checked=true;renderReview(true);$("review-title").scrollIntoView({behavior:"smooth"})});loadQuestions();
loadEasyQuestions();

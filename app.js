"use strict";
const cards = document.querySelector("#cards");
const keyword = document.querySelector("#keyword");
const scope = document.querySelector("#scope");
const count = document.querySelector("#result-count");
const panel = document.querySelector("#load-panel");
let chapters = [];
let loaded = false;

function plainText(text) {
  return text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.*?)\*\*/g, "$1");
}

function highlighted(text, query) {
  const fragment = document.createDocumentFragment();
  let position = 0;
  const lower = text.toLocaleLowerCase();
  let next = query ? lower.indexOf(query) : -1;
  while (next !== -1) {
    fragment.append(document.createTextNode(text.slice(position, next)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(next, next + query.length);
    fragment.append(mark);
    position = next + query.length;
    next = lower.indexOf(query, position);
  }
  fragment.append(document.createTextNode(text.slice(position)));
  return fragment;
}

function summarize(text) {
  const clean = plainText(text.replace(/^#{1,6}\s+.*$/gm, "")).replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const excerpt = sentences.slice(0, 2).join("").trim();
  return excerpt.length > 145 ? excerpt.slice(0, 145) + "…" : excerpt;
}

function render() {
  if (!loaded) return;
  const query = keyword.value.trim().toLocaleLowerCase();
  const matches = chapters.filter(chapter => {
    const text = scope.value === "title" ? chapter.제목 : scope.value === "body" ? chapter.본문 : `${chapter.제목}\n${chapter.본문}`;
    return text.toLocaleLowerCase().includes(query);
  });
  count.textContent = `결과 ${matches.length}건`;
  document.querySelector("#empty").hidden = matches.length !== 0;
  cards.replaceChildren();
  for (const chapter of matches) {
    const card = document.createElement("article");
    card.className = "card";
    const label = document.createElement("div");
    label.className = "card-number";
    const chapterLabel = document.createElement("span");
    chapterLabel.textContent = `제 ${chapter.장}장`;
    const number = document.createElement("span");
    number.className = "number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = chapter.장.padStart(2, "0");
    label.append(chapterLabel, number);
    const title = document.createElement("h3");
    title.append(highlighted(chapter.제목, scope.value === "body" ? "" : query));
    const summary = document.createElement("p");
    summary.className = "card-summary";
    summary.append(highlighted(summarize(chapter.본문), scope.value === "title" ? "" : query));
    const details = document.createElement("details");
    const toggle = document.createElement("summary");
    toggle.textContent = "본문 펼쳐보기";
    details.addEventListener("toggle", () => { toggle.textContent = details.open ? "본문 접기" : "본문 펼쳐보기"; });
    const body = document.createElement("p");
    body.className = "full-body";
    body.append(highlighted(plainText(chapter.본문), scope.value === "title" ? "" : query));
    details.append(toggle, body);
    card.append(label, title, summary, details);
    cards.append(card);
  }
}

function setData(data) {
  if (!Array.isArray(data) || !data.every(item => item && ["장", "제목", "본문"].every(key => typeof item[key] === "string"))) {
    throw new Error('"장", "제목", "본문" 문자열이 있는 JSON 배열을 선택해 주세요.');
  }
  chapters = [...data].sort((a, b) => a.장.localeCompare(b.장, "ko", { numeric: true }));
  loaded = true;
  panel.hidden = true;
  render();
}

function showLoadMessage(message) {
  panel.hidden = false;
  document.querySelector("#load-message").textContent = message;
  if (!loaded) count.textContent = "장 데이터를 선택해 주세요";
}

keyword.addEventListener("input", render);
scope.addEventListener("change", render);
document.querySelector("#search-form").addEventListener("submit", event => { event.preventDefault(); render(); });
document.querySelector("#clear").addEventListener("click", () => { keyword.value = ""; scope.value = "all"; render(); keyword.focus(); });
document.querySelectorAll("[data-keyword]").forEach(button => button.addEventListener("click", () => { keyword.value = button.dataset.keyword; render(); }));
document.querySelector("#data-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { setData(JSON.parse((await file.text()).replace(/^\uFEFF/, ""))); }
  catch (error) { showLoadMessage(`데이터를 읽지 못했습니다. ${error.message}`); }
});
const cityImage = document.querySelector("#city-image");
function imageFailed() { document.querySelector("#image-error").hidden = false; }
cityImage.addEventListener("error", imageFailed);
if (cityImage.complete && !cityImage.naturalWidth) imageFailed();

async function initialize() {
  if (location.protocol === "file:") {
    try {
      // file://에서는 fetch 대신 원본 JSON에서 생성한 내장 데이터를 읽는다.
      setData(JSON.parse(document.querySelector("#bundled-chapters").textContent));
    } catch (error) {
      showLoadMessage(`내장 데이터를 읽지 못했습니다. 장데이터.json을 선택해 주세요. (${error.message})`);
    }
    return;
  }
  try {
    const response = await fetch("./장데이터.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setData(JSON.parse((await response.text()).replace(/^\uFEFF/, "")));
  } catch (error) {
    showLoadMessage(`장 데이터를 불러오지 못했습니다. 같은 폴더의 장데이터.json을 선택해 주세요. (${error.message})`);
  }
}
initialize();

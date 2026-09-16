let SEANCES = [];

// ---------- familles de thématiques ----------
const FAMILIES = [
  { nom:"L'ex & la coparentalité", themes:["Conflit avec l'ex","Communication avec l'ex","Coparentalité","Garde & résidence","Argent avec l'ex","Procédure & audience","Règles chez l'autre parent","Logistique & organisation"] },
  { nom:"Mes enfants",             themes:["Sommeil des enfants","Cadre & règles à la maison","Enfant en opposition","Ados","Relation avec mes enfants","École & scolarité","Écrans"] },
  { nom:"Mes émotions",            themes:["Stress & anxiété","Culpabilité","Colère & injustice","Tristesse & deuil","Solitude & vide","Enfant intérieur","Dépendance affective"] },
  { nom:"Moi, ma confiance",       themes:["Confiance en soi","Estime de soi","Image de soi","Poser ses limites","Techniques de communication"] },
  { nom:"Mon quotidien",           themes:["Fatigue & charge mentale","Sommeil & hygiène de vie","Argent & budget","Pro & reconversion"] }
];
const CATS = ["all","Hebdomadaire","Juridique","Enfants/Ados"];
const CAT_LABEL = { all:"Toutes" };

const state = { q:"", family:null, tags:new Set(), cat:"all", covision:null, day:null };

const $list      = document.getElementById("list");
const $fams      = document.getElementById("fams");
const $subs      = document.getElementById("subs");
const $subshead  = document.getElementById("subshead");
const $chips     = document.getElementById("chips");
const $catseg    = document.getElementById("catseg");
const $dates     = document.getElementById("dates");
const $daypick   = document.getElementById("daypick");
const $clear     = document.getElementById("clear");
const $resultline= document.getElementById("resultline");
const $counts    = document.getElementById("counts");

const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

// une covision = une date + un créneau. Deux covisions le même jour sont deux entrées.
function covKey(s){ return s.date + "|" + s.jour; }
function catOf(s){
  const k = (s.kind || "").toLowerCase();
  if(k.includes("juridique")) return "Juridique";
  if(k.includes("enfant") || k.includes("ado")) return "Enfants/Ados";
  return "Hebdomadaire";
}
function countFor(tag){ return SEANCES.filter(s => s.tags.includes(tag)).length; }
function famCount(f){ return SEANCES.filter(s => s.tags.some(t => f.themes.includes(t))).length; }

function drawCounts(){
  const covs = new Set(SEANCES.map(covKey));
  const nbThemes = FAMILIES.reduce((n,f) => n + f.themes.length, 0);
  $counts.innerHTML =
    `<span><b>${SEANCES.length}</b> séances</span>` +
    `<span><b>${covs.size}</b> covisions</span>` +
    `<span><b>${nbThemes}</b> thématiques</span>` +
    `<span>mise à jour après chaque covision</span>`;
}

function drawFams(){
  FAMILIES.forEach(f => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip fam";
    b.setAttribute("aria-pressed","false");
    b.dataset.fam = f.nom;
    const c = famCount(f);
    if(!c) b.dataset.empty = "true";
    b.innerHTML = `${f.nom} <span class="n">${c}</span>`;
    b.addEventListener("click", () => {
      state.family = (state.family === f.nom) ? null : f.nom;
      state.tags.clear();
      $fams.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.fam === state.family)));
      drawThemes(); render();
    });
    $fams.appendChild(b);
  });
}

function drawThemes(){
  const f = FAMILIES.find(x => x.nom === state.family);
  $subs.hidden = !f;
  $chips.innerHTML = "";
  if(!f) return;
  $subshead.innerHTML = `Dans <b>${f.nom}</b>, précise si tu veux :`;
  f.themes.forEach(t => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(state.tags.has(t)));
    b.dataset.tag = t;
    const c = countFor(t);
    if(!c) b.dataset.empty = "true";
    b.innerHTML = `${t} <span class="n">${c}</span>`;
    b.addEventListener("click", () => {
      if(state.tags.has(t)){ state.tags.delete(t); b.setAttribute("aria-pressed","false"); }
      else { state.tags.add(t); b.setAttribute("aria-pressed","true"); }
      render();
    });
    $chips.appendChild(b);
  });
}

function drawCats(){
  CATS.forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.cat = c;
    b.setAttribute("aria-pressed", String(c === "all"));
    b.textContent = CAT_LABEL[c] || c;
    b.addEventListener("click", () => {
      state.cat = c;
      state.covision = null;
      $catseg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cat === c)));
      drawDates(); render();
    });
    $catseg.appendChild(b);
  });
}

const MAX_DATES = 10;
function drawDates(){
  const pool = SEANCES.filter(s => state.cat === "all" || catOf(s) === state.cat);
  const covs = Array.from(new Map(
    pool.slice().sort((a,b) => b.date.localeCompare(a.date) || a.jour.localeCompare(b.jour))
        .map(s => [covKey(s), s])
  ).entries());
  $dates.innerHTML = "";
  if(!covs.length){
    $dates.innerHTML = `<span class="none">Aucune covision de ce type pour l'instant.</span>`;
    return;
  }
  covs.slice(0, MAX_DATES).forEach(([k, s]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(state.covision === k));
    b.dataset.cov = k;
    const n = SEANCES.filter(x => covKey(x) === k).length;
    b.innerHTML = `${s.jour} <span class="n">${n}</span>`;
    b.addEventListener("click", () => {
      state.covision = (state.covision === k) ? null : k;
      state.day = null; $daypick.value = "";
      $dates.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cov === state.covision)));
      render();
    });
    $dates.appendChild(b);
  });
  if(covs.length > MAX_DATES){
    const more = document.createElement("span");
    more.className = "none";
    more.textContent = `+ ${covs.length - MAX_DATES} plus anciennes, va les chercher par la date ci-dessous`;
    $dates.appendChild(more);
  }
}

$daypick.addEventListener("change", () => {
  state.day = $daypick.value || null;
  state.covision = null;
  $dates.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed","false"));
  render();
});

document.getElementById("q").addEventListener("input", e => { state.q = e.target.value; render(); });

$clear.addEventListener("click", () => {
  state.q = ""; state.family = null; state.tags.clear();
  state.cat = "all"; state.covision = null; state.day = null;
  document.getElementById("q").value = "";
  $daypick.value = "";
  $fams.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed","false"));
  $catseg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cat === "all")));
  drawThemes(); drawDates(); render();
});

function matches(s){
  if(state.cat !== "all" && catOf(s) !== state.cat) return false;
  if(state.covision && covKey(s) !== state.covision) return false;
  if(state.day && s.date !== state.day) return false;
  if(state.family){
    const f = FAMILIES.find(x => x.nom === state.family);
    if(f && !s.tags.some(t => f.themes.includes(t))) return false;
  }
  for(const t of state.tags){ if(!s.tags.includes(t)) return false; }
  if(state.q.trim()){
    const hay = norm([s.who,s.titre,s.body,s.win,s.jour,catOf(s),s.tags.join(" ")].join(" "));
    if(!norm(state.q).split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}

function render(){
  const found = SEANCES.filter(matches);
  const active = state.tags.size > 0 || !!state.family || state.q.trim() !== ""
              || state.cat !== "all" || !!state.covision || !!state.day;
  $clear.hidden = !active;

  $resultline.textContent = !active
    ? `${found.length} séances, de la plus récente à la plus ancienne`
    : `${found.length} séance${found.length > 1 ? "s" : ""} sur ${SEANCES.length}`;

  if(!found.length){
    $list.innerHTML = `<div class="empty"><strong>Rien là-dessus pour l'instant</strong>Essaie un autre mot, ou enlève un filtre. La bibliothèque se remplit à chaque covision.</div>`;
    return;
  }

  $list.innerHTML = found.map(s => `
    <article class="card${s.win ? " is-win" : ""}">
      <div class="card-top">
        <span class="who">${s.who}</span>
        <span class="dot">·</span>
        <span class="when">${s.jour}</span>
        <span class="kind">${catOf(s)}</span>
      </div>
      <h2>${s.titre}</h2>
      <p class="body">${s.body}</p>
      ${s.win ? `<p class="win"><b>Win</b><span>${s.win}</span></p>` : ""}
      <div class="card-foot">
        <div class="tags">${s.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <span class="replay"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>Replay du ${s.jour} · <b>${s.at === "le début" ? "dès le début" : "à partir de " + s.at}</b></span>
      </div>
    </article>
  `).join("");
}

function boot(){
  drawCounts(); drawFams(); drawCats();
  drawThemes(); drawDates(); render();
}

fetch("seances.json", { cache: "no-store" })
  .then(r => r.ok ? r.json() : [])
  .catch(() => [])
  .then(data => { SEANCES = Array.isArray(data) ? data : []; boot(); });

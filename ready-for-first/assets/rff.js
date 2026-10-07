/* Shared engine for the Ready for First practice pages. Each page calls RFF.initPage(). */
(function(){
  "use strict";

  var UNITS = [
    {n:1, title:"Lifestyle", href:"unit-01.html", topics:"Habitual behaviour · used to and would · be/get used to · clothes · get"},
    {n:2, title:"High energy", href:"unit-02.html", topics:"Gerunds and infinitives · music · sport · affixes"}
  ];
  var TOTAL_UNITS = 12;

  /* ---------------- helpers ---------------- */
  function el(tag, cls, html){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html !== undefined) e.innerHTML = html;
    return e;
  }
  function norm(s){ return (s||"").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").replace(/[.!?]+$/,""); }
  function shuffle(a){
    a = a.slice();
    for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function store(key, fallback){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
  function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

  /* ---------------- unit progress ---------------- */
  var unit = null;
  function progressKey(id){ return "rff_progress_" + id; }
  function markDone(id, ratio){
    if(!id || !unit) return;
    var p = store(progressKey(unit.id), {});
    p[id] = ratio;
    save(progressKey(unit.id), p);
    updateProgressBar();
  }
  function unitPercent(id, ids){
    var p = store(progressKey(id), {});
    var done = ids.filter(function(x){ return x in p; }).length;
    return Math.round(done / ids.length * 100);
  }
  function updateProgressBar(){
    if(!unit) return;
    var pct = unitPercent(unit.id, unit.ids);
    var num = document.getElementById("progressNum");
    if(num){
      num.textContent = pct + "%";
      document.getElementById("progressBar").style.width = pct + "%";
    }
  }

  /* ---------------- rail ---------------- */
  function renderRail(page){
    var rail = document.getElementById("rail");
    if(!rail) return;
    var lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
    var h = '<div class="rail-group"><h2><a href="index.html">Units</a></h2><ul class="unit-list">';
    UNITS.forEach(function(u){
      var id = "unit-" + (u.n < 10 ? "0" : "") + u.n;
      h += '<li><a class="unit-item' + (page === id ? ' active" aria-current="page' : '') + '" href="' + u.href + '">Unit ' + u.n + ' · ' + u.title + '</a></li>';
    });
    if(UNITS.length < TOTAL_UNITS){
      var next = UNITS.length + 1;
      h += '<li><span class="unit-item locked">' + lock + (next === TOTAL_UNITS ? 'Unit ' + next : 'Units ' + next + '–' + TOTAL_UNITS) + ' · coming soon</span></li>';
    }
    h += '</ul></div>';
    h += '<div class="rail-group"><h2>Whole-book practice</h2><ul class="unit-list">' +
      '<li><a class="unit-item' + (page === "phrasal" ? ' active" aria-current="page' : '') + '" href="phrasal-verbs.html">Phrasal verbs</a></li>' +
      '<li><a class="unit-item' + (page === "wf" ? ' active" aria-current="page' : '') + '" href="word-formation.html">Word formation</a></li>' +
      '</ul></div>';
    if(unit){
      h += '<div class="rail-progress"><span class="num" id="progressNum">0%</span><span class="lbl"> of Unit ' + unit.n + ' done</span>' +
        '<div class="bar"><i id="progressBar" style="width:0%"></i></div>' +
        '<button class="link-btn" id="resetBtn" type="button">Reset Unit ' + unit.n + ' progress</button></div>';
    }
    rail.innerHTML = h;
    var reset = document.getElementById("resetBtn");
    if(reset) reset.addEventListener("click", function(){
      if(confirm("Reset all your Unit " + unit.n + " progress?")){
        try{ localStorage.removeItem(progressKey(unit.id)); }catch(e){}
        location.reload();
      }
    });
  }

  /* ---------------- tabs & segmented modes ---------------- */
  var modeHooks = {};
  function wireTabs(){
    document.querySelectorAll(".tab-btn").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.querySelectorAll(".tab-btn").forEach(function(b){ b.classList.toggle("active", b === btn); });
        document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("active", p.dataset.tab === btn.dataset.tab); });
        if(history.replaceState) history.replaceState(null, "", "#" + btn.dataset.tab);
      });
    });
    var start = location.hash.slice(1);
    if(start){
      var b = document.querySelector('.tab-btn[data-tab="' + start.replace(/[^a-z0-9-]/gi, "") + '"]');
      if(b) b.click();
    }
    document.querySelectorAll(".seg").forEach(function(seg){
      var scope = seg.parentNode;
      seg.querySelectorAll(".seg-btn").forEach(function(btn){
        btn.addEventListener("click", function(){
          seg.querySelectorAll(".seg-btn").forEach(function(b){ b.classList.toggle("active", b === btn); });
          scope.querySelectorAll(".mode-pane").forEach(function(p){ p.classList.toggle("active", p.dataset.mode === btn.dataset.mode); });
          if(modeHooks[btn.dataset.mode]) modeHooks[btn.dataset.mode]();
        });
      });
    });
  }

  /* ---------------- MCQ builder ---------------- */
  function buildChoice(container, qtextHTML, options, correctIndex, note, exId){
    var wrap = el("div","qitem");
    wrap.appendChild(el("p","qtext",qtextHTML));
    var grp = el("div","choice-group");
    var noteEl = note ? el("p","qnote", note) : null;
    var answered = false;
    options.forEach(function(opt, i){
      var b = el("button","choice-btn", opt);
      b.type = "button";
      b.addEventListener("click", function(){
        if(answered) return;
        answered = true;
        Array.prototype.forEach.call(grp.children, function(c, ci){
          c.disabled = true;
          if(ci === correctIndex) c.classList.add(ci === i ? "is-correct" : "is-reveal");
        });
        if(i !== correctIndex) b.classList.add("is-wrong");
        if(noteEl) noteEl.classList.add("show");
        markDone(exId, 1);
      });
      grp.appendChild(b);
    });
    wrap.appendChild(grp);
    if(noteEl) wrap.appendChild(noteEl);
    container.appendChild(wrap);
  }

  /* ---------------- gap-fill builder ---------------- */
  // segments: {text} (HTML allowed) or {gap:true, answers:[...], key:"WORD"}
  function buildGapText(container, segments){
    segments.forEach(function(seg){
      if(seg.gap){
        var inp = document.createElement("input");
        inp.type = "text";
        inp.className = "gap";
        inp.autocomplete = "off";
        inp.spellcheck = false;
        inp.setAttribute("autocapitalize","off");
        inp.dataset.answers = seg.answers.join("|");
        var longest = Math.max.apply(null, seg.answers.map(function(a){ return a.length; }));
        inp.style.width = (longest > 12 ? 24 : 11) + "ch";
        inp.setAttribute("aria-label", seg.key ? "Gap: form a word from " + seg.key : "Gap");
        container.appendChild(inp);
        if(seg.key) container.appendChild(el("span","keyword", seg.key));
      } else {
        container.appendChild(el("span", null, seg.text));
      }
    });
  }
  function checkGaps(container){
    var inputs = container.querySelectorAll(".gap");
    var correct = 0;
    inputs.forEach(function(inp){
      var accepted = inp.dataset.answers.split("|");
      var ok = accepted.map(norm).indexOf(norm(inp.value)) !== -1;
      inp.classList.remove("ok","bad");
      inp.classList.add(ok ? "ok" : "bad");
      var anchor = inp.nextElementSibling && inp.nextElementSibling.classList.contains("keyword") ? inp.nextElementSibling : inp;
      var fix = anchor.nextElementSibling && anchor.nextElementSibling.classList.contains("gap-fix") ? anchor.nextElementSibling : null;
      if(ok){ correct++; if(fix) fix.remove(); }
      else if(!fix){ anchor.after(el("span","gap-fix", accepted[0])); }
    });
    return {correct:correct, total:inputs.length};
  }

  /* ---------------- matching builder ---------------- */
  function buildMatching(container, rows, options){
    rows.forEach(function(row){
      var r = el("div","match-row");
      r.appendChild(el("span","lft", row.left));
      var sel = document.createElement("select");
      sel.className = "match-select";
      sel.dataset.answer = row.answer;
      sel.setAttribute("aria-label", "Match for " + row.left.replace(/<[^>]+>/g,""));
      sel.appendChild(new Option("Choose...", ""));
      options.forEach(function(opt){ sel.appendChild(new Option(opt.label, opt.key)); });
      r.appendChild(sel);
      container.appendChild(r);
    });
  }
  function checkMatches(container){
    var sels = container.querySelectorAll(".match-select");
    var correct = 0;
    sels.forEach(function(s){
      var ok = s.value === s.dataset.answer;
      s.classList.remove("ok","bad");
      s.classList.add(ok ? "ok" : "bad");
      if(ok) correct++;
    });
    return {correct:correct, total:sels.length};
  }

  function showResult(id, r){
    var resultEl = document.getElementById(id + "-result");
    if(!resultEl) return;
    var msg = r.correct + " of " + r.total + " correct";
    if(r.correct < r.total) msg += ". Correct answers are shown in green — try the others again.";
    resultEl.textContent = msg;
    resultEl.classList.add("show");
  }

  /* ---------------- word counter ---------------- */
  function wireWordCounter(taId, counterId, min, max){
    var ta = document.getElementById(taId);
    var counter = document.getElementById(counterId);
    ta.addEventListener("input", function(){
      var words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      counter.textContent = words + (words === 1 ? " word" : " words") + " (target: " + min + "–" + max + ")";
      counter.classList.remove("in-range","out-range");
      if(words) counter.classList.add(words >= min && words <= max ? "in-range" : "out-range");
    });
  }

  /* ---------------- delegated controls: check, show/hide, timers ---------------- */
  var timerHandles = {};
  function fmt(sec){ return Math.floor(sec/60) + ":" + (sec%60 < 10 ? "0" : "") + sec%60; }
  document.addEventListener("click", function(e){
    var check = e.target.closest("[data-check]");
    if(check){
      var id = check.dataset.check;
      var container = document.getElementById(id);
      var block = check.closest(".block");
      var r = container.querySelector(".gap") ? checkGaps(container) : checkMatches(container);
      showResult(id, r);
      markDone(block ? block.dataset.ex : null, r.correct / r.total);
      return;
    }
    var toggle = e.target.closest("[data-script]");
    if(toggle){
      if(!toggle.dataset.closedLabel) toggle.dataset.closedLabel = toggle.textContent;
      var open = document.getElementById(toggle.dataset.script).classList.toggle("show");
      toggle.textContent = open ? toggle.dataset.openLabel : toggle.dataset.closedLabel;
      toggle.setAttribute("aria-expanded", String(open));
      return;
    }
    var b = e.target.closest("[data-timer]");
    if(b){
      var key = b.dataset.clock, total = parseInt(b.dataset.timer, 10);
      var clock = document.getElementById(key), box = b.closest(".timer-box");
      if(timerHandles[key]){
        clearInterval(timerHandles[key]); timerHandles[key] = null;
        clock.textContent = fmt(total); b.textContent = "Start"; box.classList.remove("running");
        return;
      }
      var remaining = total;
      b.textContent = "Stop";
      box.classList.add("running");
      timerHandles[key] = setInterval(function(){
        remaining--;
        clock.textContent = fmt(remaining);
        if(remaining <= 0){
          clearInterval(timerHandles[key]); timerHandles[key] = null;
          clock.textContent = "Time!";
          b.textContent = "Start again";
          box.classList.remove("running");
        }
      }, 1000);
    }
  });

  function buildTimers(container, questions, seconds){
    questions.forEach(function(q, idx){
      var row = el("div","timer-box");
      var clockId = container.id + "Clock" + idx;
      row.innerHTML = '<span class="q">' + (idx+1) + '. ' + q + '</span><span class="clock" id="' + clockId + '">' + fmt(seconds) + '</span>';
      var b = el("button","btn btn-ghost btn-sm","Start");
      b.type = "button";
      b.dataset.timer = String(seconds); b.dataset.clock = clockId;
      row.appendChild(b);
      container.appendChild(row);
    });
  }

  /* ---------------- round engine (one question at a time) ---------------- */
  // question: {type:"choice", prompt, options[], correct, explain} or {type:"type", prompt, accept[], explain, hint}
  function Round(host, generator, onFinish){
    var qs = [], i = 0, score = 0;
    function start(){
      qs = generator(); i = 0; score = 0;
      if(!qs.length){ host.innerHTML = '<p class="empty">No items match these filters. Choose a different unit or verb.</p>'; return; }
      show(false);
    }
    function show(focus){
      var q = qs[i];
      host.innerHTML = "";
      var meta = el("p","round-meta");
      function setMeta(){ meta.textContent = "Question " + (i+1) + " of " + qs.length + " · Score " + score; }
      setMeta();
      host.appendChild(meta);
      host.appendChild(el("div","round-bar","<i style=\"width:" + (i / qs.length * 100) + "%\"></i>"));
      host.appendChild(el("div", null, q.prompt));
      var fb = el("p","round-fb");
      var next = el("button","btn btn-primary btn-sm", i + 1 < qs.length ? "Next question" : "See my score");
      next.type = "button";
      next.hidden = true;
      next.addEventListener("click", function(){ i++; if(i < qs.length) show(true); else finish(); });
      function done(ok){
        if(ok) score++;
        setMeta();
        fb.innerHTML = (ok ? "<strong>Correct.</strong> " : "<strong>Not quite.</strong> ") + (q.explain || "");
        fb.className = "round-fb show " + (ok ? "ok" : "bad");
        next.hidden = false;
        next.focus();
      }
      if(q.type === "choice"){
        var grp = el("div","choice-group");
        q.options.forEach(function(o, oi){
          var b = el("button","choice-btn", o);
          b.type = "button";
          b.addEventListener("click", function(){
            Array.prototype.forEach.call(grp.children, function(c, ci){
              c.disabled = true;
              if(ci === q.correct) c.classList.add(ci === oi ? "is-correct" : "is-reveal");
            });
            if(oi !== q.correct) b.classList.add("is-wrong");
            done(oi === q.correct);
          });
          grp.appendChild(b);
        });
        host.appendChild(grp);
        if(focus) grp.firstChild.focus();
      } else {
        var row = el("div","type-row");
        var inp = document.createElement("input");
        inp.type = "text"; inp.className = "type-input"; inp.autocomplete = "off"; inp.spellcheck = false;
        inp.setAttribute("autocapitalize","off");
        inp.setAttribute("aria-label","Your answer");
        var chk = el("button","btn btn-primary btn-sm","Check");
        chk.type = "button";
        var hintBtn = el("button","btn btn-ghost btn-sm","Hint");
        hintBtn.type = "button";
        var hintP = el("p","round-hint");
        hintBtn.addEventListener("click", function(){ hintP.innerHTML = q.hint; hintP.classList.add("show"); hintBtn.disabled = true; });
        function check(){
          if(!norm(inp.value)){ inp.focus(); return; }
          var ok = q.accept.map(norm).indexOf(norm(inp.value)) !== -1;
          inp.disabled = true; chk.disabled = true; hintBtn.disabled = true;
          inp.classList.add(ok ? "ok" : "bad");
          done(ok);
        }
        chk.addEventListener("click", check);
        inp.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); check(); } });
        row.appendChild(inp); row.appendChild(chk);
        if(q.hint) row.appendChild(hintBtn);
        host.appendChild(row);
        host.appendChild(hintP);
        if(focus) inp.focus();
      }
      host.appendChild(fb);
      host.appendChild(next);
    }
    function finish(){
      host.innerHTML = "";
      host.appendChild(el("p","round-meta","Round complete"));
      host.appendChild(el("p","round-score", score + "/" + qs.length));
      var ratio = score / qs.length;
      var msg = ratio >= 0.9 ? "Excellent. You know these well." : ratio >= 0.6 ? "Good work. Another round will help fix the ones you missed." : "Keep going. Review the list or the flashcards, then try again.";
      host.appendChild(el("p","round-msg", msg));
      var again = el("button","btn btn-primary btn-sm","Start a new round");
      again.type = "button";
      again.addEventListener("click", function(){ start(); var f = host.querySelector("button, input"); if(f) f.focus(); });
      host.appendChild(again);
      if(onFinish) onFinish(score, qs.length);
    }
    return {start:start};
  }

  /* ---------------- page setup ---------------- */
  function initPage(opts){
    opts = opts || {};
    unit = opts.unit || null;
    if(unit) save(progressKey(unit.id) + "_total", unit.ids.length);
    renderRail(opts.page);
    wireTabs();
    updateProgressBar();
  }

  function renderHub(container){
    var h = "";
    UNITS.forEach(function(u){
      var id = "unit-" + (u.n < 10 ? "0" : "") + u.n;
      var total = store(progressKey(id) + "_total", 0);
      var done = Object.keys(store(progressKey(id), {})).length;
      var pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
      h += '<a class="unit-card" href="' + u.href + '"><span class="n">Unit ' + u.n + '</span><h3>' + u.title + '</h3><p>' + u.topics + '</p>' +
        '<span class="plabel">' + (pct ? pct + "% done" : "Not started") + '</span><span class="pbar"><i style="width:' + pct + '%"></i></span></a>';
    });
    for(var n = UNITS.length + 1; n <= TOTAL_UNITS; n++){
      h += '<div class="unit-card locked"><span class="n">Unit ' + n + '</span><h3>Coming soon</h3></div>';
    }
    container.innerHTML = h;
  }

  window.RFF = {
    UNITS:UNITS, el:el, norm:norm, shuffle:shuffle, store:store, save:save,
    markDone:markDone, unitPercent:unitPercent, initPage:initPage, renderHub:renderHub, modeHooks:modeHooks,
    buildChoice:buildChoice, buildGapText:buildGapText, buildMatching:buildMatching,
    wireWordCounter:wireWordCounter, buildTimers:buildTimers, Round:Round
  };
})();

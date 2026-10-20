/* ==========================================================================
   灵魂成分表 · 应用主逻辑
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SOUL_LABEL;
  var CFG = window.SOUL_CONFIG;

  var LS_UNLOCK = 'soul.unlock.v2';
  var LS_PROG = 'soul.progress.v2';
  var LS_LAST = 'soul.last.v2';

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var sheetEl = document.getElementById('sheet');

  /* ---------------- 题库 ---------------- */
  var QUESTIONS = [];
  S.items.forEach(function (it) {
    QUESTIONS.push({ kind: 'likert', id: it.id, text: it.text, block: it.block });
  });
  S.scenarios.forEach(function (sc) {
    QUESTIONS.push({ kind: 'scene', id: sc.id, scene: sc.scene, hint: sc.hint, options: sc.options });
  });

  var state = {
    screen: 'gate',
    code: '',
    remaining: 0,
    maxUses: 3,
    answers: {},
    idx: 0,
    payload: null,
    resultId: null,
    at: '',
    locked: false,
    busy: false,
    gateMsg: '',
    gateErr: ''
  };

  /* ---------------- 小工具 ---------------- */
  function readLS(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function delLS(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
  }
  function normalizeCode(v) {
    return String(v || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  var toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2200);
  }

  function openSheet(html) {
    sheetEl.innerHTML = '<div class="mask" data-act="closeSheet"></div><div class="panel">' + html + '</div>';
    sheetEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    sheetEl.hidden = true;
    sheetEl.innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ---------------- 后端 ---------------- */
  function rpc(name, args) {
    if (!window.SoulBackend) return Promise.reject(new Error('后端组件未加载'));
    return window.SoulBackend.rpc(name, args);
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    var h = location.hash || '';
    var m = h.match(/^#\/r\/([A-Za-z0-9]{6,40})/);
    if (m) { loadResult(m[1]); return; }
    if (h === '#/done' && state.payload) { state.screen = 'result'; render(); return; }
    if (h === '#/demo' && /preview=1/.test(location.search)) { demo(); return; }
    if (h === '#/q' && /preview=1/.test(location.search)) {
      var qs = new URLSearchParams(location.search);
      state.code = 'PREVIEW';
      state.idx = Math.max(0, Math.min(QUESTIONS.length - 1, parseInt(qs.get('i') || '0', 10) || 0));
      state.screen = 'quiz';
      render();
      return;
    }
    if (h === '#/q' && state.code) { state.screen = 'quiz'; render(); return; }
    state.screen = 'gate';
    state.gateErr = '';
    render();
  }
  window.addEventListener('hashchange', route);

  /* ---------------- 渲染 ---------------- */
  function render() {
    var html = '';
    switch (state.screen) {
      case 'quiz': html = screenQuiz(); break;
      case 'result': html = screenResult(); break;
      case 'loading': html = screenLoading(); break;
      case 'missing': html = screenMissing(); break;
      case 'error': html = screenError(); break;
      default: html = screenGate();
    }
    app.innerHTML = html;
    var inp = app.querySelector('#code');
    if (inp && state.gateErr === '' && !state.gateMsg) {
      // 不自动聚焦，避免移动端弹键盘遮挡首屏
    }
  }

  /* ---------------- 封面 / 密码 ---------------- */
  function screenGate() {
    var unlock = readLS(LS_UNLOCK);
    var prog = readLS(LS_PROG);
    var last = readLS(LS_LAST);
    var showResume = prog && prog.answers && Object.keys(prog.answers).length > 0 && prog.code;

    return '' +
      '<div class="screen gate">' +
        '<div class="gate-top">' +
          '<div class="plate"><i></i><span class="plate-t">灵魂成分表</span><span class="plate-s">SOUL INGREDIENT LABEL</span></div>' +
          '<h1>你是由<br><em>什么</em>构成的</h1>' +
          '<p class="lede">42 道题，12 味配料。做完你会拿到一张只属于你的营养成分表——不是性格标签，是你这个人的配方。</p>' +
          '<div class="facts">' +
            '<span><b>42</b>道题</span>' +
            '<span><b>6</b>分钟</span>' +
            '<span><b>12</b>味配料</span>' +
          '</div>' +
        '</div>' +

        (showResume ? (
          '<div class="resume">' +
            '<div class="txt"><b>你有一次没做完</b>上次停在第 ' + Math.min(prog.idx + 1, QUESTIONS.length) + ' 题</div>' +
            '<button data-act="resume">继续</button>' +
          '</div>'
        ) : '') +

        '<form class="gate-form" id="gateForm" autocomplete="off" novalidate>' +
          '<label for="code">测评密码</label>' +
          '<input id="code" name="code" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="SLXX-XXXX-XX" maxlength="26" value="">' +
          '<div class="err" id="gateErr">' + esc(state.gateErr || state.gateMsg) + '</div>' +
          '<button class="btn btn-primary" type="submit" id="gateBtn">开始测试</button>' +
        '</form>' +

        '<p class="tiny" style="margin-top:12px;text-align:center">每张密码可完整测试 3 次，点击开始即计一次</p>' +

        (unlock && unlock.remaining > 0 && !showResume
          ? '<button class="link" data-act="useUnlock">用上次的密码继续（还剩 ' + unlock.remaining + ' 次）</button>'
          : '') +
        (last && last.id ? '<button class="link" data-act="openLast">查看我上次的结果</button>' : '') +

        '<div class="foot">本测试仅供自我探索，不构成心理诊断，<br>也不能替代任何专业评估。</div>' +
      '</div>';
  }

  /* ---------------- 答题 ---------------- */
  function screenQuiz() {
    var total = QUESTIONS.length;
    var q = QUESTIONS[state.idx];
    var pct = Math.round(state.idx / total * 100);
    var picked = state.answers[q.id];
    var optsHtml = '';

    if (q.kind === 'likert') {
      optsHtml = S.scale.map(function (s, i) {
        var on = picked === s.v ? ' on' : '';
        return '<button class="opt' + on + '" data-act="pick" data-v="' + s.v + '">' +
          '<span class="k">' + (i + 1) + '</span><span class="t">' + esc(s.label) + '</span></button>';
      }).join('');
    } else {
      optsHtml = q.options.map(function (o, i) {
        var on = picked === o.k ? ' on' : '';
        return '<button class="opt' + on + '" data-act="pick" data-v="' + o.k + '">' +
          '<span class="k">' + String.fromCharCode(65 + i) + '</span><span class="t">' + esc(o.text) + '</span></button>';
      }).join('');
    }

    var body = q.kind === 'likert'
      ? '<div class="qtag">PART ' + q.block + ' / 4 · ' + esc((S.blocks || [])[q.block] || '自我描述') + '</div>' +
        '<div class="qtext">' + esc(q.text) + '</div>' +
        '<div class="qhint" style="margin-top:18px">这种情况有多像你？</div>'
      : '<div class="qtag">情境 · ' + (state.idx - S.items.length + 1) + ' / ' + S.scenarios.length + '</div>' +
        '<div class="qscene">' + esc(q.scene) + '</div>' +
        '<div class="qhint">' + esc(q.hint) + '</div>';

    return '' +
      '<div class="screen quiz">' +
        '<div class="quiz-head">' +
          '<div class="quiz-step"><b>' + pad2(state.idx + 1) + '</b> / ' + total + '</div>' +
          '<button class="quiz-exit" data-act="exit">退出</button>' +
        '</div>' +
        '<div class="pbar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="qbody">' +
          body +
          '<div class="opts">' + optsHtml + '</div>' +
        '</div>' +
        '<div class="quiz-foot">' +
          '<button data-act="back">' + (state.idx === 0 ? '返回首页' : '← 上一题') + '</button>' +
          '<span class="auto">' + (q.kind === 'likert' ? '可按 1–5' : '可按 A–D') + '</span>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 结果 ---------------- */
  function screenResult() {
    var p = state.payload;
    if (!p) return screenLoading();
    var arch = S.archetypes[p.main] || S.archetypes.balanced;
    var last = readLS(LS_LAST);
    var own = !!(last && last.id && last.id === state.resultId);
    var isShared = !own && !!state.resultId;

    var maxPct = p.rows && p.rows.length ? p.rows[0].pct : 1;

    var ingRows = (p.rows || []).map(function (r) {
      var cls = r.pct === 0 ? ' zero' : '';
      var w = r.pct > 0 ? Math.max(1.5, r.pct) : 0;
      return '<div class="ing' + cls + '">' +
        '<span class="nm">' + esc(r.name) + '</span>' +
        '<span class="pc">' + r.pct + '%</span>' +
        '<span class="bar"><i style="width:' + w + '%"></i></span>' +
      '</div>';
    }).join('');

    var mysteryW = p.mystery > 0 ? Math.max(1.5, p.mystery) : 0;

    var nutRows = S.composites.map(function (c) {
      return '<div class="nut"><b>' + esc(c.name) + '</b><i class="dots"></i><span class="v">' + ((p.composites || {})[c.id] || 0) + '</span></div>';
    }).join('');

    var trg = (p.triggers || []).map(function (t) { return t.name; }).join('、') || '未检出';

    var blocks = [
      ['01', '你给人的感觉', arch.feel],
      ['02', '你的优势', arch.upside],
      ['03', '你的代价', arch.cost],
      ['04', '关系里的你', arch.relation],
      ['05', '建议补的一味', arch.supplement]
    ].map(function (b) {
      return '<div class="item"><div class="t"><i>' + b[0] + '</i><b>' + b[1] + '</b></div><p>' + esc(b[2]) + '</p></div>';
    }).join('');

    var idText = state.resultId ? state.resultId.slice(0, 10).toUpperCase() : 'LOCAL';

    return '' +
      '<div class="screen result">' +
        (isShared ? '<div class="shared-banner"><span>朋友分享了 TA 的灵魂成分表</span><button data-act="start">我也要测</button></div>' : '') +

        '<div class="res-eyebrow">测评结果 · ' + fmtDate(p.at || state.at) + '</div>' +

        '<div class="label">' +
          '<div class="top">' +
            '<div><h3>灵魂成分表</h3><div class="en">SOUL INGREDIENT LABEL</div></div>' +
            '<div class="meta">No.' + idText + '<br>' + fmtDate(p.at || state.at) + '</div>' +
          '</div>' +
          '<div class="rule"></div>' +
          '<div class="sub"><span>净含量：一份完整的你</span><span>取样 42 次</span></div>' +
          '<div class="hero-name">' + esc(arch.name) + '</div>' +
          '<div class="quote">' + esc(arch.quote) + '</div>' +

          '<h5>配料表 <span>INGREDIENTS</span><em>按含量降序</em></h5>' +
          ingRows +
          '<div class="ing mystery"><span class="nm">不明物质</span><span class="pc">' + (p.mystery || 3) + '%</span><span class="bar"><i style="width:' + mysteryW + '%"></i></span></div>' +

          '<h5>营养成分 <span>NUTRITION</span><em>每 100 g</em></h5>' +
          nutRows +

          '<dl class="kv" style="margin-top:10px;padding-top:8px;border-top:1px solid var(--ink)">' +
            '<dt>致敏原</dt><dd class="hot">' + esc(trg) + '</dd>' +
            '<dt>保质期</dt><dd>' + esc(p.shelfLife ? p.shelfLife.text : '—') + '</dd>' +
            '<dt>储存</dt><dd>' + esc(p.storage || '—') + '</dd>' +
          '</dl>' +

          '<div class="foot">本结果仅供自我探索，不构成心理诊断，也不能替代专业评估。</div>' +
        '</div>' +

        '<div class="read">' +
          '<h4>解 读</h4>' + blocks +
          '<div class="theory"><b>理论小卡 · ' + esc(arch.theoryTag) + '</b><p>' + esc(arch.theory) + '</p></div>' +
        '</div>' +

        '<div class="actions">' +
          '<button class="btn btn-primary full" data-act="save">保存结果长图</button>' +
          '<button class="btn btn-ghost" data-act="copy">复制结果链接</button>' +
          (isShared
            ? '<button class="btn btn-ghost" data-act="start">我也要测</button>'
            : '<button class="btn btn-ghost" data-act="retry">再测一次</button>') +
        '</div>' +

        '<div class="res-foot">做完可以发给那个最懂你的人，<br>也可以只留给自己。</div>' +
      '</div>';
  }

  function screenLoading() {
    return '' +
      '<div class="screen">' +
        '<div class="loading">' +
          '<div class="spin"></div>' +
          '<p><b>正在计算你的配方</b>把 42 次取样，按 12 味配料折算成一张表</p>' +
          '<div class="steps">ANALYSING…</div>' +
        '</div>' +
      '</div>';
  }

  function screenMissing() {
    return '' +
      '<div class="screen">' +
        '<div class="loading">' +
          '<p style="font-size:38px;font-weight:800;color:var(--ink);line-height:1.2">404</p>' +
          '<p><b>这个结果不存在</b>链接可能不完整，或者已经被删除了</p>' +
          '<a class="btn btn-primary" href="#" data-act="start" style="max-width:260px;margin-top:6px;text-decoration:none">去测一份</a>' +
        '</div>' +
      '</div>';
  }

  function screenError() {
    return '' +
      '<div class="screen">' +
        '<div class="loading">' +
          '<p><b>没能连上服务器</b>检查一下网络，然后重试</p>' +
          '<button class="btn btn-primary" data-act="reload" style="max-width:260px;margin-top:6px">重新加载</button>' +
          '<button class="btn btn-ghost" data-act="start" style="max-width:260px">返回首页</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- 流程 ---------------- */
  function msgFor(reason) {
    switch (reason) {
      case 'not_found': return '这个密码不存在，检查一下有没有输错';
      case 'exhausted': return '这张密码的 3 次已经用完了，换一张继续';
      case 'disabled': return '这张密码已停用';
      case 'empty': return '请先输入测评密码';
      default: return '密码校验失败，请稍后重试';
    }
  }

  function submitCode(raw) {
    if (state.busy) return;
    var code = normalizeCode(raw);
    if (code.length < 6) {
      state.gateErr = '请输入完整的测评密码';
      var errEl = document.getElementById('gateErr');
      if (errEl) errEl.textContent = state.gateErr;
      return;
    }
    state.busy = true;
    state.gateErr = '';
    var btn = document.getElementById('gateBtn');
    if (btn) { btn.textContent = '正在验证…'; btn.disabled = true; }

    rpc('soul_redeem', { p_code: code }).then(function (r) {
      if (!r || !r.ok) {
        state.gateErr = msgFor(r && r.reason);
        state.busy = false;
        render();
        return;
      }
      state.code = code;
      state.remaining = r.remaining;
      state.maxUses = r.maxUses;
      state.busy = false;
      writeLS(LS_UNLOCK, { code: code, remaining: r.remaining, maxUses: r.maxUses, at: Date.now() });
      startQuiz();
    }).catch(function (e) {
      state.busy = false;
      state.gateErr = '连接失败：' + (e.message || '请检查网络后重试');
      render();
    });
  }

  function startQuiz() {
    state.answers = {};
    state.idx = 0;
    state.payload = null;
    state.resultId = null;
    state.screen = 'quiz';
    saveProgress();
    location.hash = '#/q';
    render();
    window.scrollTo(0, 0);
  }

  function saveProgress() {
    writeLS(LS_PROG, {
      code: state.code,
      remaining: state.remaining,
      answers: state.answers,
      idx: state.idx,
      at: Date.now()
    });
  }

  function back() {
    if (state.idx === 0) {
      location.hash = '';
      state.screen = 'gate';
      render();
      return;
    }
    state.idx--;
    saveProgress();
    render();
    window.scrollTo(0, 0);
  }

  function pick(val) {
    if (state.locked) return;
    var q = QUESTIONS[state.idx];
    state.answers[q.id] = val;
    saveProgress();
    state.locked = true;

    var btns = app.querySelectorAll('.opt');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-v') === String(val));
    }

    setTimeout(function () {
      state.locked = false;
      if (state.idx < QUESTIONS.length - 1) {
        state.idx++;
        saveProgress();
        render();
        window.scrollTo(0, 0);
      } else {
        finish();
      }
    }, 190);
  }

  function finish() {
    state.screen = 'loading';
    render();
    window.scrollTo(0, 0);

    var likert = {};
    var picks = {};
    QUESTIONS.forEach(function (q) {
      var v = state.answers[q.id];
      if (v == null) { v = q.kind === 'likert' ? 3 : q.options[0].k; }
      if (q.kind === 'likert') likert[q.id] = v;
      else picks[q.id] = v;
    });

    var res = S.compute(likert);
    var triggers = S.computeTriggers(picks);

    var payload = {
      v: 1,
      main: res.main,
      rows: res.sorted.map(function (r) { return { id: r.id, name: r.name, code: r.code, pct: r.pct, raw: r.raw }; }),
      mystery: res.mystery,
      composites: res.composites,
      shelfLife: res.shelfLife,
      storage: res.storage,
      triggers: triggers,
      answers: likert,
      at: new Date().toISOString()
    };

    state.payload = payload;
    state.at = payload.at;
    delLS(LS_PROG);

    rpc('soul_save_result', { p_code: state.code, p_payload: payload }).then(function (r) {
      if (r && r.ok && r.id) {
        state.resultId = r.id;
        writeLS(LS_LAST, { id: r.id, at: payload.at, main: payload.main });
        location.hash = '#/r/' + r.id;
        state.screen = 'result';
        render();
      } else {
        finishLocal();
      }
    }).catch(function () {
      finishLocal();
    });
  }

  function finishLocal() {
    state.resultId = null;
    location.hash = '#/done';
    state.screen = 'result';
    render();
    window.scrollTo(0, 0);
    toast('结果已生成，但暂时没能同步到云端，链接分享不可用', 3200);
  }

  function loadResult(id) {
    if (state.resultId === id && state.payload) {
      state.screen = 'result';
      render();
      window.scrollTo(0, 0);
      return;
    }
    state.screen = 'loading';
    render();
    rpc('soul_get_result', { p_id: id }).then(function (r) {
      if (!r || !r.ok) {
        state.screen = 'missing';
        render();
        return;
      }
      state.payload = r.payload;
      state.resultId = id;
      state.at = r.createdAt || r.payload.at;
      state.screen = 'result';
      render();
      window.scrollTo(0, 0);
    }).catch(function () {
      state.screen = 'error';
      render();
    });
  }

  /* ---------------- 保存 / 分享 ---------------- */
  function shareUrl(id) {
    try {
      var u = new URL(location.href);
      u.hash = '#/r/' + id;
      return u.toString();
    } catch (e) {
      return location.origin + location.pathname + location.search + '#/r/' + id;
    }
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 2000);
  }

  function isMobileUA() {
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);
  }

  function handleSave() {
    if (!state.payload || !window.SoulPoster) { toast('图片生成组件未就绪'); return; }
    toast('正在生成长图…', 1600);
    setTimeout(function () {
      var canvas;
      var data = Object.assign({}, state.payload, { id: state.resultId || 'DEMO' });
      try {
        canvas = window.SoulPoster.render(data);
      } catch (e) {
        toast('生成失败：' + e.message);
        return;
      }
      var name = window.SoulPoster.filename(data);
      window.SoulPoster.toBlob(canvas).then(function (blob) {
        var file;
        try { file = new File([blob], name, { type: 'image/jpeg' }); } catch (e) { file = null; }

        if (isMobileUA() && file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: '我的灵魂成分表' }).then(function () {
            toast('已打开保存菜单');
          }).catch(function (err) {
            if (err && err.name === 'AbortError') return;
            showImageSheet(blob, name);
          });
          return;
        }

        if (!isMobileUA()) {
          downloadBlob(blob, name);
          toast('图片已保存到下载文件夹');
          return;
        }

        showImageSheet(blob, name);
      }).catch(function (e) {
        toast('生成失败：' + e.message);
        openSheet(
          '<div class="hd"><h3>图片生成失败</h3><button class="x" data-act="closeSheet">×</button></div>' +
          '<div class="bd"><p>可以换一个浏览器再试，或者直接截图保存这一页。</p></div>'
        );
      });
    }, 60);
  }

  function showImageSheet(blob, name) {
    var url = URL.createObjectURL(blob);
    openSheet(
      '<div class="hd"><h3>长按图片保存</h3><button class="x" data-act="closeSheet">×</button></div>' +
      '<div class="saveview">' +
        '<img src="' + url + '" alt="结果长图">' +
        '<p class="tip">iPhone 请长按图片，选择「存储到照片」<br>安卓可直接点下面的按钮</p>' +
        '<button class="btn btn-primary" data-act="dl" data-url="' + url + '" data-name="' + esc(name) + '">下载到本地</button>' +
      '</div>'
    );
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function handleCopy() {
    if (!state.resultId) { toast('这次结果没能同步，暂时无法生成链接'); return; }
    var url = shareUrl(state.resultId);
    copyText(url).then(function (ok) {
      toast(ok ? '链接已复制，发给朋友吧' : url, ok ? 2200 : 5000);
    });
  }

  function handleRetry() {
    var unlock = readLS(LS_UNLOCK);
    if (!unlock || !unlock.code) {
      toast('请输入新的密码');
      location.hash = '';
      state.screen = 'gate';
      render();
      return;
    }
    if (unlock.remaining <= 0) {
      toast('这张密码的 3 次用完了，换一张继续', 3000);
      location.hash = '';
      state.screen = 'gate';
      state.gateErr = '这张密码的 3 次用完了，请输入新的密码';
      render();
      return;
    }
    openSheet(
      '<div class="hd"><h3>再测一次</h3><button class="x" data-act="closeSheet">×</button></div>' +
      '<div class="bd"><p>会重新做 42 道题，占用这张密码的 1 次。<br>当前还剩 <b>' + unlock.remaining + '</b> 次。</p>' +
      '<button class="btn btn-primary" data-act="retryGo" style="margin-top:20px">开始（消耗 1 次）</button>' +
      '<button class="btn btn-ghost" data-act="closeSheet" style="margin-top:9px">先不测</button></div>'
    );
  }

  function rawRetry() {
    var unlock = readLS(LS_UNLOCK);
    if (!unlock) return;
    closeSheet();
    toast('正在准备…', 1400);
    rpc('soul_redeem', { p_code: unlock.code }).then(function (r) {
      if (!r || !r.ok) {
        location.hash = '';
        state.screen = 'gate';
        state.gateErr = msgFor(r && r.reason);
        render();
        return;
      }
      state.code = unlock.code;
      state.remaining = r.remaining;
      state.maxUses = r.maxUses;
      writeLS(LS_UNLOCK, { code: unlock.code, remaining: r.remaining, maxUses: r.maxUses, at: Date.now() });
      startQuiz();
    }).catch(function (e) {
      toast('连接失败：' + (e.message || '请重试'));
    });
  }

  /* ---------------- 示例（本地预览用） ---------------- */
  function demo() {
    var likert = {};
    S.items.forEach(function (i) { likert[i.id] = 3; });
    ['K1', 'K2', 'K3'].forEach(function (k) { likert[k] = 5; });
    ['R1', 'R2', 'R3'].forEach(function (k) { likert[k] = 4; });
    ['B1', 'B2', 'B3'].forEach(function (k) { likert[k] = 2; });
    ['L1', 'L2', 'L3'].forEach(function (k) { likert[k] = 1; });

    var picks = { S1: 'A', S2: 'B', S3: 'B', S4: 'A', S5: 'D', S6: 'A' };
    var res = S.compute(likert);
    var triggers = S.computeTriggers(picks);

    state.payload = {
      v: 1,
      id: 'DEMO',
      main: res.main,
      rows: res.sorted.map(function (r) { return { id: r.id, name: r.name, code: r.code, pct: r.pct, raw: r.raw }; }),
      mystery: res.mystery,
      composites: res.composites,
      shelfLife: res.shelfLife,
      storage: res.storage,
      triggers: triggers,
      answers: likert,
      at: new Date().toISOString()
    };
    state.resultId = null;
    state.screen = 'result';
    render();
  }

  /* ---------------- 事件 ---------------- */
  app.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'gateForm') {
      e.preventDefault();
      var inp = document.getElementById('code');
      submitCode(inp ? inp.value : '');
    }
  });

  app.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');

    switch (act) {
      case 'pick':
        e.preventDefault();
        pick(el.getAttribute('data-v'));
        break;
      case 'back':
        e.preventDefault();
        back();
        break;
      case 'exit':
        e.preventDefault();
        saveProgress();
        location.hash = '';
        state.screen = 'gate';
        render();
        toast('进度已保存，回来可以接着做');
        break;
      case 'resume': {
        e.preventDefault();
        var prog = readLS(LS_PROG);
        if (!prog) return;
        state.code = prog.code || '';
        state.answers = prog.answers || {};
        state.idx = Math.min(prog.idx || 0, QUESTIONS.length - 1);
        state.remaining = prog.remaining || 0;
        state.screen = 'quiz';
        location.hash = '#/q';
        render();
        break;
      }
      case 'useUnlock': {
        e.preventDefault();
        var u = readLS(LS_UNLOCK);
        if (u && u.code) submitCode(u.code);
        break;
      }
      case 'openLast': {
        e.preventDefault();
        var l = readLS(LS_LAST);
        if (l && l.id) { location.hash = '#/r/' + l.id; }
        break;
      }
      case 'save':
        e.preventDefault();
        handleSave();
        break;
      case 'copy':
        e.preventDefault();
        handleCopy();
        break;
      case 'retry':
        e.preventDefault();
        handleRetry();
        break;
      case 'retryGo':
        e.preventDefault();
        rawRetry();
        break;
      case 'dl': {
        e.preventDefault();
        var url = el.getAttribute('data-url');
        var nm = el.getAttribute('data-name');
        fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
          downloadBlob(b, nm);
          toast('已开始下载');
        }).catch(function () { toast('下载失败，请长按图片保存'); });
        break;
      }
      case 'closeSheet':
        closeSheet();
        break;
      case 'start':
        e.preventDefault();
        closeSheet();
        location.hash = '';
        state.screen = 'gate';
        state.payload = null;
        state.resultId = null;
        render();
        window.scrollTo(0, 0);
        break;
      case 'reload':
        location.reload();
        break;
    }
  });

  sheetEl.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'closeSheet') { closeSheet(); return; }
    if (act === 'retryGo') { rawRetry(); return; }
    if (act === 'dl') {
      var url = el.getAttribute('data-url');
      var nm = el.getAttribute('data-name');
      fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
        downloadBlob(b, nm);
      }).catch(function () {});
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (state.screen !== 'quiz' || state.locked) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    var q = QUESTIONS[state.idx];
    if (!q) return;
    var k = e.key;
    if (k === 'ArrowLeft') { back(); return; }
    if (q.kind === 'likert' && /^[1-5]$/.test(k)) { pick(Number(k)); return; }
    if (q.kind === 'scene') {
      var i = 'abcd'.indexOf(k.toLowerCase());
      if (i >= 0 && q.options[i]) pick(q.options[i].k);
    }
  });

  /* ---------------- 启动 ---------------- */
  route();
})();

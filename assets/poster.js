/* ==========================================================================
   结果长图生成 · Canvas 手绘
   --------------------------------------------------------------------------
   不依赖任何截图库：直接把结果画到 canvas 上，输出 2 倍图。
   优点：字体不会糊、不受 CSS 兼容性影响、离线可用。
   用法：const canvas = SoulPoster.render(payload)
   ========================================================================== */
(function (root) {
  'use strict';

  var S = root.SOUL_LABEL;

  var W = 750;
  var PAD = 46;
  var DPR = 2;

  var COL = {
    paper: '#F6F3EC',
    card: '#FFFDF7',
    ink: '#17150F',
    soft: '#3A362D',
    muted: '#7C7568',
    line: '#DBD3C3',
    lineSoft: '#E8E2D5',
    red: '#D33F27',
    green: '#2D5A4C',
    gold: '#B98A2A'
  };

  function f(w, s) { return w + ' ' + s + 'px "PingFang SC","HarmonyOS Sans SC","Microsoft YaHei","Hiragino Sans GB","Heiti SC",sans-serif'; }
  function m(w, s) { return w + ' ' + s + 'px "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace'; }

  function wrap(ctx, text, maxW) {
    var out = [];
    var line = '';
    var chars = String(text).split('');
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === '\n') { out.push(line); line = ''; continue; }
      var test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }

  function spaced(ctx, str, x, y, gap) {
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      ctx.fillText(str[i], cx, y);
      cx += ctx.measureText(str[i]).width + gap;
    }
    return cx;
  }

  function fmtDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  function render(p) {
    var arch = S.archetypes[p.main] || S.archetypes.balanced;
    var H = 5200;

    var cv = document.createElement('canvas');
    cv.width = W * DPR;
    cv.height = H * DPR;
    var ctx = cv.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.paper;
    ctx.fillRect(0, 0, W, H);

    var L = PAD;
    var R = W - PAD;
    var CW = R - L;
    var y = 0;

    function txt(str, x, baseline, font, color, align) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align || 'left';
      ctx.fillText(str, x, baseline);
      ctx.textAlign = 'left';
    }

    function para(str, x, top, maxW, font, color, fs, lh) {
      ctx.font = font;
      ctx.fillStyle = color;
      var lines = wrap(ctx, str, maxW);
      for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, top + fs + i * lh);
      return top + fs + (lines.length - 1) * lh;
    }

    function hr(yy, color, h) {
      ctx.fillStyle = color || COL.line;
      ctx.fillRect(L, yy, CW, h || 1);
    }

    /* ---------------- 页眉 ---------------- */
    y = 92;
    txt('灵魂成分表', L, y, f(800, 27), COL.ink);

    ctx.font = f(600, 10);
    ctx.fillStyle = COL.muted;
    spaced(ctx, 'SOUL INGREDIENT LABEL', L, y + 20, 2.6);

    txt('No.', R, y - 12, m(400, 10.5), COL.muted, 'right');
    txt(String(p.id || 'DEMO').toUpperCase().slice(0, 16), R, y + 4, m(400, 12), COL.soft, 'right');
    txt(fmtDate(p.at), R, y + 20, m(400, 10.5), COL.muted, 'right');

    y = y + 34;
    ctx.fillStyle = COL.ink;
    ctx.fillRect(L, y, CW, 5);
    ctx.fillStyle = COL.line;
    ctx.fillRect(L, y + 9, CW, 1);

    /* ---------------- 净含量 ---------------- */
    y = y + 40;
    txt('净含量：一份完整的你', L, y, f(500, 12.5), COL.muted);
    txt('取样 42 次 · 配料 12 味', R, y, f(500, 12.5), COL.muted, 'right');

    /* ---------------- 主料名 ---------------- */
    y = y + 66;
    txt(arch.name, L, y, f(800, 52), COL.ink);

    y = y + 40;
    y = para(arch.quote, L, y, CW, f(400, 20), COL.soft, 20, 34);

    /* ---------------- 配料表 ---------------- */
    y = y + 46;
    hr(y, COL.ink, 1);
    y = y + 26;
    txt('配料表', L, y, f(700, 15), COL.ink);
    ctx.font = f(600, 9.5);
    ctx.fillStyle = COL.muted;
    spaced(ctx, 'INGREDIENTS', L + 58, y, 1.8);
    txt('按含量降序', R, y, f(400, 10.5), COL.muted, 'right');

    y = y + 12;

    var maxPct = p.rows && p.rows.length ? p.rows[0].pct : 1;
    (p.rows || []).forEach(function (row) {
      y = y + 30;
      txt(row.name, L, y, f(600, 15), COL.ink);

      var nameW = ctx.measureText(row.name).width;
      var barX = L + nameW + 14;
      var barW = R - 46 - barX;
      if (barW < 30) barW = 30;

      ctx.fillStyle = COL.lineSoft;
      ctx.fillRect(barX, y - 9, barW, 4);
      ctx.fillStyle = row.pct >= 15 ? COL.ink : COL.muted;
      ctx.fillRect(barX, y - 9, Math.max(2, barW * (row.pct / 100)), 4);

      txt(row.pct + '%', R, y, m(500, 13.5), COL.ink, 'right');
    });

    y = y + 30;
    txt('不明物质', L, y, f(500, 15), COL.muted);
    txt((p.mystery || 3) + '%', R, y, m(500, 13.5), COL.muted, 'right');

    /* ---------------- 营养成分 ---------------- */
    y = y + 34;
    hr(y, COL.ink, 1);
    y = y + 26;
    txt('营养成分', L, y, f(700, 15), COL.ink);
    ctx.font = f(600, 9.5);
    ctx.fillStyle = COL.muted;
    spaced(ctx, 'NUTRITION', L + 74, y, 1.8);
    txt('每 100 g', R, y, f(400, 10.5), COL.muted, 'right');

    y = y + 8;
    S.composites.forEach(function (c) {
      y = y + 27;
      var val = (p.composites || {})[c.id] || 0;
      txt(c.name, L, y, f(500, 13.5), COL.soft);

      var nameW = ctx.measureText(c.name).width;
      var dx = L + nameW + 10;
      var dw = R - 42 - dx;
      if (dw > 10) {
        ctx.save();
        ctx.strokeStyle = COL.line;
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 4]);
        ctx.beginPath();
        ctx.moveTo(dx, y - 4);
        ctx.lineTo(dx + dw, y - 4);
        ctx.stroke();
        ctx.restore();
      }
      txt(String(val), R, y, m(500, 13.5), COL.ink, 'right');
    });

    /* ---------------- 致敏原 / 保质 ---------------- */
    y = y + 30;
    hr(y, COL.line, 1);
    y = y + 24;

    var trg = (p.triggers || []).map(function (t) { return t.name; }).join(' · ') || '未检出';
    txt('致敏原', L, y, f(500, 13), COL.soft);
    txt(trg, L + 62, y, f(600, 13), COL.red);

    y = y + 24;
    txt('保质期', L, y, f(500, 13), COL.soft);
    txt(p.shelfLife ? p.shelfLife.text : '—', L + 62, y, f(400, 13), COL.soft);

    y = y + 24;
    txt('储存', L, y, f(500, 13), COL.soft);
    txt(p.storage || '—', L + 62, y, f(400, 13), COL.soft);

    /* ---------------- 解读 ---------------- */
    y = y + 46;
    hr(y, COL.ink, 1);
    y = y + 30;
    txt('解读', L, y, f(700, 15), COL.ink);
    ctx.font = f(600, 9.5);
    ctx.fillStyle = COL.muted;
    spaced(ctx, 'READ THE LABEL', L + 44, y, 1.8);

    var blocks = [
      ['01', '你给人的感觉', arch.feel],
      ['02', '你的优势', arch.upside],
      ['03', '你的代价', arch.cost],
      ['04', '关系里的你', arch.relation],
      ['05', '建议补的一味', arch.supplement]
    ];

    blocks.forEach(function (b) {
      y = y + 34;
      txt(b[0], L, y, m(400, 10.5), COL.red);
      txt(b[1], L + 26, y, f(600, 12.5), COL.muted);

      y = y + 8;
      y = para(b[2], L, y, CW, f(400, 15.5), COL.soft, 15.5, 27);
    });

    /* ---------------- 理论小卡 ---------------- */
    y = y + 30;
    var tagFont = f(600, 10.5);
    var theoryFont = f(400, 13.2);
    ctx.font = theoryFont;
    var theoryLines = wrap(ctx, arch.theory, CW - 44);

    var cardTop = y;
    var cardH = 44 + theoryLines.length * 23;
    ctx.fillStyle = '#EFE8D8';
    ctx.fillRect(L, cardTop, CW, cardH);
    ctx.fillStyle = COL.gold;
    ctx.fillRect(L, cardTop, 3, cardH);

    txt('理论小卡 · ' + arch.theoryTag, L + 22, cardTop + 26, tagFont, COL.gold);
    ctx.font = theoryFont;
    ctx.fillStyle = COL.soft;
    for (var i = 0; i < theoryLines.length; i++) {
      ctx.fillText(theoryLines[i], L + 22, cardTop + 50 + i * 23);
    }
    y = cardTop + cardH;

    /* ---------------- 页脚 ---------------- */
    y = y + 44;
    hr(y, COL.line, 1);
    y = y + 26;

    var site = ((root.SOUL_CONFIG && root.SOUL_CONFIG.site) || 'soul-label').replace(/^https?:\/\//, '').replace(/\/$/, '');
    txt('想知道自己是什么做的？来测一份', L, y, f(600, 12), COL.green);
    txt(site, R, y, m(400, 10.5), COL.muted, 'right');

    y = y + 22;
    txt('本结果仅供自我探索，不构成心理诊断，也不能替代专业评估。', L, y, f(400, 11), COL.muted);

    y = y + 20;
    txt('SOUL INGREDIENT LABEL · 42 ITEMS · ' + fmtDate(p.at), L, y, m(400, 9.5), '#A79E8C');

    var used = Math.ceil(y + PAD);

    /* 外框 */
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(16.5, 16.5, W - 33, used - 33);

    /* 裁切 */
    var out = document.createElement('canvas');
    out.width = W * DPR;
    out.height = used * DPR;
    var o = out.getContext('2d');
    o.drawImage(cv, 0, 0, W * DPR, used * DPR, 0, 0, W * DPR, used * DPR);
    return out;
  }

  function filename(p) {
    var arch = S.archetypes[p.main] || S.archetypes.balanced;
    return '灵魂成分表-' + arch.name + '.jpg';
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('图片生成失败'));
      }, 'image/jpeg', 0.94);
    });
  }

  root.SoulPoster = { render: render, toBlob: toBlob, filename: filename };
})(window);

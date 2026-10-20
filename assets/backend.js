/* ==========================================================================
   后端适配层
   --------------------------------------------------------------------------
   默认走 Supabase（PostgREST RPC），也保留 WorkBuddy 云服务作为备用。
   前端只认一件事：SoulBackend.rpc(函数名, 参数对象) → Promise<jsonb>
   安全边界不在前端：表上开 RLS 且不给 anon 任何权限，所有读写只能通过
   SECURITY DEFINER 函数完成（见 supabase/schema.sql）。
   ========================================================================== */
(function (root) {
  'use strict';

  var CFG = root.SOUL_CONFIG || {};
  var _cloud = null;

  function backendCfg() { return CFG.backend || {}; }

  function activeDriver() {
    var b = backendCfg();
    if (b.supabase && b.supabase.url && b.supabase.anonKey) return 'supabase';
    if (CFG.cloud && CFG.cloud.endpoint) return 'workbuddy';
    return 'none';
  }

  function unwrap(name, d) {
    if (Array.isArray(d)) d = d[0];
    if (d && typeof d === 'object' && d[name] && Object.keys(d).length === 1) d = d[name];
    return d;
  }

  /* ---------------- Supabase ---------------- */
  function sbRpc(name, args) {
    var cfg = backendCfg().supabase || {};
    if (!cfg.url || !cfg.anonKey) {
      return Promise.reject(new Error('Supabase 未配置'));
    }
    // proxyUrl 可选：填了就整个请求改走反代域名，其余路径不变
    var root = String(cfg.proxyUrl || cfg.url).replace(/\/+$/, '');
    var url = root + '/rest/v1/rpc/' + name;

    return fetch(url, {
      method: 'POST',
      headers: {
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = null;
        if (t) { try { d = JSON.parse(t); } catch (e) { d = null; } }
        if (!r.ok) {
          var msg = (d && (d.message || d.hint || d.details)) || ('服务返回 ' + r.status);
          var err = new Error(msg);
          err.code = d && d.code;
          err.status = r.status;
          throw err;
        }
        return unwrap(name, d);
      });
    });
  }

  /* ---------------- WorkBuddy 云服务（备用，按需加载） ---------------- */
  function loadSdk() {
    if (root.WorkBuddyCloud) return Promise.resolve(root.WorkBuddyCloud);
    if (loadSdk._p) return loadSdk._p;
    loadSdk._p = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js';
      s.async = true;
      s.onload = function () {
        root.WorkBuddyCloud ? resolve(root.WorkBuddyCloud) : reject(new Error('SDK 未就绪'));
      };
      s.onerror = function () { reject(new Error('SDK 加载失败')); };
      document.head.appendChild(s);
    });
    return loadSdk._p;
  }

  function wbRpc(name, args) {
    if (_cloud) {
      return _cloud.database.rpc(name, args).then(handleWb(name));
    }
    return loadSdk().then(function (sdk) {
      _cloud = sdk.createWorkBuddyCloud({
        endpoint: CFG.cloud.endpoint,
        oauthRelayBaseUrl: CFG.cloud.oauthRelayBaseUrl,
        publishableKey: CFG.cloud.publishableKey
      });
      return _cloud.database.rpc(name, args);
    }).then(handleWb(name));
  }

  function handleWb(name) {
    return function (res) {
      if (res && res.error) {
        var e = new Error(res.error.message || '服务返回错误');
        e.code = res.error.code;
        throw e;
      }
      return unwrap(name, res ? res.data : null);
    };
  }

  /* ---------------- 对外 ---------------- */
  root.SoulBackend = {
    driver: activeDriver,
    rpc: function (name, args) {
      var d = activeDriver();
      if (d === 'supabase') return sbRpc(name, args);
      if (d === 'workbuddy') return wbRpc(name, args);
      return Promise.reject(new Error('后端未配置'));
    }
  };
})(window);

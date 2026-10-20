/* ==========================================================================
   站点配置
   --------------------------------------------------------------------------
   backend.driver : 'supabase' 走 Supabase；'workbuddy' 走原云服务（备用）
   backend.supabase.url / anonKey : Supabase 项目设置 → API 里复制
     · anon / publishable key 是设计上公开的，可以放在前端
     · 真正的权限由数据库里的 RLS + SECURITY DEFINER 函数控制
   site : 结果长图页脚展示用，写站点地址
   ========================================================================== */
window.SOUL_CONFIG = {
  backend: {
    driver: 'supabase',
    supabase: {
      url: 'https://isfracrnarfgdqhqnptp.supabase.co',
      anonKey: 'sb_publishable_0NRuYylTaYT8BNtD4lDbRA_Bkff2MUY',
      // 可选：国内直连 *.supabase.co 不稳时，在这里填自己的反代域名
      // 例如 'https://api.yourdomain.com'，请求路径不变
      proxyUrl: ''
    }
  },

  /* 备用后端：WorkBuddy 云服务（driver = 'workbuddy' 时生效） */
  cloud: {
    endpoint: 'https://soul-label.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_TXqVmbVDJ0o9KJG5zsfFD4_fUBa0NJ1FF2Ho7DUQqSl1wCtIL3WFu2H'
  },

  site: 'https://jing1120411.github.io/soul-label'
};

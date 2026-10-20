-- ============================================================================
--  灵魂成分表 · Supabase 初始化脚本
--  用法：Supabase 控制台 → SQL Editor → New query → 整段粘贴 → Run
--  说明：三张表全部开启 RLS 且不向 anon / authenticated 开放任何表权限，
--        所有读写只能通过下面的 SECURITY DEFINER 函数完成。
--        因此前端泄露 anon key 也不会导致密码表或结果被批量拖走。
-- ============================================================================

-- ---------------------------------------------------------------- 表
create table if not exists public.soul_codes (
  code          text primary key,
  max_uses      int not null default 3,
  used          int not null default 0,
  active        boolean not null default true,
  note          text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create table if not exists public.soul_results (
  id          text primary key,
  code        text not null,
  archetype   text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.soul_admin (
  pass        text primary key,
  created_at  timestamptz not null default now()
);

create index if not exists soul_results_code_idx on public.soul_results (code);

-- ---------------------------------------------------------------- 权限
alter table public.soul_codes   enable row level security;
alter table public.soul_results enable row level security;
alter table public.soul_admin   enable row level security;

revoke all on public.soul_codes   from anon, authenticated;
revoke all on public.soul_results from anon, authenticated;
revoke all on public.soul_admin   from anon, authenticated;

-- ---------------------------------------------------------------- 核销密码
-- 原子扣次：只有 used < max_uses 的行会被更新，并发下不会超发
create or replace function public.soul_redeem(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_row public.soul_codes%rowtype;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;

  update public.soul_codes
     set used = used + 1,
         last_used_at = now()
   where code = v_code
     and active = true
     and used < max_uses
  returning * into v_row;

  if found then
    return jsonb_build_object('ok', true, 'remaining', v_row.max_uses - v_row.used, 'maxUses', v_row.max_uses);
  end if;

  select * into v_row from public.soul_codes where code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  elsif not v_row.active then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  else
    return jsonb_build_object('ok', false, 'reason', 'exhausted', 'maxUses', v_row.max_uses);
  end if;
end;
$$;

-- ---------------------------------------------------------------- 保存结果
create or replace function public.soul_save_result(p_code text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_id text;
  v_arch text;
  v_try int := 0;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'bad_payload');
  end if;
  if length(p_payload::text) > 20000 then
    return jsonb_build_object('ok', false, 'reason', 'payload_too_large');
  end if;
  if not exists (select 1 from public.soul_codes where code = v_code and active = true) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  v_arch := coalesce(nullif(p_payload->>'main', ''), 'unknown');

  loop
    v_try := v_try + 1;
    v_id := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    begin
      insert into public.soul_results (id, code, archetype, payload)
      values (v_id, v_code, v_arch, p_payload);
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ---------------------------------------------------------------- 读取结果
-- 只能按 id 精确读单条，不开放表查询，避免被枚举
create or replace function public.soul_get_result(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_created timestamptz;
begin
  if p_id is null or length(btrim(p_id)) < 8 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select payload, created_at into v_payload, v_created
    from public.soul_results
   where id = lower(btrim(p_id))
   limit 1;

  if v_payload is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'payload', v_payload, 'createdAt', v_created);
end;
$$;

-- ---------------------------------------------------------------- 后台
create or replace function public.soul_admin_create_codes(
  p_pass text, p_count int, p_uses int default 3, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := greatest(1, least(coalesce(p_count, 1), 100));
  v_uses  int := greatest(1, least(coalesce(p_uses, 3), 99));
  v_out   jsonb := '[]'::jsonb;
  v_code  text;
  v_i     int := 0;
  v_guard int := 0;
begin
  if not exists (select 1 from public.soul_admin where pass = p_pass) then
    return jsonb_build_object('ok', false, 'reason', 'bad_pass');
  end if;

  while v_i < v_count and v_guard < v_count * 20 loop
    v_guard := v_guard + 1;
    v_code := 'SL' || upper(substr(md5(random()::text || clock_timestamp()::text || v_i::text), 1, 8));
    begin
      insert into public.soul_codes (code, max_uses, note) values (v_code, v_uses, p_note);
      v_out := v_out || to_jsonb(v_code);
      v_i := v_i + 1;
    exception when unique_violation then
      null;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'codes', v_out, 'uses', v_uses);
end;
$$;

create or replace function public.soul_admin_list_codes(p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not exists (select 1 from public.soul_admin where pass = p_pass) then
    return jsonb_build_object('ok', false, 'reason', 'bad_pass');
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'code', code, 'maxUses', max_uses, 'used', used,
             'active', active, 'note', note, 'createdAt', created_at
           ) order by created_at desc
         ), '[]'::jsonb)
    into v_out
    from public.soul_codes;

  return jsonb_build_object('ok', true, 'codes', v_out);
end;
$$;

create or replace function public.soul_admin_stats(p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not exists (select 1 from public.soul_admin where pass = p_pass) then
    return jsonb_build_object('ok', false, 'reason', 'bad_pass');
  end if;

  select jsonb_build_object(
    'ok', true,
    'codes',    (select count(*) from public.soul_codes),
    'uses',     (select coalesce(sum(used), 0) from public.soul_codes),
    'capacity', (select coalesce(sum(max_uses), 0) from public.soul_codes),
    'results',  (select count(*) from public.soul_results),
    'recent',   (select coalesce(jsonb_agg(jsonb_build_object('archetype', archetype, 'createdAt', created_at) order by created_at desc), '[]'::jsonb)
                   from (select archetype, created_at from public.soul_results order by created_at desc limit 20) t),
    'byArchetype', (select coalesce(jsonb_object_agg(archetype, c), '{}'::jsonb)
                      from (select archetype, count(*) as c from public.soul_results group by archetype) u)
  ) into v_out;

  return v_out;
end;
$$;

-- ---------------------------------------------------------------- 连通性自检
create or replace function public.soul_ping()
returns jsonb
language sql
stable
as $$ select jsonb_build_object('ok', true, 'ver', '1.0', 'at', now()) $$;

-- ---------------------------------------------------------------- 授权
grant execute on function public.soul_redeem(text)                        to anon, authenticated;
grant execute on function public.soul_save_result(text, jsonb)            to anon, authenticated;
grant execute on function public.soul_get_result(text)                    to anon, authenticated;
grant execute on function public.soul_admin_create_codes(text, int, int, text) to anon, authenticated;
grant execute on function public.soul_admin_list_codes(text)              to anon, authenticated;
grant execute on function public.soul_admin_stats(text)                   to anon, authenticated;
grant execute on function public.soul_ping()                              to anon, authenticated;

-- ============================================================================
--  后台口令不放这里（仓库是公开的）。请单独执行下面这句，自己改一个口令：
--
--    insert into public.soul_admin (pass) values ('你的口令');
--
--  之后打开 /admin.html，用这个口令登录即可生成测评密码。
-- ============================================================================

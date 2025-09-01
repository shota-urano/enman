-- DB-004: 初期データ投入/最適化
-- 内容: categories/accounts の初期マスタ投入用関数の作成と補助コメント

create schema if not exists public;

-- 初期カテゴリ/アカウントを household 単位で投入する関数
-- 何度呼んでも重複しないように household/name/type の存在チェックを行う
create or replace function public.seed_initial_masters(p_household uuid)
returns void
language plpgsql
as $$
declare
begin
  -- categories (expense)
  perform 1 from public.categories where household_id = p_household and name = '食費' and type = 'expense';
  if not found then
    insert into public.categories (household_id, name, type, sort_order)
    values
      (p_household, '食費', 'expense', 10),
      (p_household, '日用品', 'expense', 20),
      (p_household, '交通', 'expense', 30),
      (p_household, '住居', 'expense', 40),
      (p_household, '水道光熱', 'expense', 50),
      (p_household, '通信', 'expense', 60),
      (p_household, '医療', 'expense', 70),
      (p_household, '教育', 'expense', 80),
      (p_household, '娯楽', 'expense', 90),
      (p_household, '交際', 'expense', 100),
      (p_household, 'その他', 'expense', 110);
  end if;

  -- categories (income)
  perform 1 from public.categories where household_id = p_household and name = '給与' and type = 'income';
  if not found then
    insert into public.categories (household_id, name, type, sort_order)
    values
      (p_household, '給与', 'income', 10),
      (p_household, '賞与', 'income', 20),
      (p_household, 'その他収入', 'income', 30);
  end if;

  -- accounts
  perform 1 from public.accounts where household_id = p_household and name = '口座';
  if not found then
    insert into public.accounts (household_id, name, type, sort_order)
    values
      (p_household, '口座', 'bank', 10),
      (p_household, 'クレジットカード', 'card', 20),
      (p_household, '現金', 'cash', 30);
  end if;
end;
$$;

comment on function public.seed_initial_masters(uuid) is '世帯IDを指定して初期カテゴリ/アカウントを投入するユーティリティ（冪等）';


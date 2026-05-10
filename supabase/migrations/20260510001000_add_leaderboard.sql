alter table public.profiles
  add column if not exists show_on_leaderboard boolean not null default false;

create or replace function public.get_yesterday_leaderboard(
  range_start timestamptz,
  range_end timestamptz
)
returns table (
  metric text,
  user_id uuid,
  email_prefix text,
  value numeric
)
language sql
security definer
set search_path = public, auth
as $$
  with opted_in as (
    select
      p.user_id,
      split_part(coalesce(u.email, ''), '@', 1) as email_prefix,
      p.gender,
      p.date_of_birth,
      p.height_cm,
      p.activity_level
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where p.show_on_leaderboard = true
  ),
  latest_weight_yesterday as (
    select distinct on (w.user_id)
      w.user_id,
      w.weight::numeric as weight
    from public.weights w
    join opted_in o on o.user_id = w.user_id
    where w.created_at >= range_start
      and w.created_at < range_end
    order by w.user_id, w.created_at desc
  ),
  latest_weight_overall as (
    select distinct on (w.user_id)
      w.user_id,
      w.weight::numeric as weight
    from public.weights w
    join opted_in o on o.user_id = w.user_id
    where w.created_at < range_end
    order by w.user_id, w.created_at desc
  ),
  meals_yesterday as (
    select
      m.user_id,
      sum(m.calories)::numeric as eaten
    from public.meals m
    join opted_in o on o.user_id = m.user_id
    where m.created_at >= range_start
      and m.created_at < range_end
    group by m.user_id
  ),
  workouts_yesterday as (
    select
      w.user_id,
      sum(w.calories_burned)::numeric as burned
    from public.workouts w
    join opted_in o on o.user_id = w.user_id
    where w.created_at >= range_start
      and w.created_at < range_end
    group by w.user_id
  ),
  burn_profile as (
    select
      o.user_id,
      case
        when o.gender is null
          or o.date_of_birth is null
          or o.height_cm is null
          or o.activity_level is null
          or lwo.weight is null
        then null
        else round(
          (
            case
              when o.gender = 'male'
              then 10 * lwo.weight + 6.25 * o.height_cm - 5 * extract(year from age(range_start::date, o.date_of_birth)) + 5
              else 10 * lwo.weight + 6.25 * o.height_cm - 5 * extract(year from age(range_start::date, o.date_of_birth)) - 161
            end
          )
          *
          case o.activity_level
            when 'sedentary' then 1.2
            when 'light' then 1.375
            when 'moderate' then 1.55
            when 'active' then 1.725
            else null
          end
        )::numeric
      end as estimated_daily_burn
    from opted_in o
    left join latest_weight_overall lwo on lwo.user_id = o.user_id
  ),
  weight_rankings as (
    select
      'weight'::text as metric,
      o.user_id,
      o.email_prefix,
      lwy.weight as value
    from opted_in o
    join latest_weight_yesterday lwy on lwy.user_id = o.user_id
  ),
  net_rankings as (
    select
      'netCalories'::text as metric,
      o.user_id,
      o.email_prefix,
      (coalesce(my.eaten, 0) - bp.estimated_daily_burn - coalesce(wy.burned, 0))::numeric as value
    from opted_in o
    join burn_profile bp on bp.user_id = o.user_id
    left join meals_yesterday my on my.user_id = o.user_id
    left join workouts_yesterday wy on wy.user_id = o.user_id
    where bp.estimated_daily_burn is not null
      and (my.user_id is not null or wy.user_id is not null)
  ),
  workout_rankings as (
    select
      'workoutBurn'::text as metric,
      o.user_id,
      o.email_prefix,
      wy.burned as value
    from opted_in o
    join workouts_yesterday wy on wy.user_id = o.user_id
  )
  select * from weight_rankings
  union all
  select * from net_rankings
  union all
  select * from workout_rankings;
$$;

revoke all on function public.get_yesterday_leaderboard(timestamptz, timestamptz) from public;
grant execute on function public.get_yesterday_leaderboard(timestamptz, timestamptz) to authenticated;

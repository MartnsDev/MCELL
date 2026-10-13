-- Unknown shipping measurements remain zero, never guessed. Inventory can be
-- maintained manually while checkout stays blocked until measurements exist.
begin;
alter table public.mc_variants drop constraint mc_variants_weight_g_check;
alter table public.mc_variants drop constraint mc_variants_height_cm_check;
alter table public.mc_variants drop constraint mc_variants_width_cm_check;
alter table public.mc_variants drop constraint mc_variants_length_cm_check;
alter table public.mc_variants add constraint mc_variants_weight_g_check check(weight_g>=0);
alter table public.mc_variants add constraint mc_variants_height_cm_check check(height_cm>=0);
alter table public.mc_variants add constraint mc_variants_width_cm_check check(width_cm>=0);
alter table public.mc_variants add constraint mc_variants_length_cm_check check(length_cm>=0);

create function public.mc_order_measurements_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.mc_variants where id=new.variant_id and
   (weight_g<=0 or height_cm<=0 or width_cm<=0 or length_cm<=0)) then
  raise exception 'MEASUREMENTS_REQUIRED';
 end if;
 return new;
end $$;
revoke all on function public.mc_order_measurements_guard() from public,anon,authenticated;
grant execute on function public.mc_order_measurements_guard() to service_role;
create trigger order_measurements_guard before insert on public.mc_order_items
for each row execute function public.mc_order_measurements_guard();
commit;

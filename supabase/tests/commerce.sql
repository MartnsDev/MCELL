begin;
create function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'ASSERT: %',msg; end if;end$$;
grant execute on function pg_temp.assert(boolean,text) to authenticated;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.admin_users(user_id) values('00000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.mc_save_product('{"id":"00000000-0000-4000-8000-000000000010","category_id":null,"name":"Test cable","slug":"test-cable","description":"Test only","brand":"Test","product_type":"Cable","compatibility":"USB-C","specs":{},"images":[],"featured":true,"active":true,"variants":[{"id":"00000000-0000-4000-8000-000000000011","label":"USB-C","sku":"TEST-C","attributes":{},"image":null,"price_cents":1990,"promo_cents":null,"stock":2,"active":true,"weight_g":100,"height_cm":2,"width_cm":11,"length_cm":16,"cost_cents":500}]}');
reset role;
update public.mc_products set category_id=(select id from public.mc_categories limit 1) where slug='test-cable';
update public.mc_settings set pickup_enabled=true,pickup_address='TEST ADDRESS',pickup_hours='TEST HOURS',manual_payment=true,payment_enabled=true;
select pg_temp.assert((public.mc_catalog()->'products'->0->'variants'->0->>'sku')='TEST-C','real catalog');
select pg_temp.assert(not ((public.mc_catalog()->'products'->0->'variants'->0) ? 'cost_cents'),'cost not public');
select pg_temp.assert(not has_table_privilege('anon','public.mc_costs','select'),'anonymous no cost access');
select pg_temp.assert(not has_table_privilege('authenticated','public.mc_repairs','update'),'client cannot mutate repairs');
select pg_temp.assert(not has_function_privilege('authenticated','public.mc_create_order(jsonb,jsonb,text,jsonb,uuid,text,text,uuid,text,text,integer)','execute'),'order RPC service only');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.assert((select count(*)=0 from public.mc_costs),'RLS hides costs from non-admin');
do $$begin begin perform public.mc_save_product('{}');raise exception 'expected denial';exception when others then if sqlerrm='expected denial' then raise;end if;if sqlerrm<>'UNAUTHORIZED' then raise;end if;end;end$$;
reset role;
select public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{"name":"Test"}','pickup',null,null,'test','mercadopago','00000000-0000-4000-8000-000000000020','request','secret') as order_id \gset
select pg_temp.assert((select total_cents=1990 and shipping_cents=0 from public.mc_orders where id=:'order_id'),'server price and free pickup');
select pg_temp.assert((select stock=1 from public.mc_variants where sku='TEST-C'),'stock reservation');
select pg_temp.assert(public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','pickup',null,null,'test','mercadopago','00000000-0000-4000-8000-000000000020','request','secret')=:'order_id'::uuid,'idempotent retry');
select pg_temp.assert((select stock=1 from public.mc_variants where sku='TEST-C'),'retry no extra reservation');
do $$begin begin perform public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":2}]','{}','pickup',null,null,'test','manual',gen_random_uuid(),'r','s');raise exception 'expected shortage';exception when others then if sqlerrm<>'INSUFFICIENT_STOCK' then raise;end if;end;end$$;
select pg_temp.assert(public.mc_record_payment('event-1',:'order_id','123','approved',1990,'BRL')='paid','verified payment');
select pg_temp.assert(public.mc_record_payment('event-1',:'order_id','123','approved',1990,'BRL')='duplicate','duplicate notification');
select pg_temp.assert(public.mc_record_payment('event-2',:'order_id','124','approved',1990,'BRL')='extra_payment_requires_refund','extra charge flagged');
select pg_temp.assert((select count(*)=2 from public.mc_payment_events),'events recorded once');
select public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','pickup',null,null,'test','manual','00000000-0000-4000-8000-000000000021','r','s') as exp_id \gset
update public.mc_orders set expires_at=now()-interval '1 minute' where id=:'exp_id';
select pg_temp.assert(public.mc_expire_orders()=1,'expiration');
select pg_temp.assert(public.mc_expire_orders()=0,'expiration idempotent');
select pg_temp.assert((select stock=1 from public.mc_variants where sku='TEST-C'),'expired stock restored once');
insert into public.mc_repairs(id,access_hash,customer,brand,model,defect,description,modality,terms_snapshot)
 values('00000000-0000-4000-8000-000000000030','repair-secret','{}','Test','Phone','Screen','Test only','mail','Terms accepted');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"awaiting_shipment","shipping_instructions":"Pack after authorization"}','Authorized',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"device_received"}','Received',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"diagnosing"}','Diagnosis',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"awaiting_approval","diagnosis":"Replace screen","estimate_cents":10000,"return_cents":2500}','Estimate ready',true);
do $$begin begin perform public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"repairing"}','Unauthorized start',true);raise exception 'expected denial';exception when others then if sqlerrm<>'INVALID_TRANSITION' then raise;end if;end;end$$;
reset role;
select public.mc_repair_decision('00000000-0000-4000-8000-000000000030','repair-secret',1,true);
set local role authenticated;
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"repairing"}','Approved repair',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"testing"}','Testing',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"awaiting_postage","tests":"Screen and charging passed"}','Tests complete',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000030','{"status":"shipped","outbound_tracking":"TEST123"}','Return shipped',true);
reset role;
select pg_temp.assert((select approved_version=1 and status='shipped' from public.mc_repairs where id='00000000-0000-4000-8000-000000000030'),'approved repair workflow');
select pg_temp.assert((select count(*)>0 from public.mc_audit),'audit exists');
select pg_temp.assert(public.mc_limit('test',1,600),'rate first accepted');
select pg_temp.assert(not public.mc_limit('test',1,600),'rate second denied');

-- Quote expiry, changes, and shipping totals are enforced inside the transaction.
update public.mc_settings set shipping_enabled=true,origin_cep='01001000';
insert into public.mc_quotes(id,cart_hash,destination_cep,service,provider,price_cents,days,expires_at,payload)
values('00000000-0000-4000-8000-000000000050','quote-cart','20040020','SEDEX','test',2500,3,now()+interval '10 minutes','{"quote_settings":{"origin_cep":"01001000","packing_weight_g":100,"packing_padding_cm":2},"cart_snapshot":[["00000000-0000-4000-8000-000000000011",1,1990,100,2,11,16]]}');
select public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','shipping','{"cep":"20040020"}','00000000-0000-4000-8000-000000000050','quote-cart','manual','00000000-0000-4000-8000-000000000051','ship','hash') as ship_id \gset
select pg_temp.assert((select subtotal_cents=1990 and shipping_cents=2500 and total_cents=4490 from public.mc_orders where id=:'ship_id'),'shipping separate from subtotal');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select public.mc_update_order(:'ship_id','cancelled','');
reset role;
update public.mc_quotes set expires_at=now()-interval '1 minute' where id='00000000-0000-4000-8000-000000000050';
do $$begin begin perform public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','shipping','{"cep":"20040020"}','00000000-0000-4000-8000-000000000050','quote-cart','manual',gen_random_uuid(),'ship','hash');raise exception 'expected expiration';exception when others then if sqlerrm<>'QUOTE_EXPIRED' then raise;end if;end;end$$;
update public.mc_quotes set expires_at=now()+interval '10 minutes' where id='00000000-0000-4000-8000-000000000050';
update public.mc_variants set price_cents=2090 where sku='TEST-C';
do $$begin begin perform public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','shipping','{"cep":"20040020"}','00000000-0000-4000-8000-000000000050','quote-cart','manual',gen_random_uuid(),'ship','hash');raise exception 'expected quote change';exception when others then if sqlerrm<>'QUOTE_CHANGED' then raise;end if;end;end$$;
do $$declare oid uuid;begin select id into oid from public.mc_orders where request_key='00000000-0000-4000-8000-000000000020';begin perform public.mc_record_payment('wrong-amount',oid,'999','approved',1,'BRL');raise exception 'expected mismatch';exception when others then if sqlerrm<>'PAYMENT_MISMATCH' then raise;end if;end;end$$;
select pg_temp.assert(not exists(select 1 from public.mc_payment_events where event_key='wrong-amount'),'mismatched payment not recorded as approved');

do $$begin begin perform public.mc_create_order('[{"variant_id":"00000000-0000-4000-8000-000000000011","quantity":1}]','{}','pickup',null,null,'test','manual',gen_random_uuid(),'price','hash',1);raise exception 'expected changed price';exception when others then if sqlerrm<>'PRICE_CHANGED' then raise;end if;end;end$$;
-- Identity and current version required for customer approval; rejected devices can be returned.
insert into public.mc_repairs(id,access_hash,customer,brand,model,defect,description,modality,terms_snapshot,status,estimate_cents,estimate_version)
 values('00000000-0000-4000-8000-000000000060','decision-secret','{}','Test','Phone','Screen','Test only','mail','Terms accepted','awaiting_approval',10000,2);
do $$begin begin perform public.mc_repair_decision('00000000-0000-4000-8000-000000000060','wrong-secret',2,true);raise exception 'expected denial';exception when others then if sqlerrm<>'UNAUTHORIZED' then raise;end if;end;end$$;
do $$begin begin perform public.mc_repair_decision('00000000-0000-4000-8000-000000000060','decision-secret',1,true);raise exception 'expected outdated';exception when others then if sqlerrm<>'ESTIMATE_CHANGED' then raise;end if;end;end$$;
select public.mc_repair_decision('00000000-0000-4000-8000-000000000060','decision-secret',2,false);
set local role authenticated;
select public.mc_admin_repair('00000000-0000-4000-8000-000000000060','{"status":"awaiting_postage"}','Declined: return pending',true);
select public.mc_admin_repair('00000000-0000-4000-8000-000000000060','{"status":"shipped","outbound_tracking":"REFUSED123"}','Returned without repair',true);
reset role;
select pg_temp.assert((select approved_version is null and status='shipped' from public.mc_repairs where id='00000000-0000-4000-8000-000000000060'),'refused repair return allowed');
insert into public.mc_repairs(id,access_hash,customer,brand,model,defect,description,modality,terms_snapshot,status,estimate_cents,return_cents,estimate_version,approved_version)
 values('00000000-0000-4000-8000-000000000070','pay-secret','{}','Test','Phone','Screen','Test only','mail','Terms accepted','approved',10000,2500,1,1);
select public.mc_create_repair_order('00000000-0000-4000-8000-000000000070','pay-secret','mercadopago','00000000-0000-4000-8000-000000000071','repair-order') as repair_order \gset
select pg_temp.assert((select subtotal_cents=10000 and shipping_cents=2500 and total_cents=12500 from public.mc_orders where id=:'repair_order'),'approved service plus return shipping');
select pg_temp.assert(public.mc_create_repair_order('00000000-0000-4000-8000-000000000070','pay-secret','mercadopago',gen_random_uuid(),'retry')=:'repair_order'::uuid,'repair charge idempotent by estimate version');
select pg_temp.assert(public.mc_record_payment('service-paid',:'repair_order','service-123','approved',12500,'BRL')='paid','service payment confirmed');

rollback;

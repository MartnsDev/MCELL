// Merchant-supplied files only. Private costs never enter public filenames.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
const root = process.cwd();
const privateDir = path.join(root, 'data/imports');
const originals = path.join(privateDir, 'originals');
const output = path.join(root, 'public/produtos');
await Promise.all([fs.mkdir(originals, {recursive:true}), fs.mkdir(output, {recursive:true})]);
const manifest = path.join(privateDir, 'products.json');
let previous = [];
try { previous = JSON.parse(await fs.readFile(manifest, 'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
const records = new Map(previous.map(p => [p.product.slug, p]));
const cents = value => Math.round(Number(value.replace(',', '.')) * 100);
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const descriptions = {
 'i11': ['Fone Bluetooth Lehmox i11', 'Fones', 'Fone Bluetooth', 'Fone sem fios Lehmox i11. A embalagem informa Bluetooth 5.3.', 'Aparelhos com conexão Bluetooth', {'Modelo':'i11','Bluetooth':'5.3 (informação da embalagem)'}],
 'i12': ['Fone Bluetooth Lehmox i12', 'Fones', 'Fone Bluetooth', 'Fone sem fios Lehmox i12 com estojo. A embalagem informa Bluetooth 5.3.', 'Aparelhos com conexão Bluetooth', {'Modelo':'i12','Bluetooth':'5.3 (informação da embalagem)'}],
 'le-1': ['Kit carregador turbo Lehmox LE-1 iOS', 'Carregadores', 'Kit carregador', 'Kit Lehmox LE-1 iOS com carregador de tomada e cabo Lightning. A embalagem informa saída de 30 W; confirme a compatibilidade com seu aparelho.', 'Aparelhos com entrada Lightning', {'Modelo':'LE-1 iOS','Potência':'30 W (informação da embalagem)'}],
 'le-2010': ['Cabo USB-A para Lightning Lehmox LE-2010', 'Cabos', 'Cabo', 'Cabo de dados Lehmox LE-2010 iOS branco, USB-A para Lightning. A embalagem informa comprimento de 1 metro e corrente de 4,8 A.', 'Aparelhos com entrada Lightning', {'Modelo':'LE-2010 iOS','Comprimento':'1 m','Corrente':'4,8 A (informação da embalagem)','Cor':'Branco'}],
 'le-2012': ['Cabo USB-A para USB-C Lehmox LE-2012', 'Cabos', 'Cabo', 'Cabo de dados Lehmox LE-2012 tipo C, USB-A para USB-C. A embalagem informa comprimento de 1 metro e corrente de 4,8 A.', 'Aparelhos com entrada USB-C', {'Modelo':'LE-2012 TC','Comprimento':'1 m','Corrente':'4,8 A (informação da embalagem)'}],
 'le-2013': ['Cabo USB-A para Lightning Lehmox LE-2013', 'Cabos', 'Cabo', 'Cabo de dados Lehmox LE-2013 iOS preto, USB-A para Lightning. A embalagem informa comprimento de 1 metro e corrente de 4,8 A.', 'Aparelhos com entrada Lightning', {'Modelo':'LE-2013 iOS','Comprimento':'1 m','Corrente':'4,8 A (informação da embalagem)','Cor':'Preto'}],
 'dc-cd4010': ['Cabo USB-C para Lightning Dotcell DC-CD4010', 'Cabos', 'Cabo', 'Cabo Dotcell DC-CD4010, USB-C para Lightning, para carga e sincronização de aparelhos compatíveis.', 'Aparelhos com entrada Lightning; fonte com saída USB-C', {'Modelo':'DC-CD4010','Conectores':'USB-C / Lightning'}],
};
// Existing public photos may be renamed to "product-slug 4.webp" to confirm stock.
// Read all quantities before regenerating the canonical image URLs.
const stockPhotos = [];
for (const file of await fs.readdir(output)) {
 const match = file.match(/^([a-z0-9-]+)\s+(\d+)\s*\.webp$/);
 if (!match) continue;
 const record = records.get(match[1]);
 const stock = Number(match[2]);
 if (!record) throw new Error(`Produto desconhecido na foto com estoque: ${file}`);
 if (!Number.isSafeInteger(stock) || stock > 1000000) throw new Error(`Estoque inválido: ${file}`);
 if (stockPhotos.some(photo => photo.slug === match[1])) throw new Error(`Mais de uma quantidade para o produto: ${match[1]}`);
 stockPhotos.push({file, slug:match[1], stock});
}
for (const {file, slug:productSlug, stock} of stockPhotos) {
 const record = records.get(productSlug);
 record.confirmed_stock = stock;
 record.product.variants[0].stock = stock;
 record.pending = record.pending.filter(item => item !== 'Estoque');
 await fs.rename(path.join(output, file), path.join(output, `${productSlug}.webp`));
}
for(const dir of [originals, path.join(root,'public/Produtos'), output]) {
 const files = await fs.readdir(dir).catch(e => { if(e.code === 'ENOENT') return []; throw e; });
 for(const file of files) {
  if(!/\.jpe?g$/i.test(file)) continue;
  const match = path.parse(file).name.match(/^(.*?)\s+(\d+(?:,\d{2})?)\s*-\s*(\d+,\d{2})(?:\s+(?:-\s*)?(\d+))?$/);
  if(!match) { if(dir !== output) throw new Error(`Nome sem custo/venda reconhecíveis: ${file}`); continue; }
  const source = path.join(dir,file);
  const model = match[1].replace(/LE-\s+/i,'LE-').replace(/DC-\s+/i,'DC-').toLowerCase();
  const key = Object.keys(descriptions).find(k => model.startsWith(k));
  if(!key) throw new Error(`Modelo precisa de descrição confirmada: ${match[1]}`);
  const [name,category,type,description,compatibility,specs] = descriptions[key];
  const productSlug = slug(name);
  const old = records.get(productSlug);
  const selling = cents(match[3]);
  const stock = match[4] === undefined ? old?.confirmed_stock ?? null : Number(match[4]);
  if(stock !== null && (!Number.isSafeInteger(stock) || stock > 1000000)) throw new Error('Estoque inválido');
  const image = `/produtos/${productSlug}.webp`;
  await sharp(source).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toFile(path.join(output, `${productSlug}.webp`));
  records.set(productSlug, {
   category_name:category, category_slug:slug(category), confirmed_stock:stock,
   suggested_reference_cents:selling+500, reference_confirmed:false,
   product:{ id:old?.product.id ?? randomUUID(), category_id:'', name,slug:productSlug,description,brand:key.startsWith('dc-')?'Dotcell':'Lehmox',product_type:type,compatibility,specs,images:[image],featured:true,active:false,
    variants:[{id:old?.product.variants[0].id ?? randomUUID(),label:specs.Cor ?? 'Modelo da foto',sku:key.toUpperCase(),attributes:specs.Cor?{Cor:specs.Cor}:{},image:null,price_cents:selling,promo_cents:null,cost_cents:cents(match[2]),stock:stock??0,active:true,weight_g:0,height_cm:0,width_cm:0,length_cm:0}]},
   pending:['Categoria no cadastro','Peso e dimensões para frete',...(stock===null?['Estoque']:[]),'Confirmar preço de tabela antes de anunciar desconto'],
  });
  if(dir !== originals) await fs.rename(source,path.join(originals,file));
 }
}
if (records.size === 0) throw new Error('Nenhuma importação privada disponível; catálogo público existente preservado.');
await fs.writeFile(manifest,JSON.stringify([...records.values()],null,2)+'\n');
// Publishable snapshot contains selling prices and stock, never acquisition costs.
const pick = (record, keys) => Object.fromEntries(keys.map(key => [key, record[key]]));
const publicRecords = [...records.values()].map(record => ({
 category_name: record.category_name, category_slug: record.category_slug,
 confirmed_stock: record.confirmed_stock,
 product: { ...pick(record.product, ['id','category_id','name','slug','description','brand','product_type','compatibility','specs','images','featured','active']),
  variants: record.product.variants.map(v => pick(v, ['id','label','sku','attributes','image','price_cents','promo_cents','stock','active','weight_g','height_cm','width_cm','length_cm']))
 }
}));
await fs.mkdir(path.join(root, 'data/catalog'), {recursive:true});
await fs.writeFile(path.join(root, 'data/catalog/products.json'), JSON.stringify(publicRecords,null,2)+'\n');

console.log(`${records.size} cadastros preparados em arquivo privado. Imagens públicas sem valores de custo. Nenhum estoque ou preço de tabela inventado; banco não alterado.`);

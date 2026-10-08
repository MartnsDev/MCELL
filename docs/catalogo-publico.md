# Catálogo público e importação privada

`data/catalog/products.json` contém apenas descrições, fotos, preços de venda e estoques informados pelo responsável. A vitrine usa esses dados em modo de consulta enquanto o catálogo Supabase não existe. A compra online continua dependendo das migrações, das credenciais do servidor e dos dados de frete confirmados.

Custos de compra e fotos originais com custos nos nomes são arquivos locais em `data/imports`, excluídos do Git. A documentação comercial privada também permanece local. Não copie custos para arquivos públicos ou para a versão pública do catálogo.

O comando `npm run produtos:preparar` atualiza os cadastros privados e gera uma cópia pública com campos explicitamente permitidos. Em um clone novo, os arquivos privados não existem; adicione seus arquivos de importação localmente antes de executar o comando. Os dados publicados não devem ser sobrescritos por uma importação vazia.

A rota de importação continua exigindo conta administrativa e usa apenas os arquivos privados locais. Quando o banco for configurado, importe os registros com custos no ambiente privado e confirme peso, dimensões e estoque antes de ativar compras.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## M'Cell — catálogo e persistência

Este projeto foi convertido para varejo de eletrônicos e assistência técnica. O catálogo novo usa tabelas `mc_*`, não o catálogo estático de camisas. Preserve IDs de produtos, variações e referências de pedidos existentes. Produtos, categorias, preços, imagens e estoque são cadastrados no painel, sem alterar código. Não invente produtos, vendas, endereços ou preços para preencher vitrines vazias.

Não reescreva migrações históricas nem apague dados para atualizar o catálogo. A migração incremental 0013 estabelece o domínio novo; futuras mudanças exigem nova migração incremental. Os dados antigos e os arquivos em `docs/legacy-assets` são preservados para reversão; sua remoção exige backup e análise dos efeitos. Consulte `docs/auditoria-migracao.md` e o README.

## Pedidos, pagamentos e segurança

Valores comerciais usam centavos inteiros. O navegador envia IDs e quantidades; o banco recalcula o preço e reserva estoque atomicamente. Nunca trate o subtotal esperado do cliente como preço autorizado. Custos de aquisição são exclusivamente administrativos. Não confirme pagamento pelo retorno visual: valide assinatura do webhook, consulte o provedor e processe eventos de forma idempotente.

Não introduza frete fictício. Retirada exige endereço confirmado e tem custo zero. Cotações reais têm provedor, pacote, destino, preço e vencimento persistidos. Credenciais privadas pertencem apenas ao servidor. Preserve RLS e autorização em cada endpoint administrativo.

## Assistência técnica

Não registre senha de desbloqueio no formulário público. Preserve protocolos, chave privada, termos aceitos e histórico. O reparo só pode iniciar depois da aprovação registrada da versão atual do orçamento. Mudanças de diagnóstico ou valores exigem nova aprovação. Fotos de assistência ficam em bucket privado e devem passar pelo processamento seguro de upload.

## Validação

Execute `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:security:db` e `npm run build` para alterações relevantes nos fluxos. Os testes de banco são descartáveis e não acessam produção. Fixtures visuais nunca devem ser importados pela aplicação; após testes isolados, recompile usando as variáveis corretas antes do deploy.

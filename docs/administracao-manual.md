# Administração manual da M’Cell

Acesso: `/adm/1031825277`. Senha definida somente em `MCELL_ADMIN_PIN`, variável privada do servidor. Nunca usar prefixo `NEXT_PUBLIC_`, incluir em arquivos versionados ou enviar credenciais ao navegador.

O painel permite editar os produtos existentes, preço, estoque por variação, descrição, imagens, categorias e destaques. “Salvar estoque” modifica apenas a quantidade disponível, sem reenviar preço, custo ou identidade do produto. Se a quantidade mudou por uma venda ou edição simultânea, o servidor retorna conflito e solicita nova conferência. O histórico de auditoria existente registra a alteração.

Os sete cadastros já preparados podem ser abertos por “Carregar os cadastros preparados”, inclusive no deploy que contém apenas a cópia pública do catálogo. Confirme categoria, medidas de entrega e custo antes de salvar; os IDs existentes são preservados. Custos não presentes na cópia pública precisam ser preenchidos pelo responsável.

## Ativar em produção

No projeto **mcell**, em Vercel → Settings → Environment Variables → Production, configure:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`): valores públicos do Supabase exclusivo da M’Cell.
- `SUPABASE_SERVICE_ROLE_KEY`: chave privada desse mesmo projeto Supabase.
- `MCELL_ADMIN_PIN`: a senha escolhida pelo responsável.
- `MCELL_ADMIN_USER_ID`: UUID da conta do responsável, já cadastrada em Authentication e em `public.admin_users`.

No banco exclusivo da M’Cell, aplique as migrações históricas até 0013 se ainda estiverem pendentes. Esta alteração não cria nova migração. Não usar o banco/projeto/domínios da GM. O código não cria contas, concede privilégios nem altera dados remotamente durante o deploy.

Se ainda não existir um responsável, crie a conta no painel Authentication do Supabase. Registre o UUID confirmado em `public.admin_users` pela ferramenta administrativa do próprio Supabase. Faça um novo deploy após configurar as variáveis.

O PIN é comparado no servidor com digest de tamanho fixo. Há limites persistidos no banco, incluindo dez tentativas globais a cada dez minutos. Após validar senha e vínculo do responsável, o servidor gera e verifica um token interno do Supabase para a conta configurada; não envia e-mail nem devolve tokens/links ao navegador. Toda leitura/escrita continua exigindo `getUser`, `is_admin` e RLS como antes. Uma falha na configuração mantém o acesso fechado.

Referências: [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

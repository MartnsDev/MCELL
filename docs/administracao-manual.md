# Administração manual da M’Cell

Acesso: `/adm/1031825277`. Senha definida somente em `MCELL_ADMIN_PIN`, variável privada do servidor. Nunca usar prefixo `NEXT_PUBLIC_`, incluir em arquivos versionados ou enviar credenciais ao navegador.

O painel permite editar os produtos existentes, preço, estoque por variação, descrição, imagens, categorias e destaques. “Salvar estoque” modifica apenas a quantidade disponível, sem reenviar preço, custo ou identidade do produto. Se a quantidade mudou por uma venda ou edição simultânea, o servidor retorna conflito e solicita nova conferência. O histórico de auditoria existente registra a alteração.

Os sete cadastros já preparados podem ser abertos por “Carregar os cadastros preparados”, inclusive no deploy que contém apenas a cópia pública do catálogo. Confirme categoria e custo ao salvar; medidas ainda desconhecidas podem permanecer em zero e mantêm o produto apenas para consulta. Os IDs existentes são preservados. Custos não presentes na cópia pública precisam ser preenchidos pelo responsável.

## Ativar em produção

No projeto **mcell**, em Vercel → Settings → Environment Variables → Production, configure:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`): valores públicos do Supabase exclusivo da M’Cell.
- `SUPABASE_SERVICE_ROLE_KEY`: chave privada desse mesmo projeto Supabase.
- `MCELL_ADMIN_PIN`: a senha escolhida pelo responsável.
- `MCELL_ADMIN_SESSION_SECRET`: segredo aleatório privado com pelo menos 32 caracteres, usado somente no servidor para assinar a sessão do painel.
- `MCELL_ADMIN_USER_ID`: UUID da conta do responsável, já cadastrada em Authentication e em `public.admin_users`.

No banco exclusivo da M’Cell, aplique as migrações históricas até 0013 e a nova migração incremental 0014. Ela permite registrar medidas desconhecidas como zero, mantendo o estoque editável e impedindo pedidos desses produtos até a confirmação das medidas. Nenhuma medida de entrega é inventada. Não usar o banco/projeto/domínios da GM. O código não cria contas, concede privilégios nem altera dados remotamente durante o deploy.

Se ainda não existir um responsável, crie a conta no painel Authentication do Supabase. Registre o UUID confirmado em `public.admin_users` pela ferramenta administrativa do próprio Supabase. Faça um novo deploy após configurar as variáveis.

O PIN é comparado no servidor com digest de tamanho fixo. Há limites persistidos no banco, incluindo dez tentativas globais a cada dez minutos. Após validar senha e vínculo do responsável, o servidor gera e verifica um token interno do Supabase para a conta configurada; não envia e-mail nem devolve tokens/links ao navegador. Toda leitura/escrita continua exigindo `getUser`, `is_admin` e RLS como antes. Uma falha na configuração mantém o acesso fechado.

Referências: [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Extensão pgcrypto em um banco novo

No Supabase, `gen_random_bytes` pode estar em `extensions`. Se a CLI não incluir esse schema na sessão e a migração 0013 falhar, execute a cópia integral do arquivo numa sessão com `set search_path = public, extensions;`. Depois de confirmar a instalação completa, registre 0013 como aplicada com `supabase migration repair 0013 --status applied`. Não altere a migração histórica nem marque como aplicada uma execução que falhou.

## Proteção adicional da sessão

A migração incremental 0015 adiciona registros de sessão exclusivos do servidor, sem leitura ou escrita para clientes do Supabase. A senha gera uma prova assinada com nonce aleatório e validade de oito horas. Ela fica em cookie HttpOnly, SameSite=Strict e Secure na produção, com prefixo `__Host-` e sem Domain. Cada página e API administrativa exige simultaneamente conta verificada, papel administrativo, prova assinada vinculada ao responsável e registro de sessão ainda válido no banco.

Uma sessão comum do Supabase não substitui a senha do painel. Sair apaga a prova no banco antes de limpar o cookie; reutilizar o cookie antigo não permite reabrir a administração. Alterar a senha ou o segredo de assinatura invalida as provas existentes. Os limites persistidos de tentativas e a validação de origem continuam ativos. As respostas administrativas não são armazenadas em cache.

Aplique 0015 antes do deploy e configure o segredo privado na Vercel. Sessões antigas precisam entrar novamente com a senha. Não há promessa de segurança absoluta: uma senha longa oferece mais resistência a adivinhação do que um PIN de quatro dígitos.

# Identidade visual M'Cell

A vitrine foi redesenhada a partir da imagem de referência fornecida pelo responsável: faixa superior azul, cabeçalho branco com busca por categoria, banner de acessórios, oito atalhos, vitrine compacta, assistência em três etapas, benefícios e rodapé azul. A versão móvel reorganiza as mesmas seções para evitar overflow.

A logo atual é o M vetorial simples em `public/brand/mcell-m.svg`, azul no cabeçalho e branco no rodapé. O arquivo original `public/logo-mcell.png` foi preservado, mas não é usado pela vitrine. As fotografias em `public/brand` foram geradas a partir da referência: são aproximações, não os arquivos originais do mockup. O CSS é `src/app/storefront.css`; os originais PNG são preservados junto às versões WebP utilizadas pela página. Para igualdade visual exata, substitua as fotografias pelos arquivos originais correspondentes e confira novamente as proporções no navegador.

As fontes Inter e Caveat são servidas localmente. Suas licenças OFL acompanham os arquivos em `public/fonts`.

Produtos, preços, estoque, contatos e endereço continuam provenientes do catálogo persistido. Não foram cadastrados produtos demonstrativos ou copiados contatos do mockup. A vitrine mostra mais vendidos somente quando existem vendas registradas; caso contrário, usa produtos em destaque. As configurações de visibilidade e os textos personalizados continuam aplicados. Textos padrão do tema anterior recebem a nova redação de referência na apresentação; um texto personalizado mantém seu valor.

Os atalhos de categorias apontam aos filtros do catálogo; novas categorias também ficam disponíveis na busca do cabeçalho. Favoritos são preferências locais persistidas no navegador, sem afetar estoque ou pedidos. O carrinho do cabeçalho usa os preços atuais das variações do catálogo. Produtos com várias versões abrem a seleção antes da inclusão no carrinho.

Os símbolos sociais no rodapé são decorativos enquanto os perfis da empresa não foram cadastrados. O botão verde usa o WhatsApp configurado; sem esse contato, abre o atendimento pela assistência.

Validação visual e funcional usa o catálogo isolado descrito em `docs/testes-navegador.md`, sem acessar dados comerciais reais.

## Foto de assistência atualizada

A imagem atual é `public/brand/repair-natural-mcell.webp`, com o PNG original em `public/brand/repair-natural-mcell.png`. Foi criada com a ferramenta integrada imagegen, em modo de geração. É uma imagem sintética fotorrealista, não um registro da equipe da empresa. A versão anterior permanece preservada.

Prompt utilizado:

> Use case: photorealistic repair workshop photograph. Asset: electronics repair service website banner, landscape 3:2. Documentary photography of an actual-looking independent Brazilian smartphone repair workbench, candid and modest, NOT an advertisement render. Close view of technician's two naturally proportioned bare hands using a small precision screwdriver on an opened smartphone lying flat on a worn blue silicone repair mat. One hand steadies the edge of the phone, other holds screwdriver properly over a tiny frame screw; believable anatomy, five fingers, realistic skin pores. Phone has black rectangular battery and realistic restrained circuit board details, screen assembly placed next to it and a few small organized tools, no brands or readable text. Soft daylight from nearby window, neutral natural colors, realistic exposure, subtle grain, slight imperfections, true optical depth of field, professional full-frame documentary photo with 50mm lens, f/4. Composition: hands and phone centered and fully within frame, enough context to read clearly at 270x134 pixels. Avoid fake glossy 3D surfaces, cinematic blue glow, sparks, sci-fi circuits, floating tools, deformed fingers, soldering into a battery, logos, watermarks and typography. This should convincingly resemble a genuine unposed photograph of phone repair.

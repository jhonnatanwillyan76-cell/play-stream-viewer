# Plano de Otimização e Qualidade - Maré TV

Para resolver os problemas de duplicidade, qualidade de imagem e precisão do catálogo, implementarei as seguintes melhorias:

## 1. Deduplicação e Priorização de Qualidade
*   **Agrupamento por Slug**: Os filmes serão agrupados pelo seu identificador único (slug).
*   **Critérios de Seleção**: Entre itens duplicados, o sistema priorizará aquele com marcadores de maior resolução no nome (ex: 4K, 1080p, FHD, BluRay) em detrimento de versões menores (HD, 720p, CAM).
*   **Limpeza de Metadados**: Remoção de tags técnicas do nome exibido (ex: "Toy Story 5 1080p BluRay" vira apenas "Toy Story 5") após o uso dessa informação para a seleção da melhor versão.

## 2. Melhoria das Imagens (Capas Reais)
*   **Upgrade de Resolução TMDB**: As URLs de logos que apontam para o TMDB serão automaticamente convertidas para a versão original ou de alta fidelidade (`original` ou `w780` em vez de `w300` ou `w600`).
*   **Remoção de Capas Genéricas**: Detecção e filtragem de logos temporários ou de baixa qualidade fornecidos pela M3U, tentando buscar a capa real baseada no título.

## 3. Estabilidade do Catálogo
*   **Refinamento do Cache**: Garantir que a lógica de "Stale-While-Revalidate" não apenas sirva dados antigos, mas que a limpeza e deduplicação ocorram no momento da gravação no cache para evitar lentidão no frontend.

## Detalhes Técnicos
*   Alteração na função `parseM3U` em `src/lib/m3u.functions.ts` para implementar o Map de deduplicação de filmes (similar ao já existente para séries).
*   Implementação de um score de qualidade baseado em regex para comparar versões de um mesmo título.
*   Regex global para substituição de caminhos de imagem do TMDB.

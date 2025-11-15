

## Bugs Edição de Geometria (05/11/2025)

- [ ] Mover Geometria - Mapa: Vértices não acompanham polígono ao mover
- [ ] Rotacionar - Mapa (Livre): Rotação não acompanha movimento do mouse



## Ferramenta Adicionar Vértice (v3.1.0)

- [x] Criar submenu para "Adicionar" (Mapa / Coordenadas)
- [x] Implementar modal lateral para inserção de coordenadas
- [x] Adicionar abas: Coordenada Geográfica e Coordenada UTM
- [x] Criar dropdown para escolher vértice anterior
- [x] Implementar lógica de inserção após vértice anterior
- [ ] Testar inserção de vértices em polígonos existentes
- [x] Remover emoji do título do modal
- [x] Remover dropdown de camada e usar camada ativa
- [x] Debugar dropdown de vértice anterior



## Ferramenta Adicionar Vértice por Azimute e Distância (v3.2.0)

- [x] Criar submenu "Azimute e Distância" no menu "Adicionar"
- [x] Criar modal com campos: Vértice Anterior, ID do Novo Vértice
- [x] Implementar tabela de entrada (Azimute, Distância, ID)
- [x] Implementar cálculo de coordenadas usando azimute e distância
- [x] Implementar lógica de inserção de múltiplos vértices
- [x] Testar inserção de vértices com azimute e distância


## Ferramenta Adicionar Vértice por Rumo e Distância (v3.3.0)

- [x] Criar submenu "Rumo e Distância" no menu "Adicionar"
- [x] Criar modal com tabela: ID, Rumo, Quadrante, Distância
- [x] Implementar conversão Rumo+Quadrante → Azimute
- [x] Implementar cálculo de coordenadas usando rumo e distância
- [x] Implementar lógica de inserção de múltiplos vértices
- [ ] Testar inserção de vértices com rumo e distância



## Ferramentas Mover Vu00e9rtice (v3.4.0)

- [x] Converter "Mover (Mapa)" em submenu com: Mapa, Coordenadas, Azimute e Distu00e2ncia, Rumo e Distu00e2ncia
- [x] Bloquear ferramenta "Mover (Mapa)" de alterau00e7u00f5es (apenas mover no menu)
- [x] Criar modal "Mover Vu00e9rtice por Coordenadas"
  - [x] Dropdown: "Selecione o vu00e9rtice" (todos os vu00e9rtices da camada)
  - [x] Abas: UTM e Geogru00e1fica
  - [x] Sem campo de ID
  - [x] Sem dropdown de fuso
  - [x] Suporte a DMS e decimal
- [x] Criar modal "Mover Vu00e9rtice por Azimute e Distu00e2ncia"
  - [x] Dropdown: "Selecione o vu00e9rtice"
  - [x] Campos: Azimute, Distu00e2ncia
  - [x] Mover vu00e9rtice selecionado
- [x] Criar modal "Mover Vu00e9rtice por Rumo e Distu00e2ncia"
  - [x] Dropdown: "Selecione o vu00e9rtice"
  - [x] Campos: Rumo, Quadrante, Distu00e2ncia
  - [x] Mover vu00e9rtice selecionado
- [ ] Testar todas as tru00eas ferramentas de mover


## Remover Mensagens Laterais de Notificação (v3.5.2)

- [x] Remover showMessage() das ferramentas (manter função intacta, apenas comentar chamadas)
- [x] Testar se nenhuma funcionalidade foi afetada




## Implementar Tooltips Customizados (v3.6.0)

- [ ] Adicionar CSS para tooltips customizados em style.css
- [ ] Adicionar atributos data-tooltip em todos os botões do HTML
- [ ] Testar que menus continuam funcionando normalmente
- [ ] Testar que tooltips aparecem com delay de 1,5 segundos
- [ ] Testar que fonte tem tamanho 9pt


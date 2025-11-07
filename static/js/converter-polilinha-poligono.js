// Ferramenta Converter Polilinha em Polígono - TerraGIS v2.17
console.log('🔄 [v2.17] Iniciando carregamento de Converter Polilinha em Polígono...');

// Função principal: converter polilinha em polígono
function converterPolilinhaEmPoligono() {
    console.log('[CONVERTER] Executando conversão de polilinha em polígono');
    
    try {
        // Verificar se há camada ativa
        if (!terraManager.hasActiveLayer()) {
            showMessage('Nenhuma camada ativa! Selecione uma camada primeiro.', 'warning');
            return;
        }
        
        // Obter camada ativa
        var layer = terraManager.getActiveLayer();
        var layerName = terraManager.getActiveLayerName();
        
        // Verificar se é polilinha
        if (layer.type !== 'polyline') {
            showMessage('A camada selecionada não é uma polilinha! Selecione uma polilinha para converter.', 'error');
            return;
        }
        
        // Verificar se tem vértices suficientes
        if (!layer.vertices || layer.vertices.length < 3) {
            showMessage('A polilinha precisa ter pelo menos 3 vértices para ser convertida em polígono!', 'error');
            return;
        }
        
        console.log('[CONVERTER] Convertendo polilinha:', layerName);
        console.log('[CONVERTER] Número de vértices:', layer.vertices.length);
        
        // Criar nome para o novo polígono
        var novoNome = layerName.replace('_Polilinha', '') + '_Poligono';
        
        // Verificar se já existe camada com este nome
        var contador = 1;
        var nomeOriginal = novoNome;
        while (terraManager.getLayer(novoNome)) {
            novoNome = nomeOriginal + '_' + contador;
            contador++;
        }
        
        // Criar nova camada (polígono)
        var novaLayer = new TerraLayer(novoNome, 'polygon');
        
        // Copiar propriedades da polilinha
        novaLayer.fuso = layer.fuso;
        novaLayer.color = layer.color;
        novaLayer.vertexColor = layer.vertexColor;
        
        // Copiar vértices
        layer.vertices.forEach(function(v) {
            novaLayer.addVertex(v.id, v.e, v.n);
        });
        
        // Renderizar no mapa
        novaLayer.syncGeometry();
        novaLayer.updateVerticesLayer();
        
        // Adicionar ao gerenciador
        var layerKey = terraManager.addLayer(novaLayer);
        
        // Atualizar painel de camadas
        terraManager.updateLayerListUI();
        
        // Ativar nova camada
        terraManager.setActiveLayer(layerKey);
        
        // Zoom para a nova camada
        novaLayer.zoomToLayer();
        
        console.log('[CONVERTER] Polígono criado:', novoNome);
        showMessage(`Polilinha convertida em polígono: "${novoNome}"`, 'success');
        
    } catch (error) {
        console.error('[CONVERTER] Erro:', error);
        showMessage('Erro na conversão: ' + error.message, 'error');
    }
}

console.log('✅ [v2.17] Ferramenta Converter Polilinha em Polígono carregada!');


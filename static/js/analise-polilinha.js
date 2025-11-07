// Ferramenta Análise de Polilinha - TerraGIS v2.16
console.log('📊 [v2.16] Iniciando carregamento de Análise de Polilinha...');

// Função principal: executar análise de polilinha
function executarAnalisePolilinha() {
    console.log('[ANÁLISE POLILINHA] Executando análise de polilinha');
    
    try {
        // Verificar se há camada ativa
        if (!terraManager.hasActiveLayer()) {
            showMessage('Nenhuma camada ativa! Selecione uma camada primeiro.', 'warning');
            return;
        }
        
        // Obter camada ativa
        var layer = terraManager.getActiveLayer();
        var layerName = terraManager.getActiveLayerName();
        
        if (!layer || !layer.vertices || layer.vertices.length < 2) {
            showMessage('A camada selecionada não possui geometria válida! Mínimo 2 vértices.', 'error');
            return;
        }
        
        console.log('[ANÁLISE POLILINHA] Analisando camada:', layerName);
        console.log('[ANÁLISE POLILINHA] Número de vértices:', layer.vertices.length);
        
        // Extrair informações dos vértices
        var verticesInfo = layer.vertices.map(function(v, i) {
            return {
                id: v.name || v.id || 'V' + (i + 1),
                e: parseFloat(v.e),
                n: parseFloat(v.n),
                index: i
            };
        });
        
        // Calcular perímetro (SEM fechar - polilinha aberta)
        var perimetro = calcularPerimetroPolilinha(verticesInfo);
        
        // Calcular área usando método de Gauss (COMO SE fosse fechada - simulação)
        var area = calcularAreaGaussPolilinha(verticesInfo);
        
        // Gerar e exibir relatório
        exibirRelatorioAnalisePolilinha(layerName, area, perimetro, verticesInfo);
        
    } catch (error) {
        console.error('[ANÁLISE POLILINHA] Erro:', error);
        showMessage('Erro na análise: ' + error.message, 'error');
    }
}

// Calcular perímetro da polilinha (SEM fechar)
function calcularPerimetroPolilinha(verticesInfo) {
    if (verticesInfo.length < 2) {
        return 0.0;
    }
    
    var perimetro = 0.0;
    
    // Somar distâncias entre vértices consecutivos (SEM fechar)
    for (var i = 0; i < verticesInfo.length - 1; i++) {
        var v1 = verticesInfo[i];
        var v2 = verticesInfo[i + 1];
        
        var dx = v2.e - v1.e;
        var dy = v2.n - v1.n;
        var distancia = Math.sqrt(dx * dx + dy * dy);
        
        perimetro += distancia;
    }
    
    return perimetro;
}

// Calcular área usando método de Gauss (COMO SE fosse fechada)
function calcularAreaGaussPolilinha(verticesInfo) {
    if (verticesInfo.length < 3) {
        return 0.0;
    }
    
    // Método de Gauss: Área = ½|Σ(xi×yi+1 - xi+1×yi)|
    var soma = 0.0;
    var n = verticesInfo.length;
    
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;  // Próximo vértice (circular para fechar)
        
        var xi = verticesInfo[i].e;
        var yi = verticesInfo[i].n;
        var xj = verticesInfo[j].e;
        var yj = verticesInfo[j].n;
        
        soma += (xi * yj - xj * yi);
    }
    
    var area = Math.abs(soma) / 2.0;
    return area;
}

// Exibir relatório de análise de polilinha
function exibirRelatorioAnalisePolilinha(nomeGeometria, area, perimetro, verticesInfo) {
    var relatorio = [];
    
    relatorio.push('<div style="font-family: monospace; white-space: pre-wrap; text-align: left;">');
    relatorio.push('============================================================');
    relatorio.push('           RELATÓRIO DE ANÁLISE DE POLILINHA');
    relatorio.push('============================================================');
    relatorio.push('');
    
    // Informações básicas
    relatorio.push('<strong>INFORMAÇÕES BÁSICAS:</strong>');
    relatorio.push('Nome da Geometria: ' + nomeGeometria);
    relatorio.push('Perímetro: ' + perimetro.toFixed(2) + ' m');
    relatorio.push('Área (simulada fechada): ' + area.toFixed(2) + ' m² (' + (area / 10000).toFixed(4) + ' ha)');
    relatorio.push('Número de Vértices: ' + verticesInfo.length);
    relatorio.push('');
    
    // Lista de vértices
    relatorio.push('<strong>VÉRTICES:</strong>');
    for (var i = 0; i < verticesInfo.length; i++) {
        var v = verticesInfo[i];
        relatorio.push(v.id + ': E=' + v.e.toFixed(3) + ' m, N=' + v.n.toFixed(3) + ' m');
    }
    relatorio.push('');
    
    // Detalhes dos cálculos
    relatorio.push('<strong>DETALHES DOS CÁLCULOS:</strong>');
    relatorio.push('Perímetro: Soma de ' + (verticesInfo.length - 1) + ' lados da polilinha');
    relatorio.push('Área: Calculada pelo método de Gauss (como se fosse fechada)');
    relatorio.push('');
    relatorio.push('<span style="color: #0066cc;"><strong>NOTA IMPORTANTE:</strong></span>');
    relatorio.push('Polilinha é uma geometria ABERTA, sem erro de fechamento.');
    relatorio.push('A área é apenas uma SIMULAÇÃO (como se a polilinha fosse fechada).');
    relatorio.push('Geralmente indica deficiência na matrícula de origem.');
    
    relatorio.push('');
    relatorio.push('============================================================');
    relatorio.push('</div>');
    
    // Exibir em modal
    var htmlRelatorio = relatorio.join('\n');
    
    // Criar modal customizado
    var modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    var conteudo = document.createElement('div');
    conteudo.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
    
    var titulo = document.createElement('h3');
    titulo.textContent = '📊 Análise de Polilinha';
    titulo.style.cssText = 'margin-top: 0; color: #333; border-bottom: 2px solid #3388ff; padding-bottom: 10px;';
    
    var corpo = document.createElement('div');
    corpo.innerHTML = htmlRelatorio;
    corpo.style.cssText = 'margin: 20px 0; font-size: 13px; line-height: 1.6; color: #000000;';
    
    var botaoFechar = document.createElement('button');
    botaoFechar.textContent = 'Fechar';
    botaoFechar.style.cssText = 'background: #3388ff; color: white; border: none; padding: 10px 30px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 10px;';
    botaoFechar.onclick = function() {
        document.body.removeChild(modal);
    };
    
    conteudo.appendChild(titulo);
    conteudo.appendChild(corpo);
    conteudo.appendChild(botaoFechar);
    modal.appendChild(conteudo);
    
    // Fechar ao clicar fora
    modal.onclick = function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    document.body.appendChild(modal);
    
    console.log('[ANÁLISE POLILINHA] Relatório exibido com sucesso');
}

console.log('✅ [v2.16] Ferramenta Análise de Polilinha carregada!');


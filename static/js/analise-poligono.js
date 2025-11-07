// Ferramenta Análise de Polígono - TerraGIS v2.16
console.log('📊 [v2.16] Iniciando carregamento de Análise de Polígono...');

// Função principal: executar análise de polígono
function executarAnalisePoligono() {
    console.log('[ANÁLISE] Executando análise de polígono');
    
    try {
        // Verificar se há camada ativa
        if (!terraManager.hasActiveLayer()) {
            showMessage('Nenhuma camada ativa! Selecione uma camada primeiro.', 'warning');
            return;
        }
        
        // Obter camada ativa
        var layer = terraManager.getActiveLayer();
        var layerName = terraManager.getActiveLayerName();
        
        if (!layer || !layer.vertices || layer.vertices.length < 3) {
            showMessage('A camada selecionada não possui geometria válida! Mínimo 3 vértices.', 'error');
            return;
        }
        
        console.log('[ANÁLISE] Analisando camada:', layerName);
        console.log('[ANÁLISE] Número de vértices:', layer.vertices.length);
        
        // Extrair informações dos vértices
        var verticesInfo = layer.vertices.map(function(v, i) {
            return {
                id: v.name || v.id || 'V' + (i + 1),
                e: parseFloat(v.e),
                n: parseFloat(v.n),
                index: i
            };
        });
        
        // Calcular área usando método de Gauss
        var area = calcularAreaGauss(verticesInfo);
        
        // Calcular perímetro
        var perimetro = calcularPerimetro(verticesInfo);
        
        // Calcular erro de fechamento
        var erroFechamento = calcularErroFechamento(verticesInfo);
        
        // Calcular tolerância NBR 13.133
        var tolerancia = calcularToleranciaNBR13133(verticesInfo);
        
        // Gerar e exibir relatório
        exibirRelatorioAnalise(layerName, area, perimetro, verticesInfo, erroFechamento, tolerancia);
        
    } catch (error) {
        console.error('[ANÁLISE] Erro:', error);
        showMessage('Erro na análise: ' + error.message, 'error');
    }
}

// Calcular área usando método de Gauss
function calcularAreaGauss(verticesInfo) {
    if (verticesInfo.length < 3) {
        return 0.0;
    }
    
    // Método de Gauss: Área = ½|Σ(xi×yi+1 - xi+1×yi)|
    var soma = 0.0;
    var n = verticesInfo.length;
    
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;  // Próximo vértice (circular)
        
        var xi = verticesInfo[i].e;
        var yi = verticesInfo[i].n;
        var xj = verticesInfo[j].e;
        var yj = verticesInfo[j].n;
        
        soma += (xi * yj - xj * yi);
    }
    
    var area = Math.abs(soma) / 2.0;
    return area;
}

// Calcular perímetro
function calcularPerimetro(verticesInfo) {
    if (verticesInfo.length < 2) {
        return 0.0;
    }
    
    var perimetro = 0.0;
    var n = verticesInfo.length;
    
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;  // Próximo vértice (circular)
        
        var dx = verticesInfo[j].e - verticesInfo[i].e;
        var dy = verticesInfo[j].n - verticesInfo[i].n;
        var distancia = Math.sqrt(dx * dx + dy * dy);
        
        perimetro += distancia;
    }
    
    return perimetro;
}

// Calcular erro de fechamento
function calcularErroFechamento(verticesInfo) {
    if (verticesInfo.length < 3) {
        return null;
    }
    
    // Encontrar vértices com nomes duplicados
    var nomesVertices = verticesInfo.map(function(v) { return v.id; });
    var nomesDuplicados = {};
    
    for (var i = 0; i < nomesVertices.length; i++) {
        var nome = nomesVertices[i];
        var ocorrencias = nomesVertices.filter(function(n) { return n === nome; }).length;
        
        if (ocorrencias > 1) {
            if (!nomesDuplicados[nome]) {
                nomesDuplicados[nome] = [];
            }
            nomesDuplicados[nome].push(i);
        }
    }
    
    var chavesNomesDuplicados = Object.keys(nomesDuplicados);
    
    // Verificar se há exatamente um par de vértices com mesmo nome
    if (chavesNomesDuplicados.length === 0) {
        return {
            temErro: false,
            motivo: 'sem_vertices_iguais',
            mensagem: 'Não há vértices com nomes iguais para calcular erro de fechamento.'
        };
    } else if (chavesNomesDuplicados.length > 1) {
        return {
            temErro: false,
            motivo: 'multiplos_pares',
            mensagem: 'Inconsistência detectada: Múltiplos pares de vértices com nomes iguais: ' + chavesNomesDuplicados.join(', ') + '. Renomeie os vértices para que haja apenas um par com nome igual.',
            paresDuplicados: nomesDuplicados
        };
    } else {
        // Exatamente um par de vértices com mesmo nome
        var nomePar = chavesNomesDuplicados[0];
        var indicesPar = nomesDuplicados[nomePar];
        
        if (indicesPar.length !== 2) {
            return {
                temErro: false,
                motivo: 'mais_de_dois',
                mensagem: 'Vértice "' + nomePar + '" aparece ' + indicesPar.length + ' vezes. Deve aparecer exatamente 2 vezes (partida e chegada).'
            };
        }
        
        // Calcular erro de fechamento entre os dois vértices
        var vertice1 = verticesInfo[indicesPar[0]];
        var vertice2 = verticesInfo[indicesPar[1]];
        
        var deltaE = vertice1.e - vertice2.e;
        var deltaN = vertice1.n - vertice2.n;
        var erroLinear = Math.sqrt(deltaE * deltaE + deltaN * deltaN);
        
        return {
            temErro: true,
            nomeVertice: nomePar,
            verticePartida: vertice1,
            verticeChegada: vertice2,
            deltaE: deltaE,
            deltaN: deltaN,
            erroLinear: erroLinear
        };
    }
}

// Calcular tolerância NBR 13.133
function calcularToleranciaNBR13133(verticesInfo) {
    if (verticesInfo.length < 2) {
        return null;
    }
    
    // Calcular comprimentos dos lances
    var somaQuadrados = 0.0;
    var n = verticesInfo.length;
    
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;  // Próximo vértice (circular)
        
        var dx = verticesInfo[j].e - verticesInfo[i].e;
        var dy = verticesInfo[j].n - verticesInfo[i].n;
        var distancia = Math.sqrt(dx * dx + dy * dy);
        
        // NBR 13.133: distâncias devem estar em QUILÔMETROS
        var distanciaKm = distancia / 1000.0;
        somaQuadrados += distanciaKm * distanciaKm;
    }
    
    // Fórmula NBR 13.133: Th = 0,05 × √(Σd²)
    var toleranciaLinear = 0.05 * Math.sqrt(somaQuadrados);
    
    return {
        toleranciaLinear: toleranciaLinear,
        somaQuadrados: somaQuadrados,
        numLances: n
    };
}

// Exibir relatório de análise
function exibirRelatorioAnalise(nomeGeometria, area, perimetro, verticesInfo, erroFechamento, tolerancia) {
    var relatorio = [];
    
    relatorio.push('<div style="font-family: monospace; white-space: pre-wrap; text-align: left;">');
    relatorio.push('============================================================');
    relatorio.push('           RELATÓRIO DE ANÁLISE DE POLÍGONO');
    relatorio.push('============================================================');
    relatorio.push('');
    
    // Informações básicas
    relatorio.push('<strong>INFORMAÇÕES BÁSICAS:</strong>');
    relatorio.push('Nome da Geometria: ' + nomeGeometria);
    relatorio.push('Área: ' + area.toFixed(2) + ' m² (' + (area / 10000).toFixed(4) + ' ha)');
    relatorio.push('Perímetro: ' + perimetro.toFixed(2) + ' m');
    relatorio.push('Número de Vértices: ' + verticesInfo.length);
    relatorio.push('');
    
    // Lista de vértices
    relatorio.push('<strong>VÉRTICES:</strong>');
    for (var i = 0; i < verticesInfo.length; i++) {
        var v = verticesInfo[i];
        relatorio.push(v.id + ': E=' + v.e.toFixed(3) + ' m, N=' + v.n.toFixed(3) + ' m');
    }
    relatorio.push('');
    
    // Análise de fechamento
    relatorio.push('<strong>ANÁLISE DE FECHAMENTO:</strong>');
    if (erroFechamento && erroFechamento.temErro) {
        var partida = erroFechamento.verticePartida;
        var chegada = erroFechamento.verticeChegada;
        var nomeVertice = erroFechamento.nomeVertice;
        
        relatorio.push('Vértice de partida: ' + nomeVertice + ' (E=' + partida.e.toFixed(3) + ', N=' + partida.n.toFixed(3) + ')');
        relatorio.push('Vértice de chegada: ' + nomeVertice + ' (E=' + chegada.e.toFixed(3) + ', N=' + chegada.n.toFixed(3) + ')');
        relatorio.push('');
        relatorio.push('<span style="color: #ff6600;"><strong>ERRO DE FECHAMENTO DETECTADO:</strong></span>');
        relatorio.push('Delta E: ' + erroFechamento.deltaE.toFixed(3) + ' m');
        relatorio.push('Delta N: ' + erroFechamento.deltaN.toFixed(3) + ' m');
        relatorio.push('Erro Linear: ' + erroFechamento.erroLinear.toFixed(3) + ' m');
        relatorio.push('');
        
        // Tolerância NBR 13.133
        if (tolerancia) {
            relatorio.push('<strong>TOLERÂNCIA NBR 13.133:</strong>');
            relatorio.push('Tolerância Linear: ' + tolerancia.toleranciaLinear.toFixed(3) + ' m');
            relatorio.push('Número de Lances: ' + tolerancia.numLances);
            relatorio.push('');
            
            // Avaliação
            if (erroFechamento.erroLinear <= tolerancia.toleranciaLinear) {
                relatorio.push('<span style="color: #00aa00;"><strong>✅ RESULTADO: ERRO DENTRO DA TOLERÂNCIA</strong></span>');
                relatorio.push('   Polígono aceito segundo NBR 13.133');
            } else {
                relatorio.push('<span style="color: #cc0000;"><strong>❌ RESULTADO: ERRO ACIMA DA TOLERÂNCIA</strong></span>');
                relatorio.push('   Polígono rejeitado segundo NBR 13.133');
                relatorio.push('   Recomenda-se nova medição');
            }
        }
    } else if (erroFechamento) {
        // Não há erro de fechamento calculável
        relatorio.push(erroFechamento.mensagem);
    } else {
        relatorio.push('Não foi possível calcular erro de fechamento.');
    }
    
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
    titulo.textContent = '📊 Análise de Polígono';
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
    
    console.log('[ANÁLISE] Relatório exibido com sucesso');
}

console.log('✅ [v2.16] Ferramenta Análise de Polígono carregada!');


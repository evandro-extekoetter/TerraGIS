// ===== ROTACIONAR GEOMETRIA =====
// Variáveis globais
let rotacionarAtivo = false;
let geometriaParaRotacionar = null;
let verticeEixo = null;
let anguloAtual = 0;
let previewRotacao = null;

// Sobrescrever função openRotacionarGeometriaDialog
window.openRotacionarGeometriaDialog = function() {
    const geometriasDisponiveis = Object.keys(terraManager.layers);
    
    if (geometriasDisponiveis.length === 0) {
        showMessage('Nenhuma geometria disponível para rotacionar.', 'warning');
        return;
    }
    
    // Criar modal de seleção
    const modal = document.createElement('div');
    modal.id = 'rotacionarModal';
    modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); min-width: 400px;';
    
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">🔄 Rotacionar Geometria</h3>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Selecione a geometria:</label>
            <select id="selectGeometriaRotacionar" style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="">-- Selecione --</option>
                ${geometriasDisponiveis.map(name => `<option value="${name}">${name}</option>`).join('')}
            </select>
        </div>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Modo de rotação:</label>
            <div style="display: flex; gap: 10px;">
                <button id="btnRotacionarMapa" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    🗺️ Mapa (Livre)
                </button>
                <button id="btnRotacionarAngulo" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    📐 Ângulo Específico
                </button>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: right;">
            <button id="btnCancelarRotacionar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Cancelar
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('btnRotacionarMapa').addEventListener('click', function() {
        const geometriaSelecionada = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaSelecionada) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        modal.remove();
        iniciarRotacaoMapa(geometriaSelecionada);
    });
    
    document.getElementById('btnRotacionarAngulo').addEventListener('click', function() {
        const geometriaSelecionada = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaSelecionada) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        modal.remove();
        abrirDialogoAnguloEspecifico(geometriaSelecionada);
    });
    
    document.getElementById('btnCancelarRotacionar').addEventListener('click', function() {
        modal.remove();
    });
};

// Encontrar vértice mais ao norte
function encontrarVerticeMaisAoNorte(vertices) {
    let verticeMaisNorte = vertices[0];
    
    for (let i = 1; i < vertices.length; i++) {
        if (vertices[i].n > verticeMaisNorte.n) {
            verticeMaisNorte = vertices[i];
        }
    }
    
    return verticeMaisNorte;
}

// Rotacionar ponto em torno de um eixo
function rotacionarPonto(ponto, eixo, anguloGraus) {
    const anguloRad = anguloGraus * Math.PI / 180;
    const cos = Math.cos(anguloRad);
    const sin = Math.sin(anguloRad);
    
    const dx = ponto.e - eixo.e;
    const dy = ponto.n - eixo.n;
    
    return {
        e: eixo.e + (dx * cos - dy * sin),
        n: eixo.n + (dx * sin + dy * cos)
    };
}

// Iniciar rotação no mapa (livre)
function iniciarRotacaoMapa(nomeGeometria) {
    geometriaParaRotacionar = terraManager.layers[nomeGeometria];
    
    if (!geometriaParaRotacionar) {
        showMessage('Geometria não encontrada.', 'error');
        return;
    }
    
    rotacionarAtivo = true;
    verticeEixo = encontrarVerticeMaisAoNorte(geometriaParaRotacionar.vertices);
    anguloAtual = 0;
    
    showMessage(`Rotacionando "${nomeGeometria}". Mova o mouse para rotacionar. Clique para confirmar. ESC para cancelar.`, 'info');
    
    // Adicionar eventos
    map.on('mousemove', onMouseMoveRotacao);
    map.on('click', onClickConfirmarRotacao);
    document.addEventListener('keydown', onKeyDownRotacao);
}

// Mouse move durante rotação
function onMouseMoveRotacao(e) {
    if (!rotacionarAtivo || !geometriaParaRotacionar) return;
    
    const eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
    const mouseLatLng = e.latlng;
    
    // Calcular ângulo entre eixo e mouse
    const dx = mouseLatLng.lng - eixoLatLng.lng;
    const dy = mouseLatLng.lat - eixoLatLng.lat;
    anguloAtual = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Atualizar preview
    atualizarPreviewRotacao();
}

// Clique para confirmar rotação
function onClickConfirmarRotacao(e) {
    if (!rotacionarAtivo) return;
    
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    aplicarRotacao();
    finalizarRotacao();
    showMessage('Geometria rotacionada com sucesso!', 'success');
}

// Tecla ESC para cancelar
function onKeyDownRotacao(e) {
    if (e.key === 'Escape' && rotacionarAtivo) {
        finalizarRotacao();
        showMessage('Rotação cancelada.', 'info');
    }
}

// Atualizar preview da rotação
function atualizarPreviewRotacao() {
    if (!geometriaParaRotacionar) return;
    
    // Remover preview anterior
    if (previewRotacao) {
        map.removeLayer(previewRotacao);
    }
    
    // Calcular novos vértices rotacionados
    const verticesRotacionados = geometriaParaRotacionar.vertices.map(v => {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Converter para LatLng
    const latlngs = verticesRotacionados.map(v => {
        return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
    });
    
    // Criar preview
    previewRotacao = L.polygon(latlngs, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
}

// Aplicar rotação definitiva
function aplicarRotacao() {
    if (!geometriaParaRotacionar) return;
    
    // Rotacionar todos os vértices
    geometriaParaRotacionar.vertices = geometriaParaRotacionar.vertices.map(v => {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Atualizar geometria no mapa
    geometriaParaRotacionar.syncGeometry();
}

// Finalizar rotação
function finalizarRotacao() {
    rotacionarAtivo = false;
    
    // Remover eventos
    map.off('mousemove', onMouseMoveRotacao);
    map.off('click', onClickConfirmarRotacao);
    document.removeEventListener('keydown', onKeyDownRotacao);
    
    // Remover preview
    if (previewRotacao) {
        map.removeLayer(previewRotacao);
        previewRotacao = null;
    }
    
    geometriaParaRotacionar = null;
    verticeEixo = null;
    anguloAtual = 0;
}

// Abrir diálogo de ângulo específico
function abrirDialogoAnguloEspecifico(nomeGeometria) {
    const modal = document.createElement('div');
    modal.id = 'anguloEspecificoModal';
    modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10001; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); min-width: 400px;';
    
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">📐 Rotacionar por Ângulo Específico</h3>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Geometria selecionada:</label>
            <div style="padding: 10px; background: #f0f0f0; border-radius: 4px; font-weight: bold;">${nomeGeometria}</div>
        </div>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Ângulo (GG,MMSS):</label>
            <input type="text" id="inputAngulo" placeholder="Ex: 45,3015" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;">
            <small style="color: #666; display: block; margin-top: 5px;">Formato: Graus,MinutosSegundos (Ex: 90,0000 = 90°)</small>
        </div>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Sentido:</label>
            <select id="selectSentido" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;">
                <option value="horario">⏱️ Horário (Sentido dos ponteiros do relógio)</option>
                <option value="antihorario">🔄 Anti-horário (Sentido contrário)</option>
            </select>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button id="btnCancelarAngulo" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Cancelar
            </button>
            <button id="btnAplicarAngulo" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Aplicar Rotação
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('btnAplicarAngulo').addEventListener('click', function() {
        const anguloStr = document.getElementById('inputAngulo').value.trim();
        const sentido = document.getElementById('selectSentido').value;
        
        if (!anguloStr) {
            showMessage('Digite um ângulo!', 'warning');
            return;
        }
        
        // Converter GG,MMSS para graus decimais
        const anguloGraus = converterAnguloParaGraus(anguloStr);
        
        if (isNaN(anguloGraus)) {
            showMessage('Ângulo inválido! Use o formato GG,MMSS', 'error');
            return;
        }
        
        // Ajustar sinal conforme sentido
        const anguloFinal = sentido === 'horario' ? -anguloGraus : anguloGraus;
        
        modal.remove();
        aplicarRotacaoAngulo(nomeGeometria, anguloFinal);
    });
    
    document.getElementById('btnCancelarAngulo').addEventListener('click', function() {
        modal.remove();
    });
}

// Converter ângulo GG,MMSS para graus decimais
function converterAnguloParaGraus(anguloStr) {
    const partes = anguloStr.split(',');
    
    if (partes.length !== 2) {
        return NaN;
    }
    
    const graus = parseFloat(partes[0]);
    const mmss = partes[1].padStart(4, '0');
    const minutos = parseInt(mmss.substring(0, 2));
    const segundos = parseInt(mmss.substring(2, 4));
    
    return graus + (minutos / 60) + (segundos / 3600);
}

// Aplicar rotação por ângulo específico
function aplicarRotacaoAngulo(nomeGeometria, anguloGraus) {
    const geometria = terraManager.layers[nomeGeometria];
    
    if (!geometria) {
        showMessage('Geometria não encontrada.', 'error');
        return;
    }
    
    const eixo = encontrarVerticeMaisAoNorte(geometria.vertices);
    
    // Rotacionar todos os vértices
    geometria.vertices = geometria.vertices.map(v => {
        return rotacionarPonto(v, eixo, anguloGraus);
    });
    
    // Atualizar geometria no mapa
    geometria.syncGeometry();
    
    showMessage(`Geometria "${nomeGeometria}" rotacionada ${Math.abs(anguloGraus).toFixed(4)}° (${anguloGraus > 0 ? 'anti-horário' : 'horário'})`, 'success');
}

console.log('✅ Ferramenta Rotacionar Geometria carregada!');


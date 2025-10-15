// Ferramenta Rotacionar Geometria - TerraGIS
console.log('🔄 Iniciando carregamento de Rotacionar Geometria...');

// Variáveis globais
var rotacionarAtivo = false;
var geometriaParaRotacionar = null;
var verticeEixo = null;
var anguloAtual = 0;
var previewLayerRotacao = null;

// Abrir diálogo de rotação
function openRotacionarGeometriaDialog() {
    console.log('📋 Abrindo diálogo de rotação');
    
    // Criar modal
    var modal = document.createElement('div');
    modal.id = 'modalRotacionar';
    modal.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">' +
        '<div style="background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">' +
        '<h3 style="margin: 0 0 20px 0; color: #333;">🔄 Rotacionar Geometria</h3>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Selecione a geometria:</label>' +
        '<select id="selectGeometriaRotacionar" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<option value="">-- Selecione --</option>' +
        '</select>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Modo de rotação:</label>' +
        '<div style="display: flex; gap: 10px; margin-bottom: 20px;">' +
        '<button id="btnRotacionarMapa" style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">🗺️ Mapa (Livre)</button>' +
        '<button id="btnRotacionarAngulo" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">📐 Ângulo Específico</button>' +
        '</div>' +
        '<div style="text-align: right;">' +
        '<button id="btnCancelarRotacionar" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    // Preencher dropdown com geometrias
    var select = document.getElementById('selectGeometriaRotacionar');
    for (var nome in terraManager.layers) {
        var option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        select.appendChild(option);
    }
    
    // Event listeners
    document.getElementById('btnRotacionarMapa').onclick = function() {
        var geometriaSelecionada = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaSelecionada) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        document.getElementById('modalRotacionar').remove();
        iniciarRotacaoMapa(geometriaSelecionada);
    };
    
    document.getElementById('btnRotacionarAngulo').onclick = function() {
        var geometriaSelecionada = document.getElementById('selectGeometriaRotacionar').value;
        if (!geometriaSelecionada) {
            showMessage('Selecione uma geometria primeiro!', 'warning');
            return;
        }
        document.getElementById('modalRotacionar').remove();
        abrirDialogoAnguloEspecifico(geometriaSelecionada);
    };
    
    document.getElementById('btnCancelarRotacionar').onclick = function() {
        document.getElementById('modalRotacionar').remove();
    };
}

// Encontrar vértice mais ao norte
function encontrarVerticeMaisAoNorte(vertices) {
    var verticeMaisNorte = vertices[0];
    for (var i = 1; i < vertices.length; i++) {
        if (vertices[i].n > verticeMaisNorte.n) {
            verticeMaisNorte = vertices[i];
        }
    }
    return verticeMaisNorte;
}

// Rotacionar ponto em torno de um eixo
function rotacionarPonto(ponto, eixo, anguloGraus) {
    var anguloRad = anguloGraus * Math.PI / 180;
    var cos = Math.cos(anguloRad);
    var sin = Math.sin(anguloRad);
    
    var dx = ponto.e - eixo.e;
    var dy = ponto.n - eixo.n;
    
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
    
    // Desabilitar popups de todas as geometrias
    for (var nome in terraManager.layers) {
        var tl = terraManager.layers[nome];
        if (tl.geometryLayer) {
            tl.geometryLayer.closePopup();
            tl.geometryLayer.unbindPopup();
        }
    }
    
    rotacionarAtivo = true;
    verticeEixo = encontrarVerticeMaisAoNorte(geometriaParaRotacionar.vertices);
    anguloAtual = 0;
    
    showMessage('Rotacionando "' + nomeGeometria + '". Mova o mouse para rotacionar. Clique para confirmar. ESC para cancelar.', 'info');
    
    // Adicionar eventos
    map.on('mousemove', onMouseMoveRotacao);
    map.on('click', onClickConfirmarRotacao);
    document.addEventListener('keydown', onKeyDownRotacao);
}

// Mouse move durante rotação
function onMouseMoveRotacao(e) {
    if (!rotacionarAtivo || !geometriaParaRotacionar) return;
    
    var eixoLatLng = utmToLatLng(verticeEixo.e, verticeEixo.n, geometriaParaRotacionar.fuso);
    var mouseLatLng = e.latlng;
    
    // Calcular ângulo entre eixo e mouse
    var dx = mouseLatLng.lng - eixoLatLng.lng;
    var dy = mouseLatLng.lat - eixoLatLng.lat;
    anguloAtual = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Atualizar preview
    atualizarPreviewRotacao();
}

// Clique para confirmar rotação
function onClickConfirmarRotacao(e) {
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    
    if (!rotacionarAtivo) return;
    
    aplicarRotacao();
    finalizarRotacao();
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
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
    }
    
    // Rotacionar todos os vértices
    var verticesRotacionados = geometriaParaRotacionar.vertices.map(function(v) {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Converter para LatLng
    var latlngs = verticesRotacionados.map(function(v) {
        return utmToLatLng(v.e, v.n, geometriaParaRotacionar.fuso);
    });
    
    // Criar preview
    previewLayerRotacao = L.polygon(latlngs, {
        color: 'red',
        weight: 2,
        dashArray: '5, 5',
        fillOpacity: 0.1
    }).addTo(map);
}

// Aplicar rotação final
function aplicarRotacao() {
    // Rotacionar todos os vértices
    geometriaParaRotacionar.vertices = geometriaParaRotacionar.vertices.map(function(v) {
        return rotacionarPonto(v, verticeEixo, anguloAtual);
    });
    
    // Atualizar geometria no mapa
    geometriaParaRotacionar.syncGeometry();
    
    showMessage('Geometria rotacionada ' + anguloAtual.toFixed(2) + '° com sucesso!', 'success');
}

// Finalizar rotação
function finalizarRotacao() {
    rotacionarAtivo = false;
    geometriaParaRotacionar = null;
    verticeEixo = null;
    anguloAtual = 0;
    
    if (previewLayerRotacao) {
        map.removeLayer(previewLayerRotacao);
        previewLayerRotacao = null;
    }
    
    // Restaurar popups
    for (var nome in terraManager.layers) {
        var tl = terraManager.layers[nome];
        if (tl.geometryLayer) {
            var layerName = tl.type === 'polygon' ? 
                tl.name + '_Poligono' : tl.name + '_Polilinha';
            tl.geometryLayer.bindPopup('<b>' + layerName + '</b>');
        }
    }
    
    map.off('mousemove', onMouseMoveRotacao);
    map.off('click', onClickConfirmarRotacao);
    document.removeEventListener('keydown', onKeyDownRotacao);
}

// Abrir diálogo de ângulo específico
function abrirDialogoAnguloEspecifico(nomeGeometria) {
    var modal = document.createElement('div');
    modal.id = 'modalAnguloEspecifico';
    modal.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">' +
        '<div style="background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%;">' +
        '<h3 style="margin: 0 0 20px 0; color: #333;">📐 Rotacionar por Ângulo</h3>' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Ângulo (GG,MMSS):</label>' +
        '<input type="text" id="inputAngulo" placeholder="Ex: 45,3015" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Sentido:</label>' +
        '<select id="selectSentido" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">' +
        '<option value="horario">Horário</option>' +
        '<option value="antihorario">Anti-horário</option>' +
        '</select>' +
        '<div style="display: flex; gap: 10px;">' +
        '<button id="btnAplicarAngulo" style="flex: 1; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Aplicar</button>' +
        '<button id="btnCancelarAngulo" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    
    document.getElementById('btnAplicarAngulo').onclick = function() {
        var anguloStr = document.getElementById('inputAngulo').value;
        var sentido = document.getElementById('selectSentido').value;
        
        if (!anguloStr) {
            showMessage('Digite um ângulo!', 'warning');
            return;
        }
        
        // Converter GG,MMSS para graus decimais
        var partes = anguloStr.split(',');
        if (partes.length !== 2) {
            showMessage('Formato inválido! Use GG,MMSS (ex: 45,3015)', 'error');
            return;
        }
        
        var graus = parseFloat(partes[0]);
        var mmss = parseFloat(partes[1]);
        var minutos = Math.floor(mmss / 100);
        var segundos = mmss % 100;
        
        var anguloDecimal = graus + (minutos / 60) + (segundos / 3600);
        
        if (sentido === 'antihorario') {
            anguloDecimal = -anguloDecimal;
        }
        
        // Aplicar rotação
        var geometria = terraManager.layers[nomeGeometria];
        if (!geometria) {
            showMessage('Geometria não encontrada.', 'error');
            return;
        }
        
        var eixo = encontrarVerticeMaisAoNorte(geometria.vertices);
        geometria.vertices = geometria.vertices.map(function(v) {
            return rotacionarPonto(v, eixo, anguloDecimal);
        });
        geometria.syncGeometry();
        
        document.getElementById('modalAnguloEspecifico').remove();
        showMessage('Geometria rotacionada ' + anguloDecimal.toFixed(4) + '° com sucesso!', 'success');
    };
    
    document.getElementById('btnCancelarAngulo').onclick = function() {
        document.getElementById('modalAnguloEspecifico').remove();
    };
}

console.log('✅ Ferramenta Rotacionar Geometria carregada!');


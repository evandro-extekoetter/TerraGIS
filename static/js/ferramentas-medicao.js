// Ferramentas de Medição - TerraGIS v2.18
// Baseado nas ferramentas de medição do QGIS
console.log('📏 [v2.18] Iniciando carregamento de Ferramentas de Medição...');

// ===== SISTEMA BASE DE MEDIÇÃO =====

// Estado global das ferramentas de medição
var medicaoState = {
    ativa: null,              // 'linha', 'area', 'azimute', 'angulo', 'coordenada'
    pontos: [],               // Array de {lat, lng, e, n}
    layer: null,              // Leaflet layer temporária
    painelAberto: false
};

// Criar painel lateral de medição
function criarPainelMedicao() {
    // Verificar se já existe
    if (document.getElementById('painel-medicao')) {
        return;
    }
    
    var painel = document.createElement('div');
    painel.id = 'painel-medicao';
    painel.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 320px;
        background: white;
        border: 2px solid #3388ff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        display: none;
        font-family: Arial, sans-serif;
    `;
    
    // Cabeçalho
    var header = document.createElement('div');
    header.style.cssText = `
        background: #3388ff;
        color: white;
        padding: 10px 15px;
        font-weight: bold;
        border-radius: 6px 6px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    var titulo = document.createElement('span');
    titulo.id = 'painel-medicao-titulo';
    titulo.textContent = 'Medir';
    header.appendChild(titulo);
    
    var btnFechar = document.createElement('button');
    btnFechar.textContent = '✕';
    btnFechar.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
    `;
    btnFechar.onclick = fecharPainelMedicao;
    header.appendChild(btnFechar);
    
    painel.appendChild(header);
    
    // Conteúdo
    var conteudo = document.createElement('div');
    conteudo.id = 'painel-medicao-conteudo';
    conteudo.style.cssText = `
        padding: 15px;
        max-height: 400px;
        overflow-y: auto;
    `;
    painel.appendChild(conteudo);
    
    // Rodapé com botões
    var rodape = document.createElement('div');
    rodape.style.cssText = `
        padding: 10px 15px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 8px;
    `;
    
    var btnNovo = document.createElement('button');
    btnNovo.textContent = 'Novo';
    btnNovo.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    btnNovo.onclick = novoMedicao;
    rodape.appendChild(btnNovo);
    
    var btnCopyAll = document.createElement('button');
    btnCopyAll.id = 'btn-copy-all';
    btnCopyAll.textContent = 'Copy All';
    btnCopyAll.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    btnCopyAll.onclick = copiarTodosMedicao;
    rodape.appendChild(btnCopyAll);
    
    var btnClose = document.createElement('button');
    btnClose.textContent = 'Close';
    btnClose.style.cssText = `
        flex: 1;
        padding: 8px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    btnClose.onclick = fecharPainelMedicao;
    rodape.appendChild(btnClose);
    
    painel.appendChild(rodape);
    
    document.body.appendChild(painel);
}

// Abrir painel de medição
function abrirPainelMedicao(titulo) {
    criarPainelMedicao();
    var painel = document.getElementById('painel-medicao');
    var tituloEl = document.getElementById('painel-medicao-titulo');
    
    painel.style.display = 'block';
    tituloEl.textContent = titulo;
    medicaoState.painelAberto = true;
}

// Fechar painel de medição
function fecharPainelMedicao() {
    var painel = document.getElementById('painel-medicao');
    if (painel) {
        painel.style.display = 'none';
    }
    
    // Limpar desenho temporário
    limparDesenhoTemporario();
    
    // Resetar estado
    medicaoState.ativa = null;
    medicaoState.pontos = [];
    medicaoState.painelAberto = false;
    
    // Remover event listener do mapa
    if (map) {
        map.off('click', onMapClickMedicao);
    }
}

// Novo medição (limpar e recomeçar)
function novoMedicao() {
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    atualizarConteudoPainel();
}

// Copiar todos os dados
function copiarTodosMedicao() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var texto = conteudo.innerText;
    
    // Copiar para área de transferência
    navigator.clipboard.writeText(texto).then(function() {
        showMessage('Dados copiados para área de transferência!', 'success');
    }).catch(function(err) {
        console.error('Erro ao copiar:', err);
        showMessage('Erro ao copiar dados', 'error');
    });
}

// Limpar desenho temporário do mapa
function limparDesenhoTemporario() {
    if (medicaoState.layer && map) {
        map.removeLayer(medicaoState.layer);
        medicaoState.layer = null;
    }
}

// Atualizar conteúdo do painel (será sobrescrito por cada ferramenta)
function atualizarConteudoPainel() {
    // Implementado por cada ferramenta específica
}

// Event handler para cliques no mapa
function onMapClickMedicao(e) {
    // Implementado por cada ferramenta específica
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Calcular distância entre dois pontos (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Raio da Terra em metros
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calcular distância cartesiana (UTM)
function calcularDistanciaCartesiana(e1, n1, e2, n2) {
    var dx = e2 - e1;
    var dy = n2 - n1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Calcular azimute entre dois pontos (graus, 0-360, Norte = 0)
function calcularAzimute(e1, n1, e2, n2) {
    var dx = e2 - e1;
    var dy = n2 - n1;
    var azimute = Math.atan2(dx, dy) * 180 / Math.PI;
    if (azimute < 0) azimute += 360;
    return azimute;
}

// Calcular ângulo entre três pontos (graus)
function calcularAngulo(p1, p2, p3) {
    // p2 é o vértice
    var dx1 = p1.e - p2.e;
    var dy1 = p1.n - p2.n;
    var dx2 = p3.e - p2.e;
    var dy2 = p3.n - p2.n;
    
    var angulo1 = Math.atan2(dy1, dx1);
    var angulo2 = Math.atan2(dy2, dx2);
    
    var angulo = (angulo2 - angulo1) * 180 / Math.PI;
    if (angulo < 0) angulo += 360;
    
    return angulo;
}

// Calcular área de polígono (método de Gauss)
function calcularAreaPoligono(pontos) {
    if (pontos.length < 3) return 0;
    
    var soma = 0;
    var n = pontos.length;
    
    for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        soma += (pontos[i].e * pontos[j].n - pontos[j].e * pontos[i].n);
    }
    
    return Math.abs(soma) / 2;
}

console.log('✅ [v2.18] Sistema base de Ferramentas de Medição carregado!');



// ===== FERRAMENTA: MEDIR LINHA =====

function ativarMedirLinha() {
    console.log('[MEDIR] Ativando Medir Linha');
    
    // Fechar se já estiver aberto
    if (medicaoState.ativa === 'linha' && medicaoState.painelAberto) {
        fecharPainelMedicao();
        return;
    }
    
    // Resetar estado
    medicaoState.ativa = 'linha';
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    
    // Abrir painel
    abrirPainelMedicao('Medir Linha');
    atualizarConteudoPainelLinha();
    
    // Adicionar event listener ao mapa
    map.on('click', onMapClickLinha);
    
    showMessage('Clique no mapa para adicionar pontos. Clique com botão direito para finalizar.', 'info');
}

function onMapClickLinha(e) {
    if (medicaoState.ativa !== 'linha') return;
    
    // Converter LatLng para UTM
    var utm = latLngToUTM(e.latlng.lat, e.latlng.lng, '21S');
    
    // Adicionar ponto
    medicaoState.pontos.push({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        e: utm.e,
        n: utm.n
    });
    
    // Atualizar desenho
    desenharLinhaTemporaria();
    
    // Atualizar painel
    atualizarConteudoPainelLinha();
}

function desenharLinhaTemporaria() {
    // Limpar desenho anterior
    limparDesenhoTemporario();
    
    if (medicaoState.pontos.length < 1) return;
    
    // Criar array de LatLng
    var latlngs = medicaoState.pontos.map(function(p) {
        return [p.lat, p.lng];
    });
    
    // Criar polyline temporária
    medicaoState.layer = L.polyline(latlngs, {
        color: '#ff0000',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
    }).addTo(map);
    
    // Adicionar marcadores nos pontos
    medicaoState.pontos.forEach(function(p, i) {
        L.circleMarker([p.lat, p.lng], {
            radius: 5,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 1
        }).addTo(medicaoState.layer);
    });
}

function atualizarConteudoPainelLinha() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var html = [];
    
    if (medicaoState.pontos.length === 0) {
        html.push('<p style="color: #666; font-size: 13px;">Clique no mapa para adicionar pontos</p>');
    } else {
        // Lista de segmentos
        html.push('<div style="margin-bottom: 10px;">');
        html.push('<strong style="font-size: 14px;">Segmentos [metros]</strong>');
        html.push('<div style="max-height: 200px; overflow-y: auto; margin-top: 8px; border: 1px solid #ddd; border-radius: 4px;">');
        
        var totalDistancia = 0;
        
        for (var i = 0; i < medicaoState.pontos.length - 1; i++) {
            var p1 = medicaoState.pontos[i];
            var p2 = medicaoState.pontos[i + 1];
            
            var distancia = calcularDistanciaCartesiana(p1.e, p1.n, p2.e, p2.n);
            totalDistancia += distancia;
            
            html.push('<div style="padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right;">');
            html.push(distancia.toFixed(3));
            html.push('</div>');
        }
        
        html.push('</div>');
        html.push('</div>');
        
        // Total
        html.push('<div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">');
        html.push('<div style="display: flex; justify-content: space-between; align-items: center;">');
        html.push('<strong style="font-size: 14px;">Total</strong>');
        html.push('<strong style="font-size: 16px; color: #3388ff;">' + totalDistancia.toFixed(3) + '</strong>');
        html.push('</div>');
        html.push('<div style="font-size: 12px; color: #666; margin-top: 4px;">metros</div>');
        html.push('</div>');
        
        // Opções (Cartesiano/Elipsoidal)
        html.push('<div style="margin-top: 10px; font-size: 12px; color: #666;">');
        html.push('<label><input type="radio" name="tipo-calculo" value="cartesiano" checked> Cartesiano</label>');
        html.push('<label style="margin-left: 15px;"><input type="radio" name="tipo-calculo" value="elipsoidal"> Elipsoidal</label>');
        html.push('</div>');
    }
    
    conteudo.innerHTML = html.join('');
}

console.log('✅ [v2.18] Ferramenta Medir Linha carregada!');



// ===== FERRAMENTA: MEDIR ÁREA =====

function ativarMedirArea() {
    console.log('[MEDIR] Ativando Medir Área');
    
    // Fechar se já estiver aberto
    if (medicaoState.ativa === 'area' && medicaoState.painelAberto) {
        fecharPainelMedicao();
        return;
    }
    
    // Resetar estado
    medicaoState.ativa = 'area';
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    
    // Abrir painel
    abrirPainelMedicao('Medir Área');
    atualizarConteudoPainelArea();
    
    // Adicionar event listener ao mapa
    map.on('click', onMapClickArea);
    
    showMessage('Clique no mapa para adicionar pontos do polígono (mínimo 3 pontos)', 'info');
}

function onMapClickArea(e) {
    if (medicaoState.ativa !== 'area') return;
    
    // Converter LatLng para UTM
    var utm = latLngToUTM(e.latlng.lat, e.latlng.lng, '21S');
    
    // Adicionar ponto
    medicaoState.pontos.push({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        e: utm.e,
        n: utm.n
    });
    
    // Atualizar desenho
    desenharAreaTemporaria();
    
    // Atualizar painel
    atualizarConteudoPainelArea();
}

function desenharAreaTemporaria() {
    // Limpar desenho anterior
    limparDesenhoTemporario();
    
    if (medicaoState.pontos.length < 1) return;
    
    // Criar array de LatLng
    var latlngs = medicaoState.pontos.map(function(p) {
        return [p.lat, p.lng];
    });
    
    // Criar polígono temporário
    medicaoState.layer = L.polygon(latlngs, {
        color: '#ff6600',
        weight: 3,
        opacity: 0.7,
        fillColor: '#ff6600',
        fillOpacity: 0.2,
        dashArray: '5, 5'
    }).addTo(map);
    
    // Adicionar marcadores nos pontos
    medicaoState.pontos.forEach(function(p, i) {
        L.circleMarker([p.lat, p.lng], {
            radius: 5,
            color: '#ff6600',
            fillColor: '#ff6600',
            fillOpacity: 1
        }).addTo(medicaoState.layer);
    });
}

function atualizarConteudoPainelArea() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var html = [];
    
    if (medicaoState.pontos.length < 3) {
        html.push('<p style="color: #666; font-size: 13px;">Clique no mapa para adicionar pontos (mínimo 3)</p>');
        html.push('<p style="color: #999; font-size: 12px;">Pontos adicionados: ' + medicaoState.pontos.length + '</p>');
    } else {
        // Calcular perímetro
        var perimetro = 0;
        for (var i = 0; i < medicaoState.pontos.length; i++) {
            var p1 = medicaoState.pontos[i];
            var p2 = medicaoState.pontos[(i + 1) % medicaoState.pontos.length];
            perimetro += calcularDistanciaCartesiana(p1.e, p1.n, p2.e, p2.n);
        }
        
        // Calcular área
        var area = calcularAreaPoligono(medicaoState.pontos);
        var areaHectares = area / 10000;
        
        // Perímetro
        html.push('<div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">');
        html.push('<div style="display: flex; justify-content: space-between; align-items: center;">');
        html.push('<strong style="font-size: 14px;">Perímetro</strong>');
        html.push('<strong style="font-size: 16px; color: #ff6600;">' + perimetro.toFixed(3) + '</strong>');
        html.push('</div>');
        html.push('<div style="font-size: 12px; color: #666; margin-top: 4px;">metros</div>');
        html.push('</div>');
        
        // Área
        html.push('<div style="padding: 10px; background: #e3f2fd; border-radius: 4px;">');
        html.push('<div style="display: flex; justify-content: space-between; align-items: center;">');
        html.push('<strong style="font-size: 14px;">Área</strong>');
        html.push('<strong style="font-size: 16px; color: #3388ff;">' + area.toFixed(2) + '</strong>');
        html.push('</div>');
        html.push('<div style="font-size: 12px; color: #666; margin-top: 4px;">m²</div>');
        html.push('<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #90caf9;">');
        html.push('<div style="font-size: 13px; color: #1976d2;">' + areaHectares.toFixed(4) + ' hectares</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Info
        html.push('<div style="margin-top: 10px; font-size: 12px; color: #666;">');
        html.push('Vértices: ' + medicaoState.pontos.length);
        html.push('</div>');
    }
    
    conteudo.innerHTML = html.join('');
}

console.log('✅ [v2.18] Ferramenta Medir Área carregada!');



// ===== FERRAMENTA: MEDIR AZIMUTE =====

function ativarMedirAzimute() {
    console.log('[MEDIR] Ativando Medir Azimute');
    
    // Fechar se já estiver aberto
    if (medicaoState.ativa === 'azimute' && medicaoState.painelAberto) {
        fecharPainelMedicao();
        return;
    }
    
    // Resetar estado
    medicaoState.ativa = 'azimute';
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    
    // Abrir painel
    abrirPainelMedicao('Medir Azimute');
    atualizarConteudoPainelAzimute();
    
    // Adicionar event listener ao mapa
    map.on('click', onMapClickAzimute);
    
    showMessage('Clique em 2 pontos no mapa: origem e destino', 'info');
}

function onMapClickAzimute(e) {
    if (medicaoState.ativa !== 'azimute') return;
    
    // Converter LatLng para UTM
    var utm = latLngToUTM(e.latlng.lat, e.latlng.lng, '21S');
    
    // Adicionar ponto
    medicaoState.pontos.push({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        e: utm.e,
        n: utm.n
    });
    
    // Limitar a 2 pontos
    if (medicaoState.pontos.length > 2) {
        medicaoState.pontos.shift(); // Remove o primeiro
    }
    
    // Atualizar desenho
    desenharAzimuteTemporario();
    
    // Atualizar painel
    atualizarConteudoPainelAzimute();
}

function desenharAzimuteTemporario() {
    // Limpar desenho anterior
    limparDesenhoTemporario();
    
    if (medicaoState.pontos.length < 2) {
        // Desenhar apenas o primeiro ponto
        if (medicaoState.pontos.length === 1) {
            var p = medicaoState.pontos[0];
            medicaoState.layer = L.circleMarker([p.lat, p.lng], {
                radius: 6,
                color: '#9c27b0',
                fillColor: '#9c27b0',
                fillOpacity: 1
            }).addTo(map);
        }
        return;
    }
    
    // Criar linha entre os 2 pontos
    var latlngs = medicaoState.pontos.map(function(p) {
        return [p.lat, p.lng];
    });
    
    medicaoState.layer = L.layerGroup().addTo(map);
    
    L.polyline(latlngs, {
        color: '#9c27b0',
        weight: 3,
        opacity: 0.8
    }).addTo(medicaoState.layer);
    
    // Marcadores
    L.circleMarker(latlngs[0], {
        radius: 6,
        color: '#9c27b0',
        fillColor: '#9c27b0',
        fillOpacity: 1
    }).bindTooltip('Origem', {permanent: true, direction: 'top'}).addTo(medicaoState.layer);
    
    L.circleMarker(latlngs[1], {
        radius: 6,
        color: '#9c27b0',
        fillColor: '#9c27b0',
        fillOpacity: 1
    }).bindTooltip('Destino', {permanent: true, direction: 'top'}).addTo(medicaoState.layer);
}

function atualizarConteudoPainelAzimute() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var html = [];
    
    if (medicaoState.pontos.length < 2) {
        html.push('<p style="color: #666; font-size: 13px;">Clique em 2 pontos no mapa</p>');
        html.push('<p style="color: #999; font-size: 12px;">Pontos: ' + medicaoState.pontos.length + ' / 2</p>');
    } else {
        var p1 = medicaoState.pontos[0];
        var p2 = medicaoState.pontos[1];
        
        // Calcular azimute
        var azimute = calcularAzimute(p1.e, p1.n, p2.e, p2.n);
        
        // Calcular distância
        var distancia = calcularDistanciaCartesiana(p1.e, p1.n, p2.e, p2.n);
        
        // Azimute
        html.push('<div style="padding: 15px; background: #f3e5f5; border-radius: 4px; margin-bottom: 15px;">');
        html.push('<div style="text-align: center;">');
        html.push('<div style="font-size: 14px; color: #666; margin-bottom: 8px;">Azimute</div>');
        html.push('<div style="font-size: 32px; font-weight: bold; color: #9c27b0;">' + azimute.toFixed(4) + '°</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Distância
        html.push('<div style="padding: 10px; background: #f5f5f5; border-radius: 4px;">');
        html.push('<div style="display: flex; justify-content: space-between;">');
        html.push('<span style="font-size: 13px;">Distância:</span>');
        html.push('<strong style="font-size: 14px;">' + distancia.toFixed(3) + ' m</strong>');
        html.push('</div>');
        html.push('</div>');
        
        // Coordenadas
        html.push('<div style="margin-top: 15px; font-size: 12px; color: #666;">');
        html.push('<div style="margin-bottom: 6px;"><strong>Origem:</strong> E=' + p1.e.toFixed(3) + ', N=' + p1.n.toFixed(3) + '</div>');
        html.push('<div><strong>Destino:</strong> E=' + p2.e.toFixed(3) + ', N=' + p2.n.toFixed(3) + '</div>');
        html.push('</div>');
    }
    
    conteudo.innerHTML = html.join('');
}

// ===== FERRAMENTA: MEDIR ÂNGULO =====

function ativarMedirAngulo() {
    console.log('[MEDIR] Ativando Medir Ângulo');
    
    // Fechar se já estiver aberto
    if (medicaoState.ativa === 'angulo' && medicaoState.painelAberto) {
        fecharPainelMedicao();
        return;
    }
    
    // Resetar estado
    medicaoState.ativa = 'angulo';
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    
    // Abrir painel
    abrirPainelMedicao('Medir Ângulo');
    atualizarConteudoPainelAngulo();
    
    // Adicionar event listener ao mapa
    map.on('click', onMapClickAngulo);
    
    showMessage('Clique em 3 pontos no mapa: P1, Vértice (centro), P2', 'info');
}

function onMapClickAngulo(e) {
    if (medicaoState.ativa !== 'angulo') return;
    
    // Converter LatLng para UTM
    var utm = latLngToUTM(e.latlng.lat, e.latlng.lng, '21S');
    
    // Adicionar ponto
    medicaoState.pontos.push({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        e: utm.e,
        n: utm.n
    });
    
    // Limitar a 3 pontos
    if (medicaoState.pontos.length > 3) {
        medicaoState.pontos.shift(); // Remove o primeiro
    }
    
    // Atualizar desenho
    desenharAnguloTemporario();
    
    // Atualizar painel
    atualizarConteudoPainelAngulo();
}

function desenharAnguloTemporario() {
    // Limpar desenho anterior
    limparDesenhoTemporario();
    
    if (medicaoState.pontos.length < 2) {
        // Desenhar apenas pontos
        medicaoState.layer = L.layerGroup().addTo(map);
        medicaoState.pontos.forEach(function(p, i) {
            L.circleMarker([p.lat, p.lng], {
                radius: 6,
                color: '#ff5722',
                fillColor: '#ff5722',
                fillOpacity: 1
            }).addTo(medicaoState.layer);
        });
        return;
    }
    
    medicaoState.layer = L.layerGroup().addTo(map);
    
    // Desenhar linhas
    if (medicaoState.pontos.length >= 2) {
        L.polyline([[medicaoState.pontos[0].lat, medicaoState.pontos[0].lng],
                    [medicaoState.pontos[1].lat, medicaoState.pontos[1].lng]], {
            color: '#ff5722',
            weight: 3,
            opacity: 0.8
        }).addTo(medicaoState.layer);
    }
    
    if (medicaoState.pontos.length === 3) {
        L.polyline([[medicaoState.pontos[1].lat, medicaoState.pontos[1].lng],
                    [medicaoState.pontos[2].lat, medicaoState.pontos[2].lng]], {
            color: '#ff5722',
            weight: 3,
            opacity: 0.8
        }).addTo(medicaoState.layer);
    }
    
    // Marcadores
    medicaoState.pontos.forEach(function(p, i) {
        var label = i === 0 ? 'P1' : (i === 1 ? 'Vértice' : 'P2');
        L.circleMarker([p.lat, p.lng], {
            radius: 6,
            color: '#ff5722',
            fillColor: '#ff5722',
            fillOpacity: 1
        }).bindTooltip(label, {permanent: true, direction: 'top'}).addTo(medicaoState.layer);
    });
}

function atualizarConteudoPainelAngulo() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var html = [];
    
    if (medicaoState.pontos.length < 3) {
        html.push('<p style="color: #666; font-size: 13px;">Clique em 3 pontos no mapa</p>');
        html.push('<p style="color: #999; font-size: 12px;">Pontos: ' + medicaoState.pontos.length + ' / 3</p>');
        html.push('<p style="color: #999; font-size: 11px; margin-top: 8px;">Ordem: P1, Vértice (centro), P2</p>');
    } else {
        var p1 = medicaoState.pontos[0];
        var p2 = medicaoState.pontos[1]; // Vértice
        var p3 = medicaoState.pontos[2];
        
        // Calcular ângulo
        var angulo = calcularAngulo(p1, p2, p3);
        
        // Ângulo
        html.push('<div style="padding: 15px; background: #fbe9e7; border-radius: 4px; margin-bottom: 15px;">');
        html.push('<div style="text-align: center;">');
        html.push('<div style="font-size: 14px; color: #666; margin-bottom: 8px;">Ângulo</div>');
        html.push('<div style="font-size: 32px; font-weight: bold; color: #ff5722;">' + angulo.toFixed(4) + '°</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Coordenadas
        html.push('<div style="font-size: 12px; color: #666;">');
        html.push('<div style="margin-bottom: 6px;"><strong>P1:</strong> E=' + p1.e.toFixed(3) + ', N=' + p1.n.toFixed(3) + '</div>');
        html.push('<div style="margin-bottom: 6px;"><strong>Vértice:</strong> E=' + p2.e.toFixed(3) + ', N=' + p2.n.toFixed(3) + '</div>');
        html.push('<div><strong>P2:</strong> E=' + p3.e.toFixed(3) + ', N=' + p3.n.toFixed(3) + '</div>');
        html.push('</div>');
    }
    
    conteudo.innerHTML = html.join('');
}

console.log('✅ [v2.18] Ferramentas Medir Azimute e Medir Ângulo carregadas!');



// ===== FERRAMENTA: COORDENADA DO VÉRTICE =====

function ativarCoordenadaVertice() {
    console.log('[MEDIR] Ativando Coordenada do Vértice');
    
    // Fechar se já estiver aberto
    if (medicaoState.ativa === 'coordenada' && medicaoState.painelAberto) {
        fecharPainelMedicao();
        return;
    }
    
    // Resetar estado
    medicaoState.ativa = 'coordenada';
    medicaoState.pontos = [];
    limparDesenhoTemporario();
    
    // Abrir painel
    abrirPainelMedicao('Coordenada do Vértice');
    atualizarConteudoPainelCoordenada();
    
    // Adicionar event listener ao mapa
    map.on('click', onMapClickCoordenada);
    
    showMessage('Clique em um ponto no mapa para ver suas coordenadas', 'info');
}

function onMapClickCoordenada(e) {
    if (medicaoState.ativa !== 'coordenada') return;
    
    // Converter LatLng para UTM
    var utm = latLngToUTM(e.latlng.lat, e.latlng.lng, '21S');
    
    // Substituir ponto (sempre 1 ponto)
    medicaoState.pontos = [{
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        e: utm.e,
        n: utm.n
    }];
    
    // Atualizar desenho
    desenharCoordenadaTemporaria();
    
    // Atualizar painel
    atualizarConteudoPainelCoordenada();
}

function desenharCoordenadaTemporaria() {
    // Limpar desenho anterior
    limparDesenhoTemporario();
    
    if (medicaoState.pontos.length === 0) return;
    
    var p = medicaoState.pontos[0];
    
    // Criar marcador temporário
    medicaoState.layer = L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.8,
        weight: 3
    }).addTo(map);
}

function atualizarConteudoPainelCoordenada() {
    var conteudo = document.getElementById('painel-medicao-conteudo');
    if (!conteudo) return;
    
    var html = [];
    
    if (medicaoState.pontos.length === 0) {
        html.push('<p style="color: #666; font-size: 13px;">Clique em um ponto no mapa</p>');
    } else {
        var p = medicaoState.pontos[0];
        
        // Coordenadas UTM
        html.push('<div style="padding: 15px; background: #e8f5e9; border-radius: 4px; margin-bottom: 15px;">');
        html.push('<div style="font-size: 14px; font-weight: bold; color: #2e7d32; margin-bottom: 12px;">Coordenadas UTM</div>');
        
        html.push('<div style="margin-bottom: 10px;">');
        html.push('<div style="font-size: 12px; color: #666; margin-bottom: 4px;">Este (E)</div>');
        html.push('<div style="font-size: 18px; font-weight: bold; color: #4CAF50;">' + p.e.toFixed(3) + '</div>');
        html.push('</div>');
        
        html.push('<div style="margin-bottom: 10px;">');
        html.push('<div style="font-size: 12px; color: #666; margin-bottom: 4px;">Norte (N)</div>');
        html.push('<div style="font-size: 18px; font-weight: bold; color: #4CAF50;">' + p.n.toFixed(3) + '</div>');
        html.push('</div>');
        
        html.push('<div style="font-size: 11px; color: #666;">Fuso: 21S</div>');
        html.push('</div>');
        
        // Coordenadas Geográficas
        html.push('<div style="padding: 15px; background: #f5f5f5; border-radius: 4px; margin-bottom: 15px;">');
        html.push('<div style="font-size: 14px; font-weight: bold; color: #555; margin-bottom: 12px;">Coordenadas Geográficas</div>');
        
        html.push('<div style="margin-bottom: 10px;">');
        html.push('<div style="font-size: 12px; color: #666; margin-bottom: 4px;">Latitude</div>');
        html.push('<div style="font-size: 16px; font-weight: bold; color: #333;">' + p.lat.toFixed(6) + '°</div>');
        html.push('</div>');
        
        html.push('<div>');
        html.push('<div style="font-size: 12px; color: #666; margin-bottom: 4px;">Longitude</div>');
        html.push('<div style="font-size: 16px; font-weight: bold; color: #333;">' + p.lng.toFixed(6) + '°</div>');
        html.push('</div>');
        html.push('</div>');
        
        // Botões de copiar
        html.push('<div style="display: flex; gap: 8px; margin-top: 15px;">');
        html.push('<button onclick="copiarCoordenadaUTM()" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">');
        html.push('📋 Copiar UTM');
        html.push('</button>');
        html.push('<button onclick="copiarCoordenadaGeo()" style="flex: 1; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">');
        html.push('📋 Copiar Lat/Lon');
        html.push('</button>');
        html.push('</div>');
    }
    
    conteudo.innerHTML = html.join('');
}

// Copiar coordenada UTM
function copiarCoordenadaUTM() {
    if (medicaoState.pontos.length === 0) return;
    
    var p = medicaoState.pontos[0];
    var texto = 'E: ' + p.e.toFixed(3) + ', N: ' + p.n.toFixed(3);
    
    navigator.clipboard.writeText(texto).then(function() {
        showMessage('Coordenadas UTM copiadas!', 'success');
    }).catch(function(err) {
        console.error('Erro ao copiar:', err);
        showMessage('Erro ao copiar coordenadas', 'error');
    });
}

// Copiar coordenada geográfica
function copiarCoordenadaGeo() {
    if (medicaoState.pontos.length === 0) return;
    
    var p = medicaoState.pontos[0];
    var texto = 'Lat: ' + p.lat.toFixed(6) + '°, Lon: ' + p.lng.toFixed(6) + '°';
    
    navigator.clipboard.writeText(texto).then(function() {
        showMessage('Coordenadas geográficas copiadas!', 'success');
    }).catch(function(err) {
        console.error('Erro ao copiar:', err);
        showMessage('Erro ao copiar coordenadas', 'error');
    });
}

console.log('✅ [v2.18] Ferramenta Coordenada do Vértice carregada!');
console.log('✅ [v2.18] TODAS as Ferramentas de Medição carregadas com sucesso!');


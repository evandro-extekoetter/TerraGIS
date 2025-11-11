// ===== MÓDULO DE LAYOUT DE IMPRESSÃO =====
// Estilo QGIS Print Layout
// Viewport interativo + Campos editáveis + Exportação PDF A4

var layoutImpressao = {
    modalAberto: false,
    mapaViewport: null,
    configuracao: {
        titulo: '',
        responsavel: '',
        observacoes: '',
        data: ''
    }
};

// ===== ABRIR MÓDULO DE LAYOUT =====
function abrirLayoutImpressao() {
    console.log('[LAYOUT] Abrindo módulo de impressão');
    
    // Criar modal
    criarModalLayoutImpressao();
    
    // Inicializar data com hoje
    var hoje = new Date();
    var dataFormatada = hoje.getDate().toString().padStart(2, '0') + '/' + 
                        (hoje.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                        hoje.getFullYear();
    document.getElementById('layout-data').value = dataFormatada;
    layoutImpressao.configuracao.data = dataFormatada;
    
    // Inicializar viewport do mapa
    setTimeout(function() {
        inicializarViewportMapa();
    }, 100);
    
    layoutImpressao.modalAberto = true;
}

// ===== CRIAR MODAL HTML =====
function criarModalLayoutImpressao() {
    // Remover modal existente se houver
    var modalExistente = document.getElementById('modal-layout-impressao');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    var modalHTML = `
        <div id="modal-layout-impressao" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                width: 95%;
                height: 98%;
                background: white;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
            ">
                <!-- Cabeçalho -->
                <div style="
                    padding: 15px 20px;
                    border-bottom: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #2c3e50;
                    color: white;
                    border-radius: 8px 8px 0 0;
                ">
                    <h2 style="margin: 0; font-size: 20px;">📄 Layout de Impressão</h2>
                    <button onclick="fecharLayoutImpressao()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                
                <!-- Conteúdo Principal -->
                <div style="
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                ">
                    <!-- Painel Esquerdo: Configurações -->
                    <div style="
                        width: 350px;
                        padding: 20px;
                        border-right: 1px solid #ddd;
                        overflow-y: auto;
                    ">
                        <h3 style="margin-top: 0;">⚙️ Configurações</h3>
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Título:</label>
                        <input type="text" id="layout-titulo" 
                            placeholder="Digite o título do mapa"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Responsável:</label>
                        <input type="text" id="layout-responsavel" 
                            placeholder="Nome do responsável"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Observações:</label>
                        <textarea id="layout-observacoes" 
                            placeholder="Observações adicionais"
                            oninput="atualizarPreviewLayout()"
                            rows="4"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                                resize: vertical;
                            "></textarea>
                        
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Data:</label>
                        <input type="text" id="layout-data" 
                            placeholder="DD/MM/AAAA"
                            oninput="atualizarPreviewLayout()"
                            style="
                                width: 100%;
                                padding: 8px;
                                margin-bottom: 25px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-sizing: border-box;
                            ">
                        
                        <button onclick="gerarPDFLayout()" style="
                            width: 100%;
                            padding: 12px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            margin-bottom: 10px;
                        ">📥 Gerar PDF</button>
                        
                        <button onclick="fecharLayoutImpressao()" style="
                            width: 100%;
                            padding: 12px;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                        ">✖ Cancelar</button>
                    </div>
                    
                    <!-- Painel Direito: Preview A4 -->
                    <div style="
                        flex: 1;
                        padding: 20px;
                        background: #f5f5f5;
                        overflow: auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div id="preview-a4-wrapper" style="
                            transform: scale(0.75);
                            transform-origin: center center;
                        ">
                            <div id="preview-a4-container" style="
                                width: 210mm;
                                height: 297mm;
                                background: white;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                position: relative;
                            ">
                            <!-- Viewport do Mapa -->
                            <div id="viewport-mapa" style="
                                position: absolute;
                                top: 10mm;
                                left: 10mm;
                                right: 10mm;
                                bottom: 70mm;
                                border: 1mm solid black;
                                overflow: hidden;
                            ">
                                <!-- Mapa será inserido aqui -->
                            </div>
                            
                            <!-- Controles do Viewport -->
                            <div style="
                                position: absolute;
                                top: 15mm;
                                left: 15mm;
                                background: white;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                padding: 5px;
                                z-index: 1000;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            ">
                                <button onclick="zoomInViewport()" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    margin-bottom: 2px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                ">+</button>
                                <button onclick="zoomOutViewport()" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    margin-bottom: 2px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 18px;
                                    font-weight: bold;
                                ">−</button>
                                <button onclick="enquadrarGeometriaViewport()" title="Enquadrar geometria ativa" style="
                                    display: block;
                                    width: 30px;
                                    height: 30px;
                                    background: white;
                                    border: 1px solid #ccc;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">🎯</button>
                            </div>
                            
                            <!-- Rosa dos Ventos / Indicador Norte -->
                            <div style="
                                position: absolute;
                                top: 15mm;
                                right: 15mm;
                                z-index: 1000;
                            ">
                                <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Círculo externo -->
                                    <circle cx="25" cy="25" r="23" fill="white" stroke="black" stroke-width="1.5"/>
                                    <!-- Seta Norte (preta) -->
                                    <path d="M 25 5 L 30 25 L 25 20 L 20 25 Z" fill="black" stroke="black" stroke-width="1"/>
                                    <!-- Seta Sul (branca) -->
                                    <path d="M 25 45 L 20 25 L 25 30 L 30 25 Z" fill="white" stroke="black" stroke-width="1"/>
                                    <!-- Letra N -->
                                    <text x="25" y="12" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" fill="white">N</text>
                                </svg>
                            </div>
                            
                            <!-- Rodapé: Título -->
                            <div style="
                                position: absolute;
                                bottom: 50mm;
                                left: 10mm;
                                right: 10mm;
                                height: 15mm;
                                border: 1mm solid black;
                                padding: 2mm;
                                display: flex;
                                flex-direction: column;
                            ">
                                <div style="font-size: 8px; font-weight: bold; color: black;">título:</div>
                                <div id="preview-titulo" style="font-size: 24px; font-weight: bold; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; color: black;">TITULO (EDITAVEL)</div>
                            </div>
                            
                            <!-- Rodapé: Responsável e Observações -->
                            <div style="
                                position: absolute;
                                bottom: 20mm;
                                left: 10mm;
                                right: 10mm;
                                height: 30mm;
                                border: 1mm solid black;
                                border-top: none;
                                display: flex;
                            ">
                                <!-- Responsável -->
                                <div style="
                                    flex: 1;
                                    border-right: 1mm solid black;
                                    padding: 2mm;
                                    display: flex;
                                    flex-direction: column;
                                ">
                                    <div style="font-size: 8px; font-weight: bold; color: black;">Responsavel:</div>
                                    <div id="preview-responsavel" style="font-size: 11px; flex: 1; overflow: hidden; color: black;">RESPONSAVEL (EDITAVEL)</div>
                                </div>
                                
                                <!-- Observações -->
                                <div style="
                                    flex: 1;
                                    padding: 2mm;
                                    display: flex;
                                    flex-direction: column;
                                ">
                                    <div style="font-size: 8px; font-weight: bold; color: black;">Observações</div>
                                    <div id="preview-observacoes" style="font-size: 11px; flex: 1; overflow: hidden; color: black;">OBSERVAÇÕES (EDITAVEL)</div>
                                </div>
                            </div>
                            
                            <!-- Rodapé: Data -->
                            <div style="
                                position: absolute;
                                bottom: 10mm;
                                left: 10mm;
                                right: 10mm;
                                height: 10mm;
                                border: 1mm solid black;
                                border-top: none;
                                padding: 2mm;
                                display: flex;
                                flex-direction: column;
                            ">
                                <div style="font-size: 8px; font-weight: bold; color: black;">Data:</div>
                                <div id="preview-data" style="font-size: 11px; color: black;">DATAL 00/00/00 (EDITAVEL)</div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== FECHAR MODAL =====
function fecharLayoutImpressao() {
    console.log('[LAYOUT] Fechando módulo de impressão');
    
    // Destruir mapa viewport
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.remove();
        layoutImpressao.mapaViewport = null;
    }
    
    // Remover modal
    var modal = document.getElementById('modal-layout-impressao');
    if (modal) {
        modal.remove();
    }
    
    layoutImpressao.modalAberto = false;
}

// ===== INICIALIZAR VIEWPORT DO MAPA =====
function inicializarViewportMapa() {
    console.log('[LAYOUT] Inicializando viewport do mapa');
    
    var container = document.getElementById('viewport-mapa');
    if (!container) {
        console.error('[LAYOUT] Container viewport-mapa não encontrado');
        return;
    }
    
    // Criar mapa Leaflet independente
    layoutImpressao.mapaViewport = L.map('viewport-mapa', {
        zoomControl: false,
        attributionControl: false
    });
    
    // Adicionar camada base (mesma do mapa principal)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(layoutImpressao.mapaViewport);
    
    // Copiar camadas do mapa principal
    copiarCamadasParaViewport();
    
    // Enquadrar automaticamente na camada ativa
    setTimeout(function() {
        enquadrarCamadaAtivaInicial();
    }, 200);
    
    console.log('[LAYOUT] Viewport inicializado');
}

// ===== COPIAR CAMADAS DO MAPA PRINCIPAL =====
function copiarCamadasParaViewport() {
    console.log('[LAYOUT] Copiando camadas para viewport');
    
    if (!terraManager || !layoutImpressao.mapaViewport) {
        console.error('[LAYOUT] terraManager ou mapaViewport não disponível');
        return;
    }
    
    var totalCopiadas = 0;
    
    // Percorrer todas as camadas do terraManager
    for (var key in terraManager.layers) {
        var layer = terraManager.layers[key];
        
        if (!layer.visible) {
            console.log('[LAYOUT] Pulando camada invisível:', key);
            continue; // Pular camadas invisíveis
        }
        
        console.log('[LAYOUT] Processando camada visível:', key);
        console.log('[LAYOUT] Layer object:', layer);
        
        // TerraLayer usa geometryLayer (L.Polygon ou L.Polyline)
        if (layer.geometryLayer) {
            var geom = layer.geometryLayer;
            console.log('[LAYOUT] geometryLayer encontrado:', geom);
            
            if (geom instanceof L.Polygon) {
                var coords = geom.getLatLngs();
                var copia = L.polygon(coords, {
                    color: layer.color || geom.options.color || 'blue',
                    fillColor: layer.color || geom.options.fillColor || 'blue',
                    fillOpacity: 0.2,
                    weight: 2
                });
                copia.addTo(layoutImpressao.mapaViewport);
                totalCopiadas++;
                console.log('[LAYOUT] Polígono copiado');
            } else if (geom instanceof L.Polyline) {
                var coords = geom.getLatLngs();
                var copia = L.polyline(coords, {
                    color: layer.color || geom.options.color || 'red',
                    weight: 2
                });
                copia.addTo(layoutImpressao.mapaViewport);
                totalCopiadas++;
                console.log('[LAYOUT] Polilinha copiada');
            }
        }
        
        // Copiar vértices se houver (opcional)
        if (layer.verticesLayer && layer.verticesLayer.getLayers) {
            layer.verticesLayer.eachLayer(function(marker) {
                if (marker instanceof L.CircleMarker || marker instanceof L.Marker) {
                    var latlng = marker.getLatLng();
                    L.circleMarker(latlng, {
                        radius: 3,
                        color: layer.vertexColor || 'red',
                        fillColor: layer.vertexColor || 'red',
                        fillOpacity: 0.8,
                        weight: 1
                    }).addTo(layoutImpressao.mapaViewport);
                    totalCopiadas++;
                }
            });
        }
    }
    
    console.log('[LAYOUT] Total de geometrias copiadas:', totalCopiadas);
}

// ===== ENQUADRAR CAMADA ATIVA INICIAL =====
function enquadrarCamadaAtivaInicial() {
    console.log('[LAYOUT] Enquadrando camada ativa inicial');
    
    if (!layoutImpressao.mapaViewport || !terraManager) {
        return;
    }
    
    var camadaAtiva = terraManager.getActiveLayer();
    if (!camadaAtiva) {
        console.log('[LAYOUT] Nenhuma camada ativa, usando bounds de todas as camadas');
        // Se não houver camada ativa, enquadrar todas as geometrias
        var bounds = null;
        for (var key in terraManager.layers) {
            var layer = terraManager.layers[key];
            if (layer.visible && layer.geometryLayer) {
                var geom = layer.geometryLayer;
                if (geom.getBounds) {
                    if (!bounds) {
                        bounds = geom.getBounds();
                    } else {
                        bounds.extend(geom.getBounds());
                    }
                }
            }
        }
        if (bounds) {
            layoutImpressao.mapaViewport.fitBounds(bounds, {padding: [20, 20]});
        }
        return;
    }
    
    // Calcular bounds da camada ativa
    var bounds = null;
    if (camadaAtiva.geometryLayer) {
        var geom = camadaAtiva.geometryLayer;
        if (geom.getBounds) {
            bounds = geom.getBounds();
        }
    }
    
    if (bounds) {
        layoutImpressao.mapaViewport.fitBounds(bounds, {padding: [20, 20]});
        console.log('[LAYOUT] Camada ativa enquadrada');
    }
}

// ===== ATUALIZAR PREVIEW EM TEMPO REAL =====
function atualizarPreviewLayout() {
    layoutImpressao.configuracao.titulo = document.getElementById('layout-titulo').value;
    layoutImpressao.configuracao.responsavel = document.getElementById('layout-responsavel').value;
    layoutImpressao.configuracao.observacoes = document.getElementById('layout-observacoes').value;
    layoutImpressao.configuracao.data = document.getElementById('layout-data').value;
    
    document.getElementById('preview-titulo').textContent = layoutImpressao.configuracao.titulo || 'TITULO (EDITAVEL)';
    document.getElementById('preview-responsavel').textContent = layoutImpressao.configuracao.responsavel || 'RESPONSAVEL (EDITAVEL)';
    document.getElementById('preview-observacoes').textContent = layoutImpressao.configuracao.observacoes || 'OBSERVAÇÕES (EDITAVEL)';
    document.getElementById('preview-data').textContent = layoutImpressao.configuracao.data || 'DATAL 00/00/00 (EDITAVEL)';
}

// ===== GERAR PDF =====
function gerarPDFLayout() {
    console.log('[LAYOUT] Gerando PDF...');
    
    // Verificar se bibliotecas estão carregadas
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert('Erro: Bibliotecas de geração de PDF não carregadas. Verifique a conexão com a internet.');
        return;
    }
    
    // Mostrar mensagem de progresso
    var btnGerar = event.target;
    var textoOriginal = btnGerar.textContent;
    btnGerar.textContent = '⏳ Gerando PDF...';
    btnGerar.disabled = true;
    
    // Capturar o container A4
    var container = document.getElementById('preview-a4-container');
    var wrapper = document.getElementById('preview-a4-wrapper');
    
    // Forçar renderização do mapa antes de capturar
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.invalidateSize();
    }
    
    // Remover escala do wrapper temporariamente para captura
    var transformOriginal = wrapper.style.transform;
    wrapper.style.transform = 'scale(1)';
    
    // Forçar Leaflet a re-renderizar após remover escala
    setTimeout(function() {
        if (layoutImpressao.mapaViewport) {
            layoutImpressao.mapaViewport.invalidateSize();
            console.log('[LAYOUT] Mapa re-renderizado para captura');
        }
        
        // Aguardar tiles carregarem antes de capturar
        setTimeout(function() {
            console.log('[LAYOUT] Iniciando captura do canvas...');
            
            html2canvas(container, {
                scale: 1.5,
                useCORS: true,
                logging: true,
                backgroundColor: '#ffffff',
                allowTaint: false,
                foreignObjectRendering: false
            }).then(function(canvas) {
            // Restaurar escala do wrapper
            wrapper.style.transform = transformOriginal;
            console.log('[LAYOUT] Canvas capturado');
            
            // Criar PDF A4 (210mm x 297mm)
            var pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Adicionar imagem ao PDF
            var imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            
            // Gerar nome do arquivo
            var titulo = layoutImpressao.configuracao.titulo || 'mapa';
            var nomeArquivo = 'TerraGIS_' + titulo.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
            
            // Salvar PDF
            pdf.save(nomeArquivo);
            
            console.log('[LAYOUT] PDF gerado: ' + nomeArquivo);
            
            // Restaurar botão
            btnGerar.textContent = textoOriginal;
            btnGerar.disabled = false;
            
            alert('✅ PDF gerado com sucesso: ' + nomeArquivo);
        }).catch(function(erro) {
            // Restaurar escala do wrapper
            wrapper.style.transform = transformOriginal;
            
            console.error('[LAYOUT] Erro ao gerar PDF:', erro);
            alert('❌ Erro ao gerar PDF: ' + erro.message);
            
            // Restaurar botão
            btnGerar.textContent = textoOriginal;
            btnGerar.disabled = false;
        });
        }, 800); // Aguardar tiles carregarem
    }, 200); // Aguardar re-renderização do Leaflet
}

// ===== CONTROLES DO VIEWPORT =====
function zoomInViewport() {
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.zoomIn();
    }
}

function zoomOutViewport() {
    if (layoutImpressao.mapaViewport) {
        layoutImpressao.mapaViewport.zoomOut();
    }
}

function enquadrarGeometriaViewport() {
    console.log('[LAYOUT] Enquadrando todas as geometrias visíveis');
    
    if (!layoutImpressao.mapaViewport) {
        alert('Viewport não inicializado');
        return;
    }
    
    // Calcular bounds de TODAS as camadas do viewport (geometrias já copiadas)
    var bounds = null;
    var totalLayers = 0;
    var geometriasEncontradas = 0;
    
    layoutImpressao.mapaViewport.eachLayer(function(layer) {
        totalLayers++;
        console.log('[LAYOUT] Processando layer:', layer);
        
        // Pular camada base (TileLayer)
        if (layer instanceof L.TileLayer) {
            console.log('[LAYOUT] Pulando TileLayer');
            return;
        }
        
        geometriasEncontradas++;
        console.log('[LAYOUT] Geometria encontrada:', layer.constructor.name);
        
        // Polígonos e Polilinhas
        if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
            var layerBounds = layer.getBounds();
            console.log('[LAYOUT] Bounds da geometria:', layerBounds);
            if (!bounds) {
                bounds = layerBounds;
            } else {
                bounds.extend(layerBounds);
            }
        }
        // Marcadores
        else if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
            var latlng = layer.getLatLng();
            console.log('[LAYOUT] LatLng do marcador:', latlng);
            if (!bounds) {
                bounds = L.latLngBounds([latlng, latlng]);
            } else {
                bounds.extend(latlng);
            }
        }
    });
    
    console.log('[LAYOUT] Total de layers no viewport:', totalLayers);
    console.log('[LAYOUT] Geometrias encontradas:', geometriasEncontradas);
    console.log('[LAYOUT] Bounds final:', bounds);
    
    if (bounds) {
        layoutImpressao.mapaViewport.fitBounds(bounds, {padding: [20, 20]});
        console.log('[LAYOUT] Geometrias enquadradas com sucesso');
    } else if (geometriasEncontradas === 0) {
        console.error('[LAYOUT] Nenhuma geometria encontrada no viewport');
        alert('Nenhuma geometria visível encontrada. Verifique se há camadas visíveis no mapa principal.');
    } else {
        console.error('[LAYOUT] Geometrias encontradas mas bounds não calculado');
        alert('Não foi possível calcular o enquadramento');
    }
}

console.log('[LAYOUT] Módulo de Layout de Impressão carregado');


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
                        padding-top: 40px;
                        background: #f5f5f5;
                        overflow: auto;
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                    ">
                        <div id="preview-a4-wrapper" style="
                            /* Sem escala - tamanho real 100% */
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
                            <div id="viewport-controles" style="
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
                                <button onclick="atualizarMapaViewport()" title="Atualizar mapa com camadas visíveis" style="
                                    display: block;
                                    width: auto;
                                    padding: 5px 8px;
                                    margin-bottom: 5px;
                                    background: #4CAF50;
                                    color: white;
                                    border: 1px solid #45a049;
                                    cursor: pointer;
                                    font-size: 11px;
                                    font-weight: bold;
                                    border-radius: 3px;
                                ">🔄 Atualizar</button>
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
                                
                                <!-- Logo TerraCerta -->
                                <div style="
                                    position: absolute;
                                    top: 2mm;
                                    right: 2mm;
                                    text-align: center;
                                    font-size: 8px;
                                    color: black;
                                ">
                                    <div style="margin-bottom: 2px; font-weight: normal;">Produzido por:</div>
                                    <img src="https://terracerta.com.br/wp-content/uploads/2024/01/logo-terracerta-horizontal.png" 
                                         alt="TerraCerta" 
                                         style="height: 12mm; width: auto;" 
                                         onerror="this.style.display='none'">
                                </div>
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
    
    // Definir vista inicial (mundo inteiro)
    layoutImpressao.mapaViewport.setView([0, 0], 2);
    
    console.log('[LAYOUT] Viewport inicializado (vazio)');
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

// ===== GERAR PDF COM LEAFLET-IMAGE =====
function gerarPDFLayout() {
    console.log('[LAYOUT] Gerando PDF...');
    
    // Verificar se bibliotecas estão carregadas
    if (typeof leafletImage === 'undefined' || typeof jspdf === 'undefined') {
        alert('Erro: Bibliotecas de geração de PDF não carregadas. Verifique a conexão com a internet.');
        return;
    }
    
    // Mostrar mensagem de progresso
    var btnGerar = event.target;
    var textoOriginal = btnGerar.textContent;
    btnGerar.textContent = '⏳ Gerando PDF...';
    btnGerar.disabled = true;
    
    console.log('[LAYOUT] Preparando para captura...');
    
    // Ocultar controles de zoom durante captura
    var controles = document.getElementById('viewport-controles');
    if (controles) {
        controles.style.display = 'none';
        console.log('[LAYOUT] Controles ocultados');
    }
    
    // Forçar Leaflet a recalcular tamanho e posição
    if (layoutImpressao.mapaViewport) {
        console.log('[LAYOUT] Forçando invalidateSize(true)...');
        layoutImpressao.mapaViewport.invalidateSize(true);
        
        // Pegar centro e zoom atuais
        var center = layoutImpressao.mapaViewport.getCenter();
        var zoom = layoutImpressao.mapaViewport.getZoom();
        console.log('[LAYOUT] Centro:', center, 'Zoom:', zoom);
        
        // Aguardar evento moveend para garantir que o mapa foi reposicionado
        layoutImpressao.mapaViewport.once('moveend', function() {
            console.log('[LAYOUT] Mapa reposicionado, aguardando tiles...');
            
            // Aguardar mais 1.5 segundos para tiles carregarem
            setTimeout(function() {
                console.log('[LAYOUT] Capturando mapa com leaflet-image...');
                console.log('[LAYOUT] Centro final:', layoutImpressao.mapaViewport.getCenter(), 'Zoom final:', layoutImpressao.mapaViewport.getZoom());
                
                // Capturar mapa Leaflet com leaflet-image
                leafletImage(layoutImpressao.mapaViewport, function(err, canvas) {
            if (err) {
                console.error('[LAYOUT] Erro ao capturar mapa:', err);
                alert('❌ Erro ao capturar mapa: ' + err.message);
                
                // Restaurar controles
                if (controles) {
                    controles.style.display = 'block';
                }
                
                // Restaurar botão
                btnGerar.textContent = textoOriginal;
                btnGerar.disabled = false;
                return;
            }
            
            console.log('[LAYOUT] Mapa capturado:', canvas.width, 'x', canvas.height);
            
            // Criar PDF A4 (210mm x 297mm)
            var pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Dimensões do A4 em mm
            var pdfWidth = 210;
            var pdfHeight = 297;
            
            // Calcular proporção correta do mapa capturado
            var mapImgWidth = pdfWidth;
            var mapImgHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // Adicionar mapa ao PDF (proporção correta)
            var mapData = canvas.toDataURL('image/png');
            pdf.addImage(mapData, 'PNG', 0, 0, mapImgWidth, mapImgHeight);
            
            console.log('[LAYOUT] Mapa adicionado ao PDF:', mapImgWidth, 'x', mapImgHeight, 'mm');
            
            // Agora capturar os rodapés (título, responsável, observações, data)
            var rodapeContainer = document.getElementById('preview-a4-container');
            
            html2canvas(rodapeContainer, {
                scale: 1,
                useCORS: true,
                logging: false,
                backgroundColor: 'transparent',
                allowTaint: false
            }).then(function(rodapeCanvas) {
                console.log('[LAYOUT] Rodapés capturados:', rodapeCanvas.width, 'x', rodapeCanvas.height);
                
                // Calcular proporção correta dos rodapés
                var rodapeImgWidth = pdfWidth;
                var rodapeImgHeight = (rodapeCanvas.height * pdfWidth) / rodapeCanvas.width;
                
                // Adicionar rodapés ao PDF (proporção correta, sobrepor)
                var rodapeData = rodapeCanvas.toDataURL('image/png');
                pdf.addImage(rodapeData, 'PNG', 0, 0, rodapeImgWidth, rodapeImgHeight);
                
                console.log('[LAYOUT] Rodapés adicionados ao PDF:', rodapeImgWidth, 'x', rodapeImgHeight, 'mm');
                
                console.log('[LAYOUT] Rodapés adicionados ao PDF');
                
                // Gerar nome do arquivo
                var titulo = layoutImpressao.configuracao.titulo || 'mapa';
                var nomeArquivo = 'TerraGIS_' + titulo.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
                
                // Salvar PDF
                pdf.save(nomeArquivo);
                
                console.log('[LAYOUT] PDF gerado: ' + nomeArquivo);
                
                // Restaurar controles
                if (controles) {
                    controles.style.display = 'block';
                }
                
                // Restaurar botão
                btnGerar.textContent = textoOriginal;
                btnGerar.disabled = false;
                
                alert('✅ PDF gerado com sucesso: ' + nomeArquivo);
            }).catch(function(erro) {
                console.error('[LAYOUT] Erro ao capturar rodapés:', erro);
                alert('❌ Erro ao capturar rodapés: ' + erro.message);
                
                // Restaurar controles
                if (controles) {
                    controles.style.display = 'block';
                }
                
                // Restaurar botão
                btnGerar.textContent = textoOriginal;
                btnGerar.disabled = false;
            });
        }); // Fim callback leafletImage
            }, 1500); // Aguardar 1.5 segundos para tiles carregarem
        }); // Fim callback moveend
        
        // Forçar re-posicionamento para disparar evento moveend
        layoutImpressao.mapaViewport.setView(center, zoom, {animate: false});
    }
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




// ===== ATUALIZAR MAPA VIEWPORT =====
function atualizarMapaViewport() {
    console.log('[LAYOUT] Atualizando mapa viewport...');
    
    if (!layoutImpressao.mapaViewport) {
        alert('Viewport não inicializado');
        return;
    }
    
    // Limpar camadas existentes (exceto base)
    layoutImpressao.mapaViewport.eachLayer(function(layer) {
        if (!(layer instanceof L.TileLayer)) {
            layoutImpressao.mapaViewport.removeLayer(layer);
        }
    });
    
    console.log('[LAYOUT] Camadas antigas removidas');
    
    // Copiar camadas do mapa principal
    copiarCamadasParaViewport();
    
    // Enquadrar na geometria ativa
    setTimeout(function() {
        enquadrarCamadaAtivaInicial();
    }, 200);
    
    console.log('[LAYOUT] Mapa viewport atualizado');
}


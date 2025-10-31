# TerraGIS - Sistema GIS Web

Sistema GIS web para análise e edição de imóveis rurais, desenvolvido com Flask, Leaflet e JavaScript.

## 🚀 Funcionalidades

- ✅ Visualização de mapas interativos (OpenStreetMap, Google Earth, SIGEF, SNCI)
- ✅ Importação de arquivos Shapefile SIGEF
- ✅ Ferramentas de construção (Tabela, Lista, Ângulo)
- ✅ Ferramentas de edição de vértices e geometrias
- ✅ Ferramentas de análise (medição de área, distância, coordenadas)
- ✅ Gerenciador de camadas
- ✅ Exportação de dados

## 📋 Requisitos

- Python 3.8+
- Flask
- Dependências listadas em `requirements.txt`

## 🔧 Instalação Local

```bash
# Clonar o repositório
git clone https://github.com/evandro-extekoetter/TerraGIS.git
cd TerraGIS

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python main.py
```

Acesse: `http://localhost:5000`

## 🌐 Opções de Hospedagem

### 1. PythonAnywhere (Gratuito)

**Passos:**
1. Criar conta em https://www.pythonanywhere.com
2. Abrir console Bash
3. Clonar repositório: `git clone https://github.com/evandro-extekoetter/TerraGIS.git`
4. Criar Web App (Flask)
5. Configurar WSGI file apontando para `main.py`
6. Reload da aplicação

**URL:** `seu-usuario.pythonanywhere.com`

### 2. Render (Gratuito com limitações)

**Passos:**
1. Criar conta em https://render.com
2. New → Web Service
3. Conectar repositório GitHub
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python main.py`

**URL:** `terragis.onrender.com` (ou similar)

### 3. Railway (Gratuito com limitações)

**Passos:**
1. Criar conta em https://railway.app
2. New Project → Deploy from GitHub
3. Selecionar repositório TerraGIS
4. Railway detecta automaticamente Flask

**URL:** Gerada automaticamente

### 4. Heroku (Pago)

**Passos:**
1. Criar `Procfile`: `web: python main.py`
2. Instalar Heroku CLI
3. `heroku create terragis`
4. `git push heroku master`

**URL:** `terragis.herokuapp.com`

### 5. Servidor Próprio (VPS)

**Passos:**
1. Acessar servidor via SSH
2. Clonar repositório
3. Instalar dependências
4. Configurar Nginx + Gunicorn
5. Configurar domínio próprio

## 📁 Estrutura do Projeto

```
TerraGIS/
├── main.py              # Aplicação Flask principal
├── requirements.txt     # Dependências Python
├── static/
│   ├── css/
│   │   └── style.css   # Estilos customizados
│   └── js/
│       └── main.js     # Lógica JavaScript
├── templates/
│   └── index.html      # Template principal
└── README.md           # Este arquivo
```

## 🔄 Atualizações

Para atualizar o código:

```bash
git pull origin master
pip install -r requirements.txt  # Se houver novas dependências
python main.py
```

## 🐛 Problemas Conhecidos

- Cache de navegador pode causar problemas após atualizações (solução: Ctrl+Shift+R)
- Arquivos Shapefile devem estar em formato ZIP com todos os componentes (.shp, .dbf, .shx, .prj)

## 📝 Licença

Este projeto é de uso privado.

## 👤 Autor

Evandro Extekoetter
- GitHub: [@evandro-extekoetter](https://github.com/evandro-extekoetter)
- Email: evandroext@gmail.com

## 🆘 Suporte

Para problemas ou dúvidas, abra uma issue no GitHub:
https://github.com/evandro-extekoetter/TerraGIS/issues


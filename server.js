require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;
const SCRAPING_BEE_API_KEY = process.env.SCRAPING_BEE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(cors());
app.use(express.json());

// --- LÓGICA DO BACKEND ---

async function extractPageData(targetUrl) {
    console.log(`[Extractor] Iniciando extração em: ${targetUrl}`);
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiEndpoint = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPING_BEE_API_KEY}&url=${encodedUrl}&render_js=true`;
    try {
        const response = await fetch(apiEndpoint );
        if (!response.ok) throw new Error(`API de extração falhou: ${response.statusText}`);
        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('h1').first().text().trim() || $('title').first().text().trim();
        const priceMatch = $.text().match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        const price = priceMatch ? priceMatch[0] : 'Não informado';
        return { title, price };
    } catch (error) {
        console.error(`[Extractor] Erro: ${error.message}`);
        return { error: true, message: error.message };
    }
}

async function generateAiResponse(productData, userMessage) {
    console.log(`[AI] Gerando resposta para: "${userMessage}"`);
    const systemPrompt = `Você é um vendedor especialista. Seu único conhecimento é sobre o produto a seguir. Responda às perguntas do cliente com base estritamente nessas informações.
    Nome: ${productData.title}
    Preço: ${productData.price}`;
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": userMessage }]
            } )
        });
        if (!response.ok) throw new Error(`API de IA falhou: ${response.statusText}`);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error(`[AI] Erro: ${error.message}`);
        return "Desculpe, estou com um problema na minha conexão interna.";
    }
}

// --- ROTAS DA API ---

app.post('/api/chat', async (req, res) => {
    const { url, message } = req.body;
    if (!url || !message) return res.status(400).json({ error: "URL e mensagem são obrigatórias." });
    const productData = await extractPageData(url);
    if (productData.error) return res.status(500).json({ response: `Desculpe, não consegui analisar a página. Erro: ${productData.message}` });
    const aiResponse = await generateAiResponse(productData, message);
    res.json({ response: aiResponse });
});

// --- ROTA PRINCIPAL QUE SERVE O HTML ---

app.get('/', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkMágico Chatbot v7.0 - A Prova de Falhas</title>
        <style>
            body { font-family: sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; }
            .container { width: 100%; max-width: 450px; background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); overflow: hidden; }
            .header { padding: 1.5rem; text-align: center; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color: #fff; }
            .content { padding: 1.5rem; }
            .form-group { margin-bottom: 1rem; }
            label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333; }
            #url-input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
            #chat-window { margin-top: 1rem; border: 1px solid #eee; border-radius: 8px; height: 300px; padding: 1rem; overflow-y: auto; }
            .chat-input-area { display: flex; margin-top: 1rem; }
            #chat-input { flex: 1; padding: 0.75rem; border-radius: 18px; border: 1px solid #ccc; }
            #send-btn { padding: 0.5rem 1rem; border: none; background: #2575fc; color: #fff; border-radius: 18px; margin-left: 0.5rem; cursor: pointer; }
            .message { max-width: 85%; padding: 0.5rem 1rem; border-radius: 18px; margin-bottom: 0.5rem; line-height: 1.4; }
            .bot { background: #f1f1f1; color: #333; float: left; clear: both; }
            .user { background: #2575fc; color: #fff; float: right; clear: both; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>🤖 IA de Vendas v7.0</h1></div>
            <div class="content">
                <div class="form-group">
                    <label for="url-input">URL da Página de Vendas:</label>
                    <input type="url" id="url-input" placeholder="https://...">
                </div>
                <div id="chat-window"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Faça sua pergunta aqui...">
                    <button id="send-btn">Enviar</button>
                </div>
            </div>
        </div>
        <script>
            const urlInput = document.getElementById('url-input' );
            const chatWindow = document.getElementById('chat-window');
            const chatInput = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');

            const addMessage = (text, sender) => {
                const msgDiv = document.createElement('div');
                msgDiv.className = \`message \${sender}\`;
                msgDiv.textContent = text;
                chatWindow.appendChild(msgDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            };

            addMessage("Olá! Insira a URL da página que deseja analisar e faça sua pergunta.", "bot");

            const handleSendMessage = async () => {
                const url = urlInput.value.trim();
                const message = chatInput.value.trim();
                if (!url || !message) {
                    alert('Por favor, preencha a URL e a sua pergunta.');
                    return;
                }

                addMessage(message, 'user');
                chatInput.value = '';
                sendBtn.disabled = true;
                const thinkingMsg = document.createElement('div');
                thinkingMsg.className = 'message bot';
                thinkingMsg.textContent = 'Analisando e pensando... 🧠';
                chatWindow.appendChild(thinkingMsg);
                chatWindow.scrollTop = chatWindow.scrollHeight;

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, message }),
                    });
                    const data = await response.json();
                    thinkingMsg.textContent = data.response;
                } catch (error) {
                    thinkingMsg.textContent = 'Desculpe, ocorreu um erro. Verifique a URL e tente novamente.';
                } finally {
                    sendBtn.disabled = false;
                }
            };

            sendBtn.addEventListener('click', handleSendMessage);
            chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendMessage());
        </script>
    </body>
    </html>
    `;
    res.send(htmlContent);
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor v7.0 (Tudo em Um) iniciado na porta ${PORT}`);
});

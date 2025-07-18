require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;
const SCRAPING_ANT_API_KEY = process.env.SCRAPING_ANT_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve os arquivos da raiz (index.html, script.js)

if (!SCRAPING_ANT_API_KEY) {
    console.error("ERRO FATAL: SCRAPING_ANT_API_KEY não foi definida!");
    process.exit(1);
}

async function extractDataWithScrapingAnt(targetUrl) {
    console.log(`[ScrapingAnt] Iniciando extração para a URL: ${targetUrl}`);
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiEndpoint = `https://api.scrapingant.com/v2/general?url=${encodedUrl}&x-api-key=${SCRAPING_ANT_API_KEY}&browser=true`;

    try {
        const response = await fetch(apiEndpoint );
        if (!response.ok) {
            throw new Error(`API da ScrapingAnt falhou com status: ${response.status}`);
        }
        const data = await response.json();
        const html = data.content;
        const $ = cheerio.load(html);

        const title = $('title').first().text().trim() || $('h1').first().text().trim();
        const priceMatch = $.text().match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        const price = priceMatch ? priceMatch[0] : 'Consulte o preço';

        console.log(`[ScrapingAnt] Extração bem-sucedida para: ${title}`);
        return { title, price };
    } catch (error) {
        console.error(`[ScrapingAnt] Erro Crítico: ${error.message}`);
        return { error: true, message: error.message };
    }
}

app.post('/api/extract', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });
    const data = await extractDataWithScrapingAnt(url);
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor v4.0 (ScrapingAnt) iniciado na porta ${PORT}`);
});

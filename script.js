document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const salesPageUrlInput = document.getElementById('salesPageUrl');
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    let productDataCache = null;

    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    generateBtn.addEventListener('click', async () => {
        const url = salesPageUrlInput.value.trim();
        if (!url) return alert('Por favor, insira uma URL.');

        generateBtn.disabled = true;
        generateBtn.textContent = 'Analisando...';
        addMessage('Analisando a página. Isso pode levar até 15 segundos...', 'bot');
        chatContainer.classList.add('show');

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            productDataCache = data;
            addMessage(`Análise concluída! Estou pronto para responder sobre "${data.title}".`, 'bot');
        } catch (error) {
            addMessage(`Erro na análise: ${error.message}`, 'bot');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '🚀 Ativar Chatbot Inteligente';
        }
    });

    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message || !productDataCache) return;

        addMessage(message, 'user');
        chatInput.value = '';

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, productData: productDataCache }),
        });
        const data = await response.json();
        addMessage(data.response, 'bot');
    };

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

    document.querySelectorAll('.shortcut-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = salesPageUrlInput.value.trim();
            if (!url) return alert('Insira a URL primeiro.');
            
            const platform = btn.dataset.tab;
            const textToCopy = `Confira este produto: ${url}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert(`Link para ${platform.toUpperCase()} copiado!`);
            });
        });
    });
});

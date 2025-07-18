document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const activateBtn = document.getElementById('activate-btn');
    const chatWindow = document.getElementById('chat-window');
    
    let productDataCache = null;

    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    activateBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return alert('Por favor, insira uma URL.');

        activateBtn.disabled = true;
        activateBtn.textContent = 'Analisando...';
        addMessage('Analisando a página. Isso pode levar alguns segundos...', 'bot');

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
            activateBtn.disabled = false;
            activateBtn.textContent = 'Analisar Página';
        }
    });

    document.querySelectorAll('.footer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (!url) return alert('Insira a URL primeiro.');
            
            const platform = btn.dataset.platform;
            const textToCopy = `Confira este produto: ${url}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert(`Link para ${platform.toUpperCase()} copiado!`);
            });
        });
    });
});

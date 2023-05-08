class GPT3 {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async chatCompletion(messages, options = {}) {
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages,
                ...options
            }),
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);
        const data = await response.json();

        if (response.ok) {
            return data.choices;
        } else {
            throw new Error(data.error.message);
        }
    }
}

(function () {
    window.GPT3 = GPT3;
})();
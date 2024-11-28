// French Language Tutor Application
document.addEventListener('DOMContentLoaded', () => {
    const userQueryTextarea = document.getElementById('user-query');
    const submitBtn = document.getElementById('submit-btn');
    const resultContainer = document.getElementById('result-container');
    const explanationSteps = document.getElementById('explanation-steps');
    const answerContent = document.getElementById('answer-content');
    const copyBtn = document.getElementById('copy-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const queryTypeRadios = document.querySelectorAll('input[name="query-type"]');

    // API Configuration (to be replaced with actual key)
    const API_KEY = 'AIzaSyDZm9VpvHeGrS5YSYvZqTaL3q7tiXyH9dc';
    const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    // Utility Functions
    const showLoading = () => loadingOverlay.classList.remove('hidden');
    const hideLoading = () => loadingOverlay.classList.add('hidden');
    const showResults = () => resultContainer.classList.remove('hidden');
    const hideResults = () => resultContainer.classList.add('hidden');

    // Advanced Prompt Generation
    const generatePrompt = (query, queryType) => {
        const promptTemplates = {
            grammar: `As a French language expert, break down this grammar query into three core learning points:
1. Explain the fundamental grammatical concept
2. Highlight key rules or exceptions
3. Provide a final, correct French sentence demonstrating the concept

For this query: {QUERY}

Your response should be concise, clear, and educational. Provide the final sentence in French at the end.`,
            punctuation: `As a French punctuation specialist, distill this punctuation query into three essential insights:
1. Core rule or principle of the punctuation
2. Common mistakes or tricky applications
3. A perfectly punctuated French sentence example

For this query: {QUERY}

Explain briefly, then provide the precise French sentence at the end.`,
            vocabulary: `As a French language vocabulary expert, construct a three-step explanation:
1. Precise definition and context of the word/phrase
2. Nuanced usage and related expressions
3. A natural, contextual French sentence using the term

For this query: {QUERY}

Keep the explanation concise, with the final sentence in French.`
        };

        return promptTemplates[queryType].replace('{QUERY}', query);
    };

    // API Call Function
    const callGeminiAPI = async (prompt) => {
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
                topP: 0.9
            }
        };

        try {
            const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error:', error);
            return 'Désolé, une erreur est survenue. Veuillez réessayer.';
        }
    };

    // Process and Display Results
    const processResults = (apiResponse) => {
        // Split response into learning steps and final sentence
        const lines = apiResponse.split('\n').filter(line => line.trim() !== '');
        const learningSteps = lines.slice(0, -1);
        const finalSentence = lines[lines.length - 1];
        
        // Clear previous results
        explanationSteps.innerHTML = '';
        answerContent.innerHTML = '';

        // Populate learning steps
        learningSteps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.classList.add('learning-step');
            stepElement.innerHTML = `<strong>Step ${index + 1}:</strong> ${step}`;
            explanationSteps.appendChild(stepElement);
        });

        // Set final sentence in answer content
        answerContent.innerHTML = `${finalSentence}`;
    };

    // Event Listeners
    submitBtn.addEventListener('click', async () => {
        const query = userQueryTextarea.value.trim();
        if (!query) {
            alert('Veuillez saisir une question');
            return;
        }

        // Determine selected query type
        const selectedQueryType = Array.from(queryTypeRadios)
            .find(radio => radio.checked).value;

        showLoading();
        hideResults();

        try {
            const prompt = generatePrompt(query, selectedQueryType);
            const apiResponse = await callGeminiAPI(prompt);
            
            processResults(apiResponse);
            showResults();
        } catch (error) {
            console.error('Processing error:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            hideLoading();
        }
    });

    // Copy Functionality
    copyBtn.addEventListener('click', () => {
        const textToCopy = answerContent.innerText.replace('Exemple final: ', '').trim();
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                copyBtn.textContent = 'Copié!';
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copier
                    `;
                }, 1500);
            })
            .catch(err => {
                console.error('Copy failed:', err);
                alert('La copie a échoué. Veuillez réessayer.');
            });
    });

    // Optional: Clear results when starting a new query
    userQueryTextarea.addEventListener('input', () => {
        if (resultContainer.classList.contains('hidden') === false) {
            hideResults();
        }
    });
});

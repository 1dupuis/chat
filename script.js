// Configuration and Constants
const CONFIG = {
    // IMPORTANT: In a real-world application, NEVER expose API keys in client-side code
    // This should be handled server-side for security
    API_KEY: 'AIzaSyDZm9VpvHeGrS5YSYvZqTaL3q7tiXyH9dc',
    API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    MAX_TOKEN_OUTPUT: 500,
    QUERY_TYPES: ['grammar', 'punctuation', 'vocabulary']
};

// Utility Functions
class Utils {
    static showLoading(loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }

    static hideLoading(loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }

    static displayError(message) {
        const errorToast = document.createElement('div');
        errorToast.classList.add('error-toast');
        errorToast.textContent = message;
        document.body.appendChild(errorToast);
        
        setTimeout(() => errorToast.remove(), 3000);
    }

    static sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    static validateQueryType(queryType) {
        return CONFIG.QUERY_TYPES.includes(queryType);
    }
}

// Advanced Prompt Templates
const PROMPT_TEMPLATES = {
    grammar: {
        prefix: 'Advanced French Grammar Expert',
        template: `As an advanced French grammar specialist, provide an expert breakdown of this grammar concept with:
1. Precise grammatical rule explanation
2. Common mistakes and exceptions
3. Contextual usage and nuances
4. A native-like example sentence

Grammar Query: {QUERY}

Respond with clear, structured learning insights.`,
        tone: 'Academic and precise'
    },
    punctuation: {
        prefix: 'French Punctuation Specialist',
        template: `As a meticulous French punctuation expert, analyze this punctuation query by:
1. Explaining core punctuation rules
2. Highlighting typical usage errors
3. Providing advanced context and variations
4. Demonstrating with a sophisticated example

Punctuation Query: {QUERY}

Provide scholarly, nuanced insights.`,
        tone: 'Scholarly and detailed'
    },
    vocabulary: {
        prefix: 'French Language Vocabulary Connoisseur',
        template: `As a sophisticated French vocabulary expert, dissect this linguistic query by:
1. Providing etymological context
2. Exploring semantic variations
3. Demonstrating idiomatic and cultural usage
4. Crafting an authentic, context-rich example sentence

Vocabulary Query: {QUERY}

Deliver refined, culturally informed insights.`,
        tone: 'Intellectual and culturally aware'
    }
};

// API Interaction Service
class GeminiAPIService {
    static async callAPI(prompt) {
        // Validate input
        if (!prompt || typeof prompt !== 'string') {
            Utils.displayError('Invalid prompt provided');
            return null;
        }

        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: CONFIG.MAX_TOKEN_OUTPUT,
                topP: 0.9
            }
        };

        try {
            const response = await fetch(`${CONFIG.API_ENDPOINT}?key=${CONFIG.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('API Error:', error);
            Utils.displayError('Désolé, une erreur est survenue. Veuillez réessayer.');
            return null;
        }
    }
}

// Prompt Generation Service
class PromptService {
    static generatePrompt(query, queryType) {
        // Validate inputs
        if (!query || !queryType) {
            throw new Error('Missing query or query type');
        }

        if (!Utils.validateQueryType(queryType)) {
            throw new Error('Invalid query type');
        }

        const template = PROMPT_TEMPLATES[queryType];
        return template.template.replace('{QUERY}', query);
    }
}

// Result Processing Service
class ResultProcessor {
    static processResults(apiResponse) {
        if (!apiResponse) {
            return { learningSteps: [], finalSentence: 'No response received.' };
        }

        const lines = apiResponse.split('\n').filter(line => line.trim() !== '');
        
        // Ensure we have enough lines
        if (lines.length < 2) {
            return { 
                learningSteps: ['Unable to process the response.'], 
                finalSentence: lines[0] || 'No detailed response available.' 
            };
        }

        const learningSteps = lines.slice(0, -1);
        const finalSentence = lines[lines.length - 1];

        return { learningSteps, finalSentence };
    }

    static renderLearningSteps(steps, container) {
        if (!container) return;

        container.innerHTML = '';
        steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.classList.add('learning-step');
            stepElement.innerHTML = `
                <span class="step-number">Step ${index + 1}</span>
                <p>${step}</p>
            `;
            container.appendChild(stepElement);
        });
    }

    static renderFinalSentence(sentence, container) {
        if (container) {
            container.textContent = sentence;
        }
    }
}

// Main Application Controller
class FrenchTutorApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            userQuery: document.getElementById('user-query'),
            userQueryDisplay: document.getElementById('user-query-display'),
            submitBtn: document.getElementById('submit-btn'),
            resultContainer: document.getElementById('result-container'),
            explanationSteps: document.getElementById('explanation-steps'),
            answerContent: document.getElementById('answer-content'),
            copyBtn: document.getElementById('copy-btn'),
            loadingOverlay: document.getElementById('loading-overlay'),
            queryTypeRadios: document.querySelectorAll('input[name="query-type"]')
        };

        // Validate that all elements exist
        Object.entries(this.elements).forEach(([key, value]) => {
            if (!value) {
                console.warn(`Element '${key}' not found in the DOM`);
            }
        });
    }

    bindEvents() {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
        }

        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => this.copyAnswer());
        }

        if (this.elements.userQuery) {
            this.elements.userQuery.addEventListener('input', () => this.resetResultDisplay());
        }
    }

    async handleSubmit() {
        // Verify elements exist
        if (!this.verifyElements()) return;

        const query = this.elements.userQuery.value.trim();
        if (!query) {
            Utils.displayError('Veuillez saisir une question');
            return;
        }

        const selectedQueryType = this.getSelectedQueryType();

        Utils.showLoading(this.elements.loadingOverlay);
        this.hideResults();

        try {
            this.displayUserQuery(query);
            const prompt = PromptService.generatePrompt(query, selectedQueryType);
            const apiResponse = await GeminiAPIService.callAPI(prompt);
            
            if (apiResponse) {
                const { learningSteps, finalSentence } = ResultProcessor.processResults(apiResponse);
                
                ResultProcessor.renderLearningSteps(learningSteps, this.elements.explanationSteps);
                ResultProcessor.renderFinalSentence(finalSentence, this.elements.answerContent);
                
                this.showResults();
            }
        } catch (error) {
            console.error('Processing error:', error);
            Utils.displayError('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            Utils.hideLoading(this.elements.loadingOverlay);
        }
    }

    verifyElements() {
        const requiredElements = [
            'userQuery', 'loadingOverlay', 'resultContainer', 
            'explanationSteps', 'answerContent'
        ];

        const missingElements = requiredElements.filter(
            elem => !this.elements[elem]
        );

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            Utils.displayError('Application initialization error');
            return false;
        }

        return true;
    }

    getSelectedQueryType() {
        const checkedRadio = Array.from(this.elements.queryTypeRadios)
            .find(radio => radio.checked);
        return checkedRadio ? checkedRadio.value : 'grammar';
    }

    displayUserQuery(query) {
        this.elements.userQueryDisplay.textContent = Utils.sanitizeInput(query);
    }

    copyAnswer() {
        const textToCopy = this.elements.answerContent.innerText.trim();
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                this.elements.copyBtn.textContent = 'Copié!';
                setTimeout(() => {
                    this.elements.copyBtn.innerHTML = `
                        <i class="fas fa-copy"></i> Copier
                    `;
                }, 1500);
            })
            .catch(err => {
                console.error('Copy failed:', err);
                Utils.displayError('La copie a échoué.');
            });
    }

    showResults() {
        this.elements.resultContainer.classList.remove('hidden');
    }

    hideResults() {
        this.elements.resultContainer.classList.add('hidden');
    }

    resetResultDisplay() {
        if (this.elements.resultContainer && 
            !this.elements.resultContainer.classList.contains('hidden')) {
            this.hideResults();
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Hide loading overlay immediately when DOM is loaded
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        // Initialize the application
        new FrenchTutorApp();
    } catch (error) {
        console.error('Application initialization failed:', error);
        Utils.displayError('Failed to initialize the application');
    }
});

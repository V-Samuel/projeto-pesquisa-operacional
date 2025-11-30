const API_URL = 'http://127.0.0.1:8000/api/solve/';

export const solveProblem = async (problemData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(problemData),
        });
        const result = await response.json();
        if (response.ok) {
            return { success: true, ...result };
        } else {
            return { success: false, error: result.error || 'Ocorreu um problema.' };
        }
    } catch (error) {
        return { success: false, error: 'Erro: Conexão falhou.' };
    }
};

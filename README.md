# ORION - Solver de Pesquisa Operacional

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

Uma aplicação web **Full-Stack** completa e didática para resolução de problemas de Programação Linear (PL) e Inteira (PLI). O projeto vai além de uma calculadora simples, oferecendo visualizações avançadas como **gráficos animados**, **árvores de decisão interativas** e **tabelas passo a passo**.

## Funcionalidades

### Motor de Resolução (Solver)
* **Múltiplos Algoritmos:** Suporte completo para **Simplex Padrão**, **Big-M** e **Método das Duas Fases**.
* **Branch & Bound:** Algoritmo robusto para encontrar soluções inteiras ótimas utilizando estratégia *Best-First*.
* **Dualidade:** Transformação automática do problema Primal para Dual, com resolução e comparação de resultados.
* **Detecção Inteligente:** O sistema sugere automaticamente o melhor método com base nas restrições inseridas.
* **Diagnósticos:** Identificação automática de problemas com **Múltiplas Soluções**.

### Visualização e Interatividade
* **Gráfico Animado:** Visualize a reta da Função Objetivo ($Z$) deslocando-se pela região viável até encontrar o ponto ótimo (suporta *Replay*).
* **Árvore de Decisão:** Uma interface visual estilo organograma para o método Branch & Bound, permitindo inspecionar cada nó, poda e ramificação.
* **Passo a Passo:** Exibição detalhada de todos os quadros (Tableaus) do Simplex para fins educativos.
* **Comparação Primal x Dual:** Visualize lado a lado as variáveis de decisão e os preços sombra (shadow prices).

## Tecnologias Utilizadas

* **Back-end:** Python 3.10+ com Django & Django REST Framework.
* **Matemática:** NumPy para álgebra linear e cálculos matriciais.
* **Gráficos:** Matplotlib e Pillow (PIL) para geração de imagens e GIFs animados no servidor.
* **Front-end:** React.js (Single Page Application).
* **Estilização:** CSS moderno (Custom Properties, Flexbox/Grid).
* **Comunicação:** Fetch API para troca de JSON entre cliente e servidor.

## Instalação e Como Rodar

Siga os passos abaixo para rodar este projeto na sua máquina local:

### Pré-requisitos
* Python 3.x
* Node.js & NPM
* Git

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/V-Samuel/projeto-pesquisa-operacional.git]
    cd projeto-pesquisa-operacional
    ```

2.  **Configure o Back-end (Django):**
    Abra um terminal na pasta `django` (raiz do backend):
    ```bash
    # Crie o ambiente virtual
    python -m venv venv

    # Ative o ambiente
    # No Windows:
    .\venv\Scripts\activate
    # No Linux/Mac:
    # source venv/bin/activate

    # Instale as dependências
    pip install -r requirements.txt

    # Inicie o servidor
    python manage.py runserver
    ```
    *O backend estará rodando em `http://127.0.0.1:8000`*

3.  **Configure o Front-end (React):**
    Abra um **segundo terminal** na pasta `frontend`:
    ```bash
    # Instale as dependências do Node
    npm install

    # Inicie a aplicação React
    npm start
    ```

4.  **Acesse:**
    Abra seu navegador em `http://localhost:3000` para usar o ORION.

## Licença

Este projeto foi desenvolvido para fins acadêmicos e está sob a licença MIT. Sinta-se livre para usar, estudar e modificar.
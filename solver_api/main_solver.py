# solver_api/main_solver.py

import numpy as np
from itertools import combinations
import io
import base64
import matplotlib
matplotlib.use('Agg')  # Configura o Matplotlib para não usar uma UI gráfica
import matplotlib.pyplot as plt

class LPSolver:
    # ... (O __init__ e as outras funções de solve permanecem as mesmas) ...
    def __init__(self, objective_function, constraints, objective='max'):
        self.objective_function = np.array(objective_function, dtype=float)
        self.constraints = constraints
        self.objective = objective
        self.num_vars = len(objective_function)
        
        if self.objective == 'min':
            self.objective_function *= -1
            
    def solve(self, method='auto'):
        if method == 'auto':
            if self.num_vars == 2:
                return self._solve_graphical()
            needs_artificial_vars = any(c[1] in ['>=', '='] for c in self.constraints)
            if needs_artificial_vars:
                return self._solve_two_phase()
            else:
                return self._solve_simplex_standard()
        elif method == 'graphical':
            if self.num_vars != 2:
                return "Método inválido", {"error": "O método gráfico só pode ser usado em problemas com exatamente 2 variáveis."}
            return self._solve_graphical()
        elif method == 'simplex':
            if any(c[1] in ['>=', '='] for c in self.constraints):
                return "Método inválido", {"error": "O Simplex Padrão não pode ser usado com restrições '>=' ou '='. Use Duas Fases ou Big M."}
            return self._solve_simplex_standard()
        elif method == 'two_phase':
            return self._solve_two_phase()
        elif method == 'big_m':
            return self._solve_big_m()
        else:
            return "Método desconhecido", {"error": f"O método '{method}' não é reconhecido pelo solver."}

    def _generate_graph_image(self, feasible_points, best_point):
        """
        NOVA FUNÇÃO: Gera a imagem do gráfico da solução.
        """
        # Define os limites do gráfico
        max_val = max(max(p) for p in feasible_points) * 1.2 if feasible_points else 10
        x = np.linspace(0, max_val, 400)
        
        plt.figure(figsize=(6, 6))
        plt.xlim(0, max_val)
        plt.ylim(0, max_val)
        plt.xlabel("x1")
        plt.ylabel("x2")
        
        # Plota as linhas das restrições
        for coeffs, sign, rhs in self.constraints:
            c1, c2 = coeffs
            if c2 != 0:
                y = (rhs - c1 * x) / c2
                plt.plot(x, y, label=f'{c1}x1 + {c2}x2 {sign} {rhs}')
            elif c1 != 0:
                plt.axvline(x=rhs/c1, label=f'{c1}x1 {sign} {rhs}')

        # Pinta a região viável
        if feasible_points:
            feasible_points.sort(key=lambda p: np.arctan2(p[1] - np.mean([fp[1] for fp in feasible_points]), p[0] - np.mean([fp[0] for fp in feasible_points])))
            polygon = plt.Polygon(feasible_points, color='skyblue', alpha=0.5)
            plt.gca().add_patch(polygon)

        # Plota os pontos
        fp_array = np.array(feasible_points)
        if len(fp_array) > 0:
            plt.plot(fp_array[:, 0], fp_array[:, 1], 'ro', label='Vértices Viáveis')
        
        if best_point is not None:
            plt.plot(best_point[0], best_point[1], 'go', markersize=10, label='Solução Ótima')

        plt.grid(True)
        plt.legend()
        
        # Salva a imagem em memória
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        
        # Converte para Base64 e decodifica para string
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        plt.close() # Fecha a figura para liberar memória
        
        return image_base64

    def _solve_graphical(self):
        # ... (a lógica para encontrar os pontos permanece a mesma) ...
        equations = []
        for coeffs, _, rhs in self.constraints:
            equations.append(np.array(list(coeffs) + [rhs], dtype=float))
        equations.append(np.array([1, 0, 0], dtype=float))
        equations.append(np.array([0, 1, 0], dtype=float))
        intersections = []
        for eq1, eq2 in combinations(equations, 2):
            A = np.array([eq1[:2], eq2[:2]])
            b = np.array([eq1[2], eq2[2]])
            if np.linalg.det(A) != 0:
                try:
                    point = np.linalg.solve(A, b)
                    intersections.append(point)
                except np.linalg.LinAlgError: continue
        
        feasible_points = []
        for point in intersections:
            if all(point >= -1e-9):
                is_feasible = True
                for coeffs, sign, rhs in self.constraints:
                    val = np.dot(coeffs, point)
                    if sign == '<=' and val > rhs + 1e-9: is_feasible = False; break
                    if sign == '>=' and val < rhs - 1e-9: is_feasible = False; break
                    if sign == '=' and not np.isclose(val, rhs): is_feasible = False; break
                if is_feasible:
                    if not any(np.allclose(point, fp) for fp in feasible_points):
                        feasible_points.append(point)
        
        if not feasible_points:
            return "Nenhuma solução viável encontrada.", None
        
        best_point = None
        best_value = -np.inf
        for point in feasible_points:
            value = np.dot(self.objective_function, point)
            if value > best_value:
                best_value = value
                best_point = point
        
        if self.objective == 'min': best_value *= -1
        
        solution = {f'x{i+1}': v for i, v in enumerate(best_point)}
        solution['Z'] = best_value

        # ADIÇÃO: Gera a imagem e a adiciona na solução
        try:
            solution['graph_base64'] = self._generate_graph_image(feasible_points, best_point)
        except Exception as e:
            print(f"Erro ao gerar gráfico: {e}")
            solution['graph_base64'] = None

        return "Solução ótima encontrada.", solution

    # --- O RESTO DAS FUNÇÕES (_build_tableau, _simplex_iteration, etc.) CONTINUA AQUI ---
    # (Copie e cole o resto das suas funções a partir daqui para manter o arquivo completo)
    def _build_tableau(self, use_big_m=False, m_value=1e6):
        num_slack = sum(1 for c in self.constraints if c[1] == '<=')
        num_surplus = sum(1 for c in self.constraints if c[1] == '>=')
        num_artificial = sum(1 for c in self.constraints if c[1] in ['>=', '='])
        num_total_vars = self.num_vars + num_slack + num_surplus + num_artificial
        tableau = np.zeros((len(self.constraints) + 1, num_total_vars + 1))
        tableau[0, :self.num_vars] = -self.objective_function
        basis = [0] * len(self.constraints)
        s_idx, su_idx, a_idx = 0, 0, 0
        for i, (coeffs, sign, rhs) in enumerate(self.constraints):
            row = tableau[i + 1]
            row[:self.num_vars] = coeffs
            row[-1] = rhs
            if sign == '<=':
                row[self.num_vars + s_idx] = 1
                basis[i] = self.num_vars + s_idx
                s_idx += 1
            elif sign == '>=':
                row[self.num_vars + num_slack + su_idx] = -1
                su_idx += 1
                row[self.num_vars + num_slack + num_surplus + a_idx] = 1
                basis[i] = self.num_vars + num_slack + num_surplus + a_idx
                a_idx += 1
            elif sign == '=':
                row[self.num_vars + num_slack + num_surplus + a_idx] = 1
                basis[i] = self.num_vars + num_slack + num_surplus + a_idx
                a_idx += 1
        if use_big_m and num_artificial > 0:
            art_start_col = self.num_vars + num_slack + num_surplus
            tableau[0, art_start_col : art_start_col + num_artificial] = m_value
            for i in range(num_artificial):
                art_col = art_start_col + i
                art_row_idx = np.where(tableau[1:, art_col] == 1)[0][0] + 1
                tableau[0, :] -= m_value * tableau[art_row_idx, :]
        return tableau, basis
        
    def _simplex_iteration(self, tableau, basis):
        while np.any(tableau[0, :-1] < -1e-9):
            pivot_col = np.argmin(tableau[0, :-1])
            ratios = []
            for i in range(1, len(tableau)):
                if tableau[i, pivot_col] > 1e-9:
                    ratios.append((i, tableau[i, -1] / tableau[i, pivot_col]))
            if not ratios:
                return "Solução ilimitada.", tableau, basis
            pivot_row = min(ratios, key=lambda x: x[1])[0]
            pivot_element = tableau[pivot_row, pivot_col]
            tableau[pivot_row, :] /= pivot_element
            for i in range(len(tableau)):
                if i != pivot_row:
                    multiplier = tableau[i, pivot_col]
                    tableau[i, :] -= multiplier * tableau[pivot_row, :]
            basis[pivot_row - 1] = pivot_col
        return "Ótimo encontrado.", tableau, basis

    def _get_solution_from_tableau(self, tableau, basis):
        solution = {f'x{i+1}': 0 for i in range(self.num_vars)}
        for i, var_idx in enumerate(basis):
            if var_idx < self.num_vars:
                solution[f'x{var_idx+1}'] = tableau[i + 1, -1]
        z_value = tableau[0, -1]
        if self.objective == 'min':
            z_value *= -1
        solution['Z'] = z_value
        return solution

    def _solve_simplex_standard(self):
        tableau, basis = self._build_tableau()
        status, final_tableau, final_basis = self._simplex_iteration(tableau, basis)
        if status != "Ótimo encontrado.":
            return status, None
        return status, self._get_solution_from_tableau(final_tableau, final_basis)

    def _solve_two_phase(self):
        num_artificial = sum(1 for c in self.constraints if c[1] in ['>=', '='])
        if num_artificial == 0:
            return self._solve_simplex_standard()
        tableau, basis = self._build_tableau()
        original_objective = np.copy(tableau[0, :])
        art_start_col = tableau.shape[1] - 1 - num_artificial
        tableau[0, :] = 0
        tableau[0, art_start_col:-1] = -1
        for i in range(num_artificial):
            art_col = art_start_col + i
            art_row_idx = np.where(tableau[1:, art_col] == 1)[0][0] + 1
            tableau[0, :] += tableau[art_row_idx, :]
        status, phase1_tableau, phase1_basis = self._simplex_iteration(tableau, basis)
        if abs(phase1_tableau[0, -1]) > 1e-9:
            return "Problema inviável (Fase 1).", None
        final_tableau = phase1_tableau
        final_basis = phase1_basis
        final_tableau[0, :] = original_objective
        for i, var_idx in enumerate(final_basis):
            if final_tableau[0, var_idx] != 0:
                multiplier = final_tableau[0, var_idx]
                final_tableau[0, :] -= multiplier * final_tableau[i + 1, :]
        status, final_tableau, final_basis = self._simplex_iteration(final_tableau, final_basis)
        if status != "Ótimo encontrado.":
            return status, None
        return status, self._get_solution_from_tableau(final_tableau, final_basis)

    def _solve_big_m(self, m_value=1e6):
        tableau, basis = self._build_tableau(use_big_m=True, m_value=m_value)
        status, final_tableau, final_basis = self._simplex_iteration(tableau, basis)
        if status != "Ótimo encontrado.":
            return status, None
        num_slack = sum(1 for c in self.constraints if c[1] == '<=')
        num_surplus = sum(1 for c in self.constraints if c[1] == '>=')
        art_start_col = self.num_vars + num_slack + num_surplus
        for i, var_idx in enumerate(final_basis):
            if var_idx >= art_start_col and abs(final_tableau[i+1, -1]) > 1e-9:
                return "Problema inviável (Big M).", None
        return status, self._get_solution_from_tableau(final_tableau, final_basis)
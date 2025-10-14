# main_solver.py
import numpy as np
from itertools import combinations

class LPSolver:
    """
    Uma classe para resolver problemas de Programação Linear usando os métodos
    Gráfico, Simplex, Duas Fases e Big M.
    (Esta classe é a mesma de antes, sem alterações)
    """
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
                print("\n--- Resolvendo pelo Método Gráfico ---")
                return self._solve_graphical()
            needs_artificial_vars = any(c[1] in ['>=', '='] for c in self.constraints)
            if needs_artificial_vars:
                print("\n--- Resolvendo pelo Método das Duas Fases ---")
                return self._solve_two_phase()
            else:
                print("\n--- Resolvendo pelo Método Simplex Padrão ---")
                return self._solve_simplex_standard()
        # ... (o resto da classe LPSolver permanece igual à versão anterior) ...
    def _solve_graphical(self):
        equations = []
        for coeffs, _, rhs in self.constraints:
            equations.append(np.array(coeffs + [rhs], dtype=float))
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
                except np.linalg.LinAlgError:
                    continue
        feasible_points = []
        for point in intersections:
            if all(point >= -1e-9):
                is_feasible = True
                for coeffs, sign, rhs in self.constraints:
                    val = np.dot(coeffs, point)
                    if sign == '<=' and val > rhs + 1e-9:
                        is_feasible = False; break
                    if sign == '>=' and val < rhs - 1e-9:
                        is_feasible = False; break
                    if sign == '=' and not np.isclose(val, rhs):
                        is_feasible = False; break
                if is_feasible:
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
        if self.objective == 'min':
            best_value *= -1
        solution = {f'x{i+1}': v for i, v in enumerate(best_point)}
        solution['Z'] = best_value
        return "Solução ótima encontrada.", solution

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

# --- NOVA SEÇÃO DE USO INTERATIVO ---
# if __name__ == '__main__':
#     print("=====================================================")
#     print(" Bem-vindo ao Solver de Programação Linear Interativo")
#     print("=====================================================")

#     # 1. Obter o tipo de objetivo
#     while True:
#         objective_type = input("O objetivo é maximizar ou minimizar? (digite 'max' ou 'min'): ").lower()
#         if objective_type in ['max', 'min']:
#             break
#         print("Entrada inválida. Por favor, digite 'max' ou 'min'.")

#     # 2. Obter o número de variáveis
#     while True:
#         try:
#             num_vars = int(input("Quantas variáveis de decisão o problema tem? "))
#             if num_vars > 0:
#                 break
#             print("O número de variáveis deve ser um inteiro positivo.")
#         except ValueError:
#             print("Entrada inválida. Por favor, digite um número inteiro.")

#     # 3. Obter os coeficientes da função objetivo
#     print("\n--- Função Objetivo (Z) ---")
#     obj_func = []
#     for i in range(num_vars):
#         while True:
#             try:
#                 coeff = float(input(f"Digite o coeficiente de x{i+1}: "))
#                 obj_func.append(coeff)
#                 break
#             except ValueError:
#                 print("Entrada inválida. Por favor, digite um número.")

#     # 4. Obter o número de restrições
#     while True:
#         try:
#             num_constraints = int(input("\nQuantas restrições o problema tem? "))
#             if num_constraints > 0:
#                 break
#             print("O número de restrições deve ser um inteiro positivo.")
#         except ValueError:
#             print("Entrada inválida. Por favor, digite um número inteiro.")

#     # 5. Obter cada restrição
#     constraints = []
#     for i in range(num_constraints):
#         print(f"\n--- Restrição {i+1} ---")
#         constraint_coeffs = []
#         for j in range(num_vars):
#             while True:
#                 try:
#                     coeff = float(input(f"Digite o coeficiente de x{j+1} para a restrição {i+1}: "))
#                     constraint_coeffs.append(coeff)
#                     break
#                 except ValueError:
#                     print("Entrada inválida. Por favor, digite um número.")
        
#         while True:
#             sign = input(f"Digite o sinal da restrição {i+1} ('<=', '>=', ou '='): ")
#             if sign in ['<=', '>=', '=']:
#                 break
#             print("Sinal inválido. Por favor, use '<=', '>=', ou '='.")

#         while True:
#             try:
#                 rhs = float(input(f"Digite o valor do lado direito (RHS) da restrição {i+1}: "))
#                 break
#             except ValueError:
#                 print("Entrada inválida. Por favor, digite um número.")
        
#         constraints.append((constraint_coeffs, sign, rhs))

#     # 6. Criar a instância e resolver o problema
#     try:
#         solver = LPSolver(objective_function=obj_func, constraints=constraints, objective=objective_type)
#         status_msg, solution = solver.solve()

#         # 7. Exibir o resultado
#         print("\n================== RESULTADO ==================")
#         print(f"Status: {status_msg}")
#         if solution:
#             print("Solução Ótima Encontrada:")
#             for var, val in solution.items():
#                 # Formata a saída para 4 casas decimais para melhor leitura
#                 print(f"  {var}: {val:.4f}")
#         print("=============================================")

#     except Exception as e:
#         print(f"\nOcorreu um erro inesperado durante a resolução: {e}")
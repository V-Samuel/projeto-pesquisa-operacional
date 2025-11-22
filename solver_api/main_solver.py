import numpy as np
from itertools import combinations
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fractions import Fraction
import copy
import math
from PIL import Image as PILImage

class LPSolver:
    def __init__(self, objective_function, constraints, objective='max'):
        self.objective_function = np.array(objective_function, dtype=float)
        self.constraints = constraints
        self.objective = objective
        self.num_vars = len(objective_function)
        if self.objective == 'min':
            self.objective_function *= -1

    def solve(self, method='auto', integer_mode=False):
        result = None
        if method == 'auto':
            if self.num_vars == 2: result = self._solve_graphical()
            elif any(c[1] in ['>=', '='] for c in self.constraints): result = self._solve_two_phase()
            else: result = self._solve_simplex_standard()
        elif method == 'graphical':
            if self.num_vars != 2: return "Método inválido", {"error": "Gráfico apenas para 2 variáveis."}
            result = self._solve_graphical()
        elif method == 'simplex':
            if any(c[1] in ['>=', '='] for c in self.constraints): return "Método inválido", {"error": "Simplex Padrão não aceita '>=' ou '='."}
            result = self._solve_simplex_standard()
        elif method == 'two_phase': result = self._solve_two_phase()
        elif method == 'big_m': result = self._solve_big_m()
        else: return "Método desconhecido", {"error": f"Método '{method}' não reconhecido."}
        
        if isinstance(result, tuple) and "error" in result[1]: return result
        status, solution = result
        
        if 'tableau' in solution and 'basis' in solution:
            z_row = solution['tableau'][0, :-1]
            has_multiple = False
            for i in range(len(z_row)):
                if abs(z_row[i]) < 1e-5 and i not in solution['basis']: has_multiple = True; break
            if has_multiple: solution['status_complement'] = "Soluções Múltiplas Identificadas"

        if integer_mode and solution and 'x1' in solution:
            try:
                _, int_sol, int_point = self._solve_branch_and_bound()
                if int_sol:
                    solution['integer_solution'] = int_sol
                    if self.num_vars == 2:
                         eqs = []; inters = []
                         for c, s, r in self.constraints: eqs.append(np.array(list(c)+[r], float))
                         eqs+= [np.array([1,0,0], float), np.array([0,1,0], float)]
                         for e1, e2 in combinations(eqs, 2):
                             try: 
                                 A=np.array([e1[:2],e2[:2]]); b=np.array([e1[2],e2[2]])
                                 if abs(np.linalg.det(A))>1e-9: inters.append(np.linalg.solve(A,b))
                             except: continue
                         fps = [p for p in inters if all(np.dot(c,p)<=(r+1e-5) if s=='<=' else (np.dot(c,p)>=(r-1e-5) if s=='>=' else abs(np.dot(c,p)-r)<1e-5) for c,s,r in self.constraints) and all(p>=-1e-5)]
                         fps = [p for i, p in enumerate(fps) if not any(np.allclose(p, x, atol=1e-4) for x in fps[:i])]
                         best_r = None; best_v = -np.inf
                         for p in fps:
                             v = np.dot(self.objective_function, p)
                             if v > best_v: best_v = v; best_r = p
                         solution['graph_base64'] = self._generate_graph_image(fps, best_r, int_point)
            except: pass

        if 'tableau' in solution: del solution['tableau']
        if 'basis' in solution: del solution['basis']
        return status, solution

    def _solve_branch_and_bound(self):
        best_int_solution = None; best_int_z = -np.inf; best_int_point = None
        queue = [copy.deepcopy(self.constraints)]; iterations = 0; MAX_ITERATIONS = 100 
        while queue and iterations < MAX_ITERATIONS:
            current_constraints = queue.pop(0); iterations += 1
            sub_solver = LPSolver(self.objective_function if self.objective == 'max' else -self.objective_function, current_constraints, self.objective)
            status, sub_sol = sub_solver._solve_two_phase()
            if not sub_sol or 'error' in sub_sol: continue
            try:
                z_str = sub_sol['Z']; 
                if '/' in z_str: num, den = map(int, z_str.split('/')); current_z = num/den
                else: current_z = float(z_str)
            except: continue
            if current_z <= best_int_z + 1e-6: continue
            all_integer = True; branch_idx = -1; branch_val = 0; point = []
            for i in range(self.num_vars):
                val_str = sub_sol.get(f'x{i+1}', '0')
                if '/' in val_str: num, den = map(int, val_str.split('/')); val = num/den
                else: val = float(val_str)
                point.append(val)
                if abs(val - round(val)) > 1e-4: all_integer = False; branch_idx = i; branch_val = val; break
            if all_integer:
                if current_z > best_int_z: best_int_z = current_z; best_int_solution = sub_sol; best_int_point = point
            else:
                floor_val = math.floor(branch_val); ceil_val = math.ceil(branch_val)
                new_coeffs = [0.0] * self.num_vars; new_coeffs[branch_idx] = 1.0
                b1 = copy.deepcopy(current_constraints); b1.append((new_coeffs, '<=', float(floor_val))); queue.append(b1)
                b2 = copy.deepcopy(current_constraints); b2.append((new_coeffs, '>=', float(ceil_val))); queue.append(b2)
        return "Concluído", best_int_solution, best_int_point

    def _to_fraction_str(self, value):
        try:
            if abs(value) < 1e-9: return "0"
            frac = Fraction(value).limit_denominator(10000)
            if frac.denominator == 1: return str(frac.numerator)
            return f"{frac.numerator}/{frac.denominator}"
        except: return str(round(value, 4))

    # --- GERAÇÃO DE GRÁFICO ANIMADO ---
    def _generate_graph_image(self, feasible_points, best_point, int_point=None):
        all_points = feasible_points + ([tuple(best_point)] if best_point is not None else [])
        if not all_points: return None
        max_x = max(p[0] for p in all_points) * 1.2 if all_points else 10
        max_y = max(p[1] for p in all_points) * 1.2 if all_points else 10
        limit = max(max_x, max_y, 10)
        x_vals = np.linspace(0, limit, 400)
        c1_obj, c2_obj = self.objective_function
        z_opt = np.dot(self.objective_function, best_point) if best_point is not None else 0
        
        frames = []
        num_frames = 10
        try:
            for i in range(num_frames + 2): 
                fig, ax = plt.subplots(figsize=(6, 6))
                ax.set_xlim(-0.5, limit); ax.set_ylim(-0.5, limit); ax.set_xlabel("x1"); ax.set_ylabel("x2")
                for coeffs, sign, rhs in self.constraints:
                    c1, c2 = coeffs
                    if c2 != 0:
                        y_vals = (rhs - c1 * x_vals) / c2; y_vals = np.clip(y_vals, -limit, limit*2)
                        ax.plot(x_vals, y_vals, label=f'{c1}x1 + {c2}x2 {sign} {rhs}')
                    elif c1 != 0:
                        ax.axvline(x=rhs/c1, color='orange', linestyle='--', label=f'{c1}x1 {sign} {rhs}')
                if len(feasible_points) >= 3:
                    points_array = np.array(feasible_points); centroid = points_array.mean(axis=0)
                    feasible_points.sort(key=lambda p: np.arctan2(p[1] - centroid[1], p[0] - centroid[0]))
                    ax.add_patch(plt.Polygon(feasible_points, color='skyblue', alpha=0.4))
                fp_array = np.array(feasible_points)
                if len(fp_array) > 0: ax.plot(fp_array[:, 0], fp_array[:, 1], 'ro', markersize=5)
                if best_point is not None: ax.plot(best_point[0], best_point[1], 'go', markersize=10, zorder=5, label='Ótimo')
                if int_point is not None: ax.plot(int_point[0], int_point[1], 'o', color='darkorange', markersize=10, zorder=6, label='Inteiro')
                
                ax.grid(True, which='both', linestyle='--', alpha=0.7)
                
                # CORREÇÃO: Legenda em TODOS os frames para não sumir
                ax.legend(loc='best', fontsize='x-small')

                progress = min(i / num_frames, 1.0); z_curr = z_opt * progress
                if c2_obj != 0: y_obj = (z_curr - c1_obj * x_vals) / c2_obj; y_obj = np.clip(y_obj, -limit, limit*2); ax.plot(x_vals, y_obj, 'k--', linewidth=2, label='Z')
                elif c1_obj != 0: ax.axvline(x=z_curr/c1_obj, color='k', linestyle='--', linewidth=2)
                
                buf_frame = io.BytesIO(); plt.savefig(buf_frame, format='png', bbox_inches='tight'); buf_frame.seek(0)
                frames.append(PILImage.open(buf_frame)); plt.close(fig)
            
            buf_gif = io.BytesIO()
            # Sem loop=1, a maioria dos navegadores toca 1 vez.
            frames[0].save(buf_gif, format='GIF', save_all=True, append_images=frames[1:], duration=150)
            buf_gif.seek(0); img_b64 = base64.b64encode(buf_gif.read()).decode('utf-8')
            return img_b64
        except Exception as e: return None

    def _solve_graphical(self):
        equations = []
        for coeffs, _, rhs in self.constraints: equations.append(np.array(list(coeffs) + [rhs], dtype=float))
        equations.append(np.array([1, 0, 0], dtype=float)); equations.append(np.array([0, 1, 0], dtype=float)) 
        intersections = []
        for eq1, eq2 in combinations(equations, 2):
            try: A = np.array([eq1[:2], eq2[:2]]); b = np.array([eq1[2], eq2[2]]); point = np.linalg.solve(A, b); intersections.append(point)
            except: continue
        feasible_points = []
        for point in intersections:
            if all(point >= -1e-5):
                is_feasible = True
                for coeffs, sign, rhs in self.constraints:
                    val = np.dot(coeffs, point)
                    if sign == '<=' and val > rhs + 1e-5: is_feasible = False; break
                    if sign == '>=' and val < rhs - 1e-5: is_feasible = False; break
                    if sign == '=' and abs(val - rhs) > 1e-5: is_feasible = False; break
                if is_feasible:
                    if not any(np.allclose(point, fp, atol=1e-4) for fp in feasible_points): feasible_points.append(point)
        if not feasible_points: return "Inviável", {"error": "Região vazia."}
        best_point = None; best_value = -np.inf
        for point in feasible_points:
            value = np.dot(self.objective_function, point)
            if value > best_value: best_value = value; best_point = point
        if self.objective == 'min': best_value *= -1
        solution = {f'x{i+1}': self._to_fraction_str(v) for i, v in enumerate(best_point)}
        solution['Z'] = self._to_fraction_str(best_value)
        try: solution['graph_base64'] = self._generate_graph_image(feasible_points, best_point)
        except: solution['graph_base64'] = None
        return "Solução ótima encontrada.", solution

    def _format_tableau_step(self, tableau, basis, iteration, phase_name=""):
        headers = [f"V{i+1}" for i in range(tableau.shape[1]-1)] + ["RHS"]
        rows = []
        for i in range(len(tableau)):
            lbl = "Z" if i == 0 else f"Base {basis[i-1]+1}"
            row_data = [self._to_fraction_str(x) for x in tableau[i]]
            rows.append({'label': lbl, 'values': row_data})
        return {'iteration': iteration, 'phase': phase_name, 'headers': headers, 'rows': rows, 'pivot_info': None}

    def _solve_simplex_standard(self):
        tableau, basis = self._build_tableau()
        status, final_tableau, final_basis, history = self._simplex_iteration(tableau, basis, "Simplex")
        solution = self._get_solution_from_tableau(final_tableau, final_basis)
        solution['iterations'] = history
        if status != "Ótimo encontrado.": solution['error'] = status
        return status, solution

    def _solve_two_phase(self):
        num_art = sum(1 for c in self.constraints if c[1] in ['>=', '='])
        if num_art == 0: return self._solve_simplex_standard()
        tableau, basis = self._build_tableau()
        original_obj = np.copy(tableau[0, :])
        art_start = tableau.shape[1] - 1 - num_art
        tableau[0, :] = 0; tableau[0, art_start:-1] = -1
        for i in range(num_art):
            c = art_start + i; r = np.where(tableau[1:, c] == 1)[0][0] + 1
            tableau[0, :] += tableau[r, :]
        s, t1, b1, h1 = self._simplex_iteration(tableau, basis, "Fase 1")
        if abs(t1[0, -1]) > 1e-5: return "Inviável", {'error': "Inviável na Fase 1", 'iterations': h1}
        t1[0, :] = original_obj
        for i, v in enumerate(b1):
            if t1[0, v] != 0: t1[0, :] -= t1[0, v] * t1[i+1, :]
        s, t2, b2, h2 = self._simplex_iteration(t1, b1, "Fase 2")
        for st in h2: st['iteration'] += len(h1)
        sol = self._get_solution_from_tableau(t2, b2)
        sol['iterations'] = h1 + h2
        return s, sol

    def _solve_big_m(self, m_value=1e6):
        tableau, basis = self._build_tableau(use_big_m=True, m_value=m_value)
        status, final_tableau, final_basis, history = self._simplex_iteration(tableau, basis, "Big M")
        solution = self._get_solution_from_tableau(final_tableau, final_basis)
        solution['iterations'] = history
        return status, solution

    def _simplex_iteration(self, tableau, basis, phase_name=""):
        history = []; count = 0
        history.append(self._format_tableau_step(tableau, basis, count, phase_name))
        while np.any(tableau[0, :-1] < -1e-9):
            p_col = np.argmin(tableau[0, :-1])
            ratios = []
            for i in range(1, len(tableau)):
                if tableau[i, p_col] > 1e-9: ratios.append((i, tableau[i, -1]/tableau[i, p_col]))
            if not ratios: return "Ilimitada", tableau, basis, history
            p_row = min(ratios, key=lambda x: x[1])[0]
            history[-1]['pivot_info'] = {'row': p_row, 'col': p_col}
            tableau[p_row, :] /= tableau[p_row, p_col]
            for i in range(len(tableau)):
                if i != p_row: tableau[i, :] -= tableau[i, p_col] * tableau[p_row, :]
            basis[p_row - 1] = p_col; count += 1
            history.append(self._format_tableau_step(tableau, basis, count, phase_name))
            if count > 100: return "Ciclo/Limite", tableau, basis, history
        return "Ótimo encontrado.", tableau, basis, history

    def _build_tableau(self, use_big_m=False, m_value=1e6):
        num_slack = sum(1 for c in self.constraints if c[1] == '<=')
        num_surplus = sum(1 for c in self.constraints if c[1] == '>=')
        num_art = sum(1 for c in self.constraints if c[1] in ['>=', '='])
        total = self.num_vars + num_slack + num_surplus + num_art
        tableau = np.zeros((len(self.constraints) + 1, total + 1))
        tableau[0, :self.num_vars] = -self.objective_function
        basis = [0] * len(self.constraints)
        s_i, su_i, a_i = 0, 0, 0
        for i, (coeffs, sign, rhs) in enumerate(self.constraints):
            row = tableau[i+1]; row[:self.num_vars] = coeffs; row[-1] = rhs
            if sign == '<=':
                row[self.num_vars + s_i] = 1; basis[i] = self.num_vars + s_i; s_i+=1
            elif sign == '>=':
                row[self.num_vars + num_slack + su_i] = -1
                row[self.num_vars + num_slack + num_surplus + a_i] = 1
                basis[i] = self.num_vars + num_slack + num_surplus + a_i; su_i+=1; a_i+=1
            elif sign == '=':
                row[self.num_vars + num_slack + num_surplus + a_i] = 1
                basis[i] = self.num_vars + num_slack + num_surplus + a_i; a_i+=1
        if use_big_m and num_art > 0:
            astart = self.num_vars + num_slack + num_surplus
            tableau[0, astart : astart + num_art] = m_value
            for i in range(num_art):
                c = astart + i; r = np.where(tableau[1:, c] == 1)[0][0] + 1
                tableau[0, :] -= m_value * tableau[r, :]
        return tableau, basis

    def _get_solution_from_tableau(self, tableau, basis):
        sol = {f'x{i+1}': "0" for i in range(self.num_vars)}
        for i, v in enumerate(basis):
            if v < self.num_vars: sol[f'x{v+1}'] = self._to_fraction_str(tableau[i+1, -1])
        z = tableau[0, -1] * (-1 if self.objective == 'min' else 1)
        sol['Z'] = self._to_fraction_str(z)
        num_cons = len(self.constraints); dual_sol = {}
        for i in range(num_cons):
            col = self.num_vars + i
            if col < tableau.shape[1] - 1:
                val = tableau[0, col]
                if self.objective == 'min': val *= -1
                dual_sol[f'y{i+1}'] = self._to_fraction_str(val)
        sol['dual_solution'] = dual_sol
        sol['tableau'] = tableau; sol['basis'] = basis
        return sol
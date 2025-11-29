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
        
        self.is_minimization = (self.objective == 'min')
        if self.objective == 'min':
            self.objective_function *= -1
            
        # Controle global para poda
        self.global_best_z = -np.inf

    def solve(self, method='auto', integer_mode=False):
        result = None
        
        # --- 1. MODO BRANCH AND BOUND (MÉTODO PRINCIPAL) ---
        if method == 'branch_and_bound':
            self.global_best_z = -np.inf
            
            # 1. Constrói a Árvore
            tree_data, best_int_sol = self._build_bnb_tree(self.constraints, "P0", 1)
            
            status = "Árvore Gerada"
            solution = {
                'tree_data': tree_data,
                'integer_solution': best_int_sol,
                'Z': best_int_sol['Z'] if best_int_sol else "Não encontrado"
            }
            
            # 2. Gera o Gráfico com o Ponto Inteiro (Se for 2D)
            if self.num_vars == 2:
                try:
                    # Recalcula região viável do problema original (Raiz)
                    eqs = []; inters = []
                    for c, s, r in self.constraints: eqs.append(np.array(list(c)+[r], float))
                    eqs+= [np.array([1,0,0], float), np.array([0,1,0], float)]
                    for e1, e2 in combinations(eqs, 2):
                        try: A=np.array([e1[:2],e2[:2]]); b=np.array([e1[2],e2[2]]); inters.append(np.linalg.solve(A,b))
                        except: continue
                    fps = [p for p in inters if all(np.dot(c,p)<=(r+1e-5) if s=='<=' else (np.dot(c,p)>=(r-1e-5) if s=='>=' else abs(np.dot(c,p)-r)<1e-5) for c,s,r in self.constraints) and all(p>=-1e-5)]
                    
                    # Filtra duplicatas
                    unique_fps = []
                    for p in fps:
                        if not any(np.allclose(p, x, atol=1e-4) for x in unique_fps): unique_fps.append(p)
                    
                    # Encontra ótimo relaxado (Raiz)
                    best_relaxed = None; best_val = -np.inf
                    for p in unique_fps:
                        v = np.dot(self.objective_function, p)
                        if v > best_val: best_val = v; best_relaxed = p
                    
                    # Prepara o ponto inteiro para plotagem
                    int_point = None
                    if best_int_sol:
                         int_point = [float(Fraction(best_int_sol.get(f'x{i+1}', '0'))) for i in range(self.num_vars)]

                    # Gera o gráfico
                    solution['graph_base64'] = self._generate_graph_image(unique_fps, best_relaxed, int_point)
                except Exception as e: 
                    print(f"Erro no gráfico B&B: {e}")
            
            return status, solution

        # --- 2. MODO DUAL ---
        if method == 'dual':
            return self._solve_as_dual_problem()

        # --- 3. MÉTODOS PADRÃO ---
        if method == 'auto':
            if self.num_vars == 2: result = self._solve_graphical()
            elif any(c[1] in ['>=', '='] for c in self.constraints): result = self._solve_two_phase()
            else: result = self._solve_simplex_standard()
        elif method == 'graphical':
            if self.num_vars != 2: return "Método inválido", {"error": "Gráfico apenas para 2 variáveis."}
            result = self._solve_graphical()
        elif method == 'simplex':
            if any(c[1] in ['>=', '='] for c in self.constraints): return "Método inválido", {"error": "Use Big M para restrições >=."}
            result = self._solve_simplex_standard()
        elif method == 'two_phase': result = self._solve_two_phase()
        elif method == 'big_m': result = self._solve_big_m()
        else: return "Erro", {"error": f"Método '{method}' desconhecido."}
        
        if isinstance(result, tuple) and "error" in result[1]: return result
        status, solution = result
        
        # Pós-processamento
        if 'tableau' in solution and 'basis' in solution:
            z_row = solution['tableau'][0, :-1]
            has_multiple = False
            for i in range(len(z_row)):
                if abs(z_row[i]) < 1e-5 and i not in solution['basis']: has_multiple = True; break
            if has_multiple: solution['status_complement'] = "Soluções Múltiplas Identificadas"

        # Limpeza
        if 'tableau' in solution: del solution['tableau']
        if 'basis' in solution: del solution['basis']

        return status, solution

    # --- ÁRVORE B&B RECURSIVA (ESTRATÉGIA: MOST FRACTIONAL) ---
    def _build_bnb_tree(self, constraints, node_id, depth):
        # 1. Resolve o nó
        solver = LPSolver(
            self.objective_function if self.objective == 'max' else -self.objective_function,
            constraints,
            self.objective
        )
        status, solution = solver._solve_big_m()

        node = {
            'id': node_id,
            'solution': solution,
            'children': [],
            'status': 'processing', 
            'branch_info': ''
        }

        # 2. Inviável?
        if not solution or 'error' in solution or 'Z' not in solution:
            node['status'] = 'infeasible'
            return node, None

        # Pega Z
        try:
            zs = solution['Z']
            current_z = float(Fraction(zs)) if '/' in zs else float(zs)
        except: current_z = -np.inf

        # 3. Poda por Limite (Bound)
        if current_z <= self.global_best_z + 1e-6:
            node['status'] = 'pruned'
            return node, None

        # 4. Escolhe Variável de Ramificação (Mais Fracionada)
        all_integer = True
        branch_idx = -1
        branch_val = 0
        max_fraction = -1 # Distância máxima para o inteiro mais próximo (perto de 0.5)
        
        for i in range(self.num_vars):
            val_str = solution.get(f'x{i+1}', '0')
            val = float(Fraction(val_str)) if '/' in val_str else float(val_str)
            
            dist = abs(val - round(val))
            if dist > 1e-4:
                all_integer = False
                # Estratégia Otimizada: Escolhe a mais fracionada
                if dist > max_fraction:
                    max_fraction = dist
                    branch_idx = i
                    branch_val = val
        
        best_local_sol = None

        if all_integer:
            node['status'] = 'integer'
            if current_z > self.global_best_z:
                self.global_best_z = current_z
                best_local_sol = solution
        else:
            node['status'] = 'branched'
            fl = math.floor(branch_val)
            cl = math.ceil(branch_val)
            nc = [0.0] * self.num_vars
            nc[branch_idx] = 1.0

            if depth < 10: # Limite de profundidade
                # Filho 1 (<=)
                c1 = copy.deepcopy(constraints)
                c1.append((nc, '<=', float(fl)))
                child1, sol1 = self._build_bnb_tree(c1, f"{node_id}.1", depth+1)
                child1['branch_info'] = f"x{branch_idx+1} <= {fl}"
                node['children'].append(child1)

                # Filho 2 (>=)
                c2 = copy.deepcopy(constraints)
                c2.append((nc, '>=', float(cl)))
                child2, sol2 = self._build_bnb_tree(c2, f"{node_id}.2", depth+1)
                child2['branch_info'] = f"x{branch_idx+1} >= {cl}"
                node['children'].append(child2)

                # Propaga melhor solução encontrada nos filhos
                def get_z(s):
                    if not s: return -np.inf
                    z = s['Z']
                    return float(Fraction(z)) if '/' in z else float(z)
                
                z1 = get_z(sol1)
                z2 = get_z(sol2)
                best_local_sol = sol1 if z1 > z2 else sol2

        return node, best_local_sol

    # --- OUTROS MÉTODOS (DUAL, GRAFICO, ETC) ---
    def _solve_as_dual_problem(self):
        try:
            A = np.array([c[0] for c in self.constraints]); A_T = A.T.tolist()
            c_p = self.objective_function if not self.is_minimization else -self.objective_function; new_rhs = c_p.tolist()
            b_p = [c[2] for c in self.constraints]; new_obj = b_p; new_cons = []
            for i, rc in enumerate(A_T): new_cons.append((rc, '>=', new_rhs[i]))
            ds = LPSolver(new_obj, new_cons, objective='min')
            st, sol = ds.solve(method='big_m')
            if 'iterations' in sol: 
                for s in sol['iterations']: s['phase'] = f"Dual (Big M) - {s['phase']}"
            return f"Solução do Dual ({st})", sol
        except Exception as e: return "Erro", {"error": str(e)}

    def _to_fraction_str(self, value):
        try:
            if abs(value) < 1e-9: return "0"
            frac = Fraction(value).limit_denominator(10000)
            if frac.denominator == 1: return str(frac.numerator)
            return f"{frac.numerator}/{frac.denominator}"
        except: return str(round(value, 4))

    def _generate_graph_image(self, feasible_points, best_point, int_point=None):
        all_points = feasible_points + ([tuple(best_point)] if best_point is not None else [])
        if not all_points: return None
        max_x = max(p[0] for p in all_points) * 1.2 if all_points else 10
        max_y = max(p[1] for p in all_points) * 1.2 if all_points else 10
        limit = max(max_x, max_y, 10)
        x_vals = np.linspace(0, limit, 200) 
        c1_obj, c2_obj = self.objective_function
        z_opt = np.dot(self.objective_function, best_point) if best_point is not None else 0
        frames = []; num_frames = 12 
        try:
            plt.close('all')
            for i in range(num_frames + 5): 
                fig, ax = plt.subplots(figsize=(5, 5))
                ax.set_xlim(-0.5, limit); ax.set_ylim(-0.5, limit); ax.set_xlabel("x1"); ax.set_ylabel("x2")
                for coeffs, sign, rhs in self.constraints:
                    c1, c2 = coeffs
                    if c2 != 0:
                        y_vals = (rhs - c1 * x_vals) / c2
                        y_vals = np.clip(y_vals, -limit, limit*2)
                        ax.plot(x_vals, y_vals, label=f'{c1}x1 + {c2}x2 {sign} {rhs}')
                    elif c1 != 0: ax.axvline(x=rhs/c1, color='orange', linestyle='--')

                if len(feasible_points) >= 3:
                    pts = np.array(feasible_points); cent = pts.mean(axis=0)
                    feasible_points.sort(key=lambda p: np.arctan2(p[1] - cent[1], p[0] - cent[0]))
                    ax.add_patch(plt.Polygon(feasible_points, color='skyblue', alpha=0.4))

                if len(feasible_points) > 0: 
                    fp = np.array(feasible_points); ax.plot(fp[:, 0], fp[:, 1], 'ro', markersize=5)
                if best_point is not None: ax.plot(best_point[0], best_point[1], 'go', markersize=8, zorder=5, label='Ótimo')
                if int_point is not None: ax.plot(int_point[0], int_point[1], 'o', color='darkorange', markersize=8, zorder=6, label='Inteiro')

                ax.grid(True, linestyle='--', alpha=0.5)
                ax.legend(loc='best', fontsize='x-small', framealpha=0.6)

                progress = min(i / num_frames, 1.0); z_curr = z_opt * progress
                if c2_obj != 0:
                    y_obj = (z_curr - c1_obj * x_vals) / c2_obj; y_obj = np.clip(y_obj, -limit, limit*2)
                    ax.plot(x_vals, y_obj, 'k--', linewidth=1.5, label='Z')
                elif c1_obj != 0: ax.axvline(x=z_curr/c1_obj, color='k', linestyle='--', linewidth=1.5)

                buf = io.BytesIO(); plt.savefig(buf, format='png', bbox_inches='tight', dpi=80)
                buf.seek(0); frames.append(PILImage.open(buf)); plt.close(fig)

            buf_gif = io.BytesIO()
            frames[0].save(buf_gif, format='GIF', save_all=True, append_images=frames[1:], duration=100)
            buf_gif.seek(0); return base64.b64encode(buf_gif.read()).decode('utf-8')
        except: return None

    def _solve_graphical(self):
        eqs=[]; 
        for c,_,r in self.constraints: eqs.append(np.array(list(c)+[r], float))
        eqs+=[np.array([1,0,0],float), np.array([0,1,0],float)]
        inters=[]
        for e1,e2 in combinations(eqs,2):
            try: A=np.array([e1[:2],e2[:2]]); b=np.array([e1[2],e2[2]]); inters.append(np.linalg.solve(A,b))
            except: continue
        fps=[p for p in inters if all(p>=-1e-5) and all(np.dot(c,p)<=(r+1e-5) if s=='<=' else (np.dot(c,p)>=(r-1e-5) if s=='>=' else abs(np.dot(c,p)-r)<1e-5) for c,s,r in self.constraints)]
        fps=[p for i,p in enumerate(fps) if not any(np.allclose(p,x,atol=1e-4) for x in fps[:i])]
        if not fps: return "Inviável", {"error": "Região vazia"}
        br=None; bv=-np.inf
        for p in fps:
            v=np.dot(self.objective_function,p); 
            if v>bv: bv=v; br=p
        if self.objective=='min': bv*=-1
        sol={f'x{i+1}':self._to_fraction_str(v) for i,v in enumerate(br)}; sol['Z']=self._to_fraction_str(bv)
        try: sol['graph_base64']=self._generate_graph_image(fps,br)
        except: pass
        return "Ótimo", sol

    def _format_tableau_step(self, t, b, i, p):
        h=[f"V{x+1}" for x in range(t.shape[1]-1)]+["RHS"]; r=[]
        for j in range(len(t)): r.append({'label':"Z" if j==0 else f"Base {b[j-1]+1}", 'values':[self._to_fraction_str(v) for v in t[j]]})
        return {'iteration':i, 'phase':p, 'headers':h, 'rows':r, 'pivot_info':None}
    def _solve_simplex_standard(self):
        t,b=self._build_tableau(); s,ft,fb,h=self._simplex_iteration(t,b,"Simplex"); sol=self._get_solution_from_tableau(ft,fb); sol['iterations']=h; 
        if s!="Ótimo encontrado.": sol['error']=s
        return s, sol
    def _solve_two_phase(self):
        t,b=self._build_tableau(); s,t,b,h=self._simplex_iteration(t,b,"Simplex"); sol=self._get_solution_from_tableau(t,b); sol['iterations']=h; return s, sol
    def _solve_big_m(self, m=1e6):
        t,b=self._build_tableau(True,m); s,ft,fb,h=self._simplex_iteration(t,b,"Big M"); sol=self._get_solution_from_tableau(ft,fb); sol['iterations']=h; return s, sol
    def _simplex_iteration(self, t, b, p):
        h=[]; c=0; h.append(self._format_tableau_step(t,b,c,p))
        while np.any(t[0,:-1]<-1e-9):
            pc=np.argmin(t[0,:-1]); rs=[]
            for i in range(1,len(t)): 
                if t[i,pc]>1e-9: rs.append((i, t[i,-1]/t[i,pc]))
            if not rs: return "Ilimitada",t,b,h
            pr=min(rs, key=lambda x:x[1])[0]
            h[-1]['pivot_info']={'row':pr,'col':pc}
            t[pr,:]/=t[pr,pc]
            for i in range(len(t)): 
                if i!=pr: t[i,:]-=t[i,pc]*t[pr,:]
            b[pr-1]=pc; c+=1; h.append(self._format_tableau_step(t,b,c,p))
            if c>100: return "Ciclo",t,b,h
        return "Ótimo encontrado.",t,b,h
    def _build_tableau(self, bm=False, m=1e6):
        ns=sum(1 for c in self.constraints if c[1]=='<='); nsur=sum(1 for c in self.constraints if c[1]=='>='); na=sum(1 for c in self.constraints if c[1] in ['>=','='])
        t=np.zeros((len(self.constraints)+1, self.num_vars+ns+nsur+na+1)); t[0,:self.num_vars]=-self.objective_function; b=[0]*len(self.constraints)
        si,sui,ai=0,0,0
        for i,(c,s,r) in enumerate(self.constraints):
            t[i+1,:self.num_vars]=c; t[i+1,-1]=r
            if s=='<=': t[i+1,self.num_vars+si]=1; b[i]=self.num_vars+si; si+=1
            elif s=='>=': t[i+1,self.num_vars+ns+sui]=-1; t[i+1,self.num_vars+ns+nsur+ai]=1; b[i]=self.num_vars+ns+nsur+ai; sui+=1; ai+=1
            elif s=='=': t[i+1,self.num_vars+ns+nsur+ai]=1; b[i]=self.num_vars+ns+nsur+ai; ai+=1
        if bm and na>0:
            ast=self.num_vars+ns+nsur; t[0,ast:ast+na]=m
            for i in range(na): c=ast+i; r=np.where(t[1:,c]==1)[0][0]+1; t[0,:]-=m*t[r,:]
        return t,b
    def _get_solution_from_tableau(self, t, b):
        s={f'x{i+1}':"0" for i in range(self.num_vars)}
        for i,v in enumerate(b): 
            if v<self.num_vars: s[f'x{v+1}']=self._to_fraction_str(t[i+1,-1])
        z=t[0,-1]*(-1 if self.objective=='min' else 1); s['Z']=self._to_fraction_str(z)
        ds={}; nc=len(self.constraints)
        for i in range(nc): 
            c=self.num_vars+i
            if c<t.shape[1]-1: 
                v=t[0,c]; 
                if self.objective=='min': v*=-1
                ds[f'y{i+1}']=self._to_fraction_str(v)
        s['dual_solution']=ds; s['tableau']=t; s['basis']=b
        return s
# solver_api/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# Importe sua classe LPSolver do arquivo main_solver.py
from .main_solver import LPSolver 

@api_view(['POST']) # Define que esta view só aceita requisições do tipo POST
def solve_problem(request):
    """
    Recebe um problema de PL em formato JSON, resolve usando o LPSolver
    e retorna a solução.
    """
    try:
        data = request.data

        # Extrai os dados do JSON recebido
        objective = data['objective']
        obj_func = data['objective_function']
        constraints_data = data['constraints']

        # O LPSolver espera uma lista de tuplas, então convertemos o JSON
        constraints = [
            (c['coefficients'], c['sign'], c['rhs']) 
            for c in constraints_data
        ]

        # Cria a instância do seu solver
        solver = LPSolver(
            objective_function=obj_func,
            constraints=constraints,
            objective=objective
        )

        # Resolve o problema
        status_msg, solution = solver.solve(method='auto')

        # Prepara a resposta
        if solution:
            response_data = {'status': status_msg, 'solution': solution}
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            response_data = {'status': status_msg, 'error': 'Não foi possível encontrar uma solução ótima.'}
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

    except (KeyError, TypeError) as e:
        # Erro se algum campo estiver faltando ou mal formatado no JSON
        return Response({'error': f'JSON inválido ou campo obrigatório faltando: {e}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Captura qualquer outro erro inesperado
        return Response({'error': f'Ocorreu um erro interno: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

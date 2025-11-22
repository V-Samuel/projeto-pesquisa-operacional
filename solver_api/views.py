from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .main_solver import LPSolver 

@api_view(['POST'])
def solve_problem(request):
    try:
        data = request.data
        objective = data['objective']
        obj_func = data['objective_function']
        constraints_data = data['constraints']

        constraints = [
            (c['coefficients'], c['sign'], c['rhs']) 
            for c in constraints_data
        ]

        solver = LPSolver(
            objective_function=obj_func,
            constraints=constraints,
            objective=objective
        )

        method_from_frontend = data.get('method', 'auto')
        # NOVO: Ler a opção de solução inteira
        integer_mode = data.get('integer_mode', False)

        # Passamos a opção para o solver
        status_msg, solution = solver.solve(method=method_from_frontend, integer_mode=integer_mode)

        if solution:
            response_data = {'status': status_msg, 'solution': solution}
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            response_data = {'status': status_msg, 'error': 'Não foi possível encontrar uma solução ótima.'}
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

    except (KeyError, TypeError) as e:
        return Response({'error': f'JSON inválido: {e}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Ocorreu um erro interno: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
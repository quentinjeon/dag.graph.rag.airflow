from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
import requests
import json

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2025, 5, 11),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def process_question(question):
    """GraphRAG API에 질문을 전송하고 응답을 받습니다."""
    url = 'http://host.docker.internal:8000/api/chat'
    headers = {'Content-Type': 'application/json'}
    data = {'question': question}
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def save_result(response, **context):
    """응답을 로그에 저장합니다."""
    execution_date = context['execution_date']
    with open(f'/opt/airflow/logs/response_{execution_date.strftime("%Y%m%d_%H%M%S")}.json', 'w') as f:
        json.dump(response, f, ensure_ascii=False, indent=2)
    return True

with DAG(
    'graph_rag_workflow',
    default_args=default_args,
    description='GraphRAG 워크플로우를 실행하는 DAG',
    schedule_interval=timedelta(days=1),
    catchup=False
) as dag:

    # 샘플 질문 목록
    questions = [
        "인공지능의 기본 원리는 무엇인가요?",
        "머신러닝과 딥러닝의 차이점은 무엇인가요?",
        "자연어 처리란 무엇인가요?"
    ]

    for i, question in enumerate(questions):
        process_task = PythonOperator(
            task_id=f'process_question_{i}',
            python_callable=process_question,
            op_args=[question],
            do_xcom_push=True,
        )

        save_task = PythonOperator(
            task_id=f'save_result_{i}',
            python_callable=save_result,
            op_args=["{{ task_instance.xcom_pull(task_ids='process_question_" + str(i) + "') }}"],
            provide_context=True,
        )

        process_task >> save_task 
# GraphRAG 워크플로우 시스템

## 프로젝트 개요

이 프로젝트는 그래프 기반 검색 증강 생성(Graph-based Retrieval Augmented Generation, GraphRAG) 시스템을 구현한 것입니다. 벡터 데이터베이스(Weaviate)와 그래프 데이터베이스(Neo4j)를 결합하여 고품질의 질의응답 시스템을 구축하고, Airflow를 통해 워크플로우를 자동화합니다.

### 핵심 기능

- **벡터 검색**: Weaviate를 사용한 의미적 유사성 기반 문서 검색
- **엔티티 추출**: 질문에서 핵심 엔티티를 식별하여 그래프 검색 강화
- **그래프 탐색**: Neo4j를 사용하여 추출된 엔티티 간의 관계 탐색
- **통합 컨텍스트 생성**: 벡터 검색 결과와 그래프 검색 결과를 결합
- **자연어 응답 생성**: OpenAI API를 통해 검색 결과를 바탕으로 한 응답 생성
- **워크플로우 자동화**: Airflow DAG를 통한 질의응답 프로세스 자동화

## 시스템 아키텍처

![GraphRAG 아키텍처](./docs/architecture.png)

### 주요 컴포넌트

1. **Express 서버**: 
   - 사용자 질의를 받아 처리하는 RESTful API 제공
   - GraphRAG 워크플로우 조정 및 실행
   - 포트 8000에서 실행

2. **Weaviate (벡터 데이터베이스)**:
   - OpenAI 임베딩 기반 벡터화된 문서 저장
   - 의미적 유사성 기반 검색 제공
   - 포트 8080에서 실행

3. **Neo4j (그래프 데이터베이스)**:
   - 개념 및 엔티티 간의 관계 저장
   - 그래프 기반 탐색 및 지식 추출
   - UI: 포트 7474, Bolt: 포트 7687에서 실행

4. **OpenAI API**:
   - 텍스트 임베딩 생성
   - 자연어 응답 생성

5. **Airflow**:
   - 데이터 처리 및 질의응답 워크플로우 자동화
   - 웹 UI: 포트 8080에서 실행
   - PostgreSQL 백엔드: 포트 5432에서 실행

## 설치 및 실행 방법

### 사전 요구사항

- Docker 및 Docker Compose
- Node.js (v16 이상)
- OpenAI API 키

### 환경 설정

1. 저장소 클론:

```bash
git clone https://github.com/quentinjeon/dag.graph.rag.airflow.git
cd dag.graph.rag.airflow
```

2. 환경 변수 설정:

`.env` 파일을 생성하고 다음 내용을 추가합니다:

```
OPENAI_API_KEY=your_openai_api_key
NEO4J_AUTH=neo4j/password123
AIRFLOW_UID=50000
AIRFLOW__CORE__LOAD_EXAMPLES=false
```

### 시스템 실행

1. 필요한 패키지 설치:

```bash
npm install
```

2. Docker Compose로 필요한 서비스 시작:

```bash
docker-compose up -d
```

이 명령어로 다음 서비스가 시작됩니다:
- Weaviate (벡터 데이터베이스)
- Neo4j (그래프 데이터베이스)
- Airflow (웹서버, 스케줄러, PostgreSQL)

3. 데이터베이스 초기화:

```bash
node scripts/setup-weaviate.js
node scripts/setup-neo4j.js
```

4. 서버 시작:

```bash
node scripts/server.js
```

### API 사용 방법

#### 질문 API

```
POST /api/chat
```

요청 본문:
```json
{
  "question": "인공지능의 기본 원리는 무엇인가요?"
}
```

응답:
```json
{
  "answer": "인공지능의 기본 원리는 기계가 학습, 추론, 인식, 의사결정과 같은 인간의 지능적 행동을 모방하는 것입니다. 핵심 원리로는 데이터 기반 학습, 패턴 인식, 문제 해결 능력 등이 있습니다...",
  "sources": [
    {
      "type": "vector",
      "content": "인공지능(AI)의 기본 원리는..."
    },
    {
      "type": "graph",
      "relationships": [
        "인공지능-사용-머신러닝",
        "인공지능-포함-딥러닝"
      ]
    }
  ]
}
```

#### 상태 확인 API

```
GET /health
```

응답:
```json
{
  "status": "ok",
  "services": {
    "weaviate": "connected",
    "neo4j": "connected"
  }
}
```

## Airflow DAG

### GraphRAG 워크플로우 DAG

이 시스템은 Airflow를 사용하여 질의응답 프로세스를 자동화합니다. DAG는 다음 단계로 구성됩니다:

1. **질문 수집**: 입력된 질문을 가져옵니다.
2. **벡터 검색**: Weaviate에서 관련 문서를 검색합니다.
3. **엔티티 추출**: 질문에서 핵심 개념을 추출합니다.
4. **그래프 검색**: Neo4j에서 관련 관계를 탐색합니다.
5. **응답 생성**: 모든 정보를 통합하여 응답을 생성합니다.
6. **결과 저장**: 질문, 응답, 소스를 데이터베이스에 저장합니다.

Airflow UI는 다음 주소에서 접근할 수 있습니다:
```
http://localhost:8080
```
기본 계정: admin / admin

### DAG 설정 및 실행

DAG 설정 파일(`dags/graph_rag_workflow.py`)에서 다음을 포함하는 DAG가 자동으로 스케줄링됩니다:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2025, 5, 11),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'graph_rag_workflow',
    default_args=default_args,
    description='GraphRAG 질의응답 워크플로우',
    schedule_interval=timedelta(days=1),
)

# 워크플로우 단계 정의...
```

## 시스템 구현 상세

### 1. 벡터 데이터베이스 (Weaviate)

Weaviate는 다음과 같이 설정됩니다:

- **스키마**: `Document` 클래스는 문서 콘텐츠와 메타데이터를 저장합니다.
- **벡터라이저**: OpenAI의 임베딩 모델을 사용합니다.
- **인덱싱**: 자동으로 문서를 벡터화하고 색인을 생성합니다.

```javascript
// scripts/setup-weaviate.js
const documentClass = {
  class: 'Document',
  vectorizer: 'text2vec-openai',
  moduleConfig: {
    'text2vec-openai': {
      model: 'ada',
      modelVersion: '002',
      type: 'text'
    }
  },
  properties: [
    {
      name: 'content',
      dataType: ['text'],
      moduleConfig: {
        'text2vec-openai': {
          skip: false,
          vectorizePropertyName: false
        }
      }
    },
    {
      name: 'metadata',
      dataType: ['object']
    }
  ]
};
```

### 2. 그래프 데이터베이스 (Neo4j)

Neo4j는 다음과 같이 구성됩니다:

- **노드**: 인공지능, 머신러닝, 딥러닝 등의 개념을 표현
- **관계**: 개념 간의 관계를 정의 (예: "사용", "기반", "포함")
- **속성**: 각 노드와 관계의 추가 정보 저장

```javascript
// scripts/setup-neo4j.js
// 노드 생성
await session.run(
  'CREATE (ai:Concept {name: "인공지능", description: "인간의 학습능력, 추론능력, 지각능력을 인공적으로 구현한 컴퓨터 시스템"})'
);

// 관계 생성
await session.run(
  'MATCH (ai:Concept {name: "인공지능"}), (ml:Concept {name: "머신러닝"}) ' +
  'CREATE (ai)-[:USES {description: "학습 방법론으로 사용"}]->(ml)'
);
```

### 3. 서버 구현 (Express)

Express 서버는 GraphRAG 워크플로우를 처리합니다:

```javascript
// scripts/server.js
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    
    // 1. 벡터 검색
    const vectorResults = await searchVectorDB(question);
    
    // 2. 엔티티 추출
    const entities = await extractEntities(question);
    
    // 3. 그래프 검색
    const graphResults = await searchGraphDB(entities);
    
    // 4. 응답 생성
    const answer = await generateAnswer(question, vectorResults, graphResults);
    
    res.json({
      answer,
      sources: {
        vector: vectorResults,
        graph: graphResults
      }
    });
  } catch (error) {
    console.error('Error processing question:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});
```

### 4. Airflow 워크플로우

Airflow DAG는 다음 단계로 구성됩니다:

```python
# dags/graph_rag_workflow.py
def process_question(**kwargs):
    question = kwargs['question']
    # 질문 처리 로직...
    return question

def vector_search(**kwargs):
    # Weaviate 검색 로직...
    return results

def entity_extraction(**kwargs):
    # 엔티티 추출 로직...
    return entities

def graph_search(**kwargs):
    # Neo4j 그래프 검색 로직...
    return results

def generate_response(**kwargs):
    # 응답 생성 로직...
    return response

def store_results(**kwargs):
    # 결과 저장 로직...
    return True
```

## 알려진 이슈 및 해결 방법

### Weaviate 벡터 검색 오류

**이슈**: "resolve node name \"3256e4dba818\" to host" 오류가 발생할 수 있습니다.

**원인**: Weaviate 클러스터의 노드 해석 문제로, 서버 구성 과정에서 발생할 수 있습니다.

**임시 해결 방법**: 서버를 재시작하거나 다음 명령어를 실행하여 모든 Node.js 프로세스를 종료한 후 서버를 재시작합니다:

```bash
taskkill /f /im node.exe
node scripts/server.js
```

### Neo4j 인증 오류

**이슈**: Neo4j 연결이 실패할 수 있습니다.

**원인**: 인증 정보가 올바르게 설정되지 않았거나 컨테이너가 완전히 초기화되지 않았을 수 있습니다.

**해결 방법**: 
1. `.env` 파일에서 `NEO4J_AUTH=neo4j/password123`가 올바르게 설정되었는지 확인합니다.
2. Neo4j 컨테이너를 재시작합니다:
```bash
docker-compose restart neo4j
```

### Airflow 환경 변수 문제

**이슈**: Airflow 예제 DAG가 로드되거나 설정 문제가 발생할 수 있습니다.

**해결 방법**: `.env` 파일에서 다음을 확인하거나 추가합니다:
```
AIRFLOW__CORE__LOAD_EXAMPLES=false
AIRFLOW_UID=50000
```

## 성능 최적화 팁

1. **벡터 검색 최적화**:
   - 검색 결과 수 제한 (일반적으로 3-5개가 적절)
   - 유사성 임계값 조정 (0.7 이상 권장)

2. **그래프 검색 최적화**:
   - 깊이 제한 설정 (2-3 홉 이내 권장)
   - 관계 필터링 설정

3. **캐싱 구현**:
   - 자주 묻는 질문에 대한 응답 캐싱
   - 임베딩 결과 캐싱

4. **응답 생성 최적화**:
   - 컨텍스트 크기 제한
   - 모델 토큰 사용량 최적화

## 추가 개발 가이드

### 새로운 문서 추가

Weaviate에 새 문서를 추가하려면 다음과 같은 스크립트를 작성할 수 있습니다:

```javascript
// add-document.js
const weaviate = require('weaviate-client');
const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

async function addDocument(content, metadata = {}) {
  try {
    await client.data.creator()
      .withClassName('Document')
      .withProperties({
        content: content,
        metadata: metadata
      })
      .do();
    console.log('Document added successfully');
  } catch (error) {
    console.error('Error adding document:', error);
  }
}

// 사용 예시
addDocument(
  '인공지능(AI)은 인간의 지능을 모방하기 위해 설계된 시스템입니다...',
  { source: 'AI 소개 문서', author: '김철수', date: '2025-05-01' }
);
```

### 새로운 그래프 관계 추가

Neo4j에 새 관계를 추가하려면 다음과 같은 스크립트를 사용할 수 있습니다:

```javascript
// add-relationship.js
const neo4j = require('neo4j-driver');

async function addRelationship(fromEntity, relationship, toEntity, properties = {}) {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password123')
  );
  const session = driver.session();

  try {
    // 노드가 없으면 생성
    await session.run(
      `MERGE (from:Concept {name: $fromName})
       MERGE (to:Concept {name: $toName})
       MERGE (from)-[r:${relationship}]->(to)
       SET r += $properties
       RETURN from, r, to`,
      { 
        fromName: fromEntity, 
        toName: toEntity,
        properties: properties
      }
    );
    console.log('Relationship added successfully');
  } catch (error) {
    console.error('Error adding relationship:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// 사용 예시
addRelationship(
  '자연어처리', 
  'PART_OF', 
  '인공지능',
  { description: '인공지능의 한 분야', since: '1950s' }
);
```

### API 확장

새로운 API 엔드포인트를 추가하려면 `server.js` 파일을 다음과 같이 수정하세요:

```javascript
// 새로운 엔드포인트 예시
app.get('/api/concepts', async (req, res) => {
  try {
    const driver = neo4j.driver(
      'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123')
    );
    const session = driver.session();
    
    const result = await session.run('MATCH (c:Concept) RETURN c.name AS name, c.description AS description');
    
    const concepts = result.records.map(record => ({
      name: record.get('name'),
      description: record.get('description')
    }));
    
    await session.close();
    await driver.close();
    
    res.json(concepts);
  } catch (error) {
    console.error('Error fetching concepts:', error);
    res.status(500).json({ error: 'Failed to fetch concepts' });
  }
});
```

## 기여 방법

이 프로젝트에 기여하고 싶으시다면:

1. 이슈를 생성하거나 기존 이슈에 댓글을 남겨주세요.
2. 개선사항을 포함한 Pull Request를 보내주세요.
3. 코드 리뷰 후 병합됩니다.

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## 연락처

- 이메일: [example@example.com](mailto:example@example.com)
- GitHub: [quentinjeon](https://github.com/quentinjeon) 
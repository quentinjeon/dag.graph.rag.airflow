require('dotenv').config();
const neo4j = require('neo4j-driver');

async function setupNeo4j() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password123')
  );

  const session = driver.session();

  try {
    // 기존 데이터 삭제
    console.log('기존 데이터 삭제 중...');
    await session.run('MATCH (n) DETACH DELETE n');

    // 노드 생성
    console.log('노드 생성 중...');
    const createNodesQuery = `
      CREATE (ai:Concept { name: '인공지능', description: '컴퓨터가 인간의 지능을 모방하는 기술' })
      CREATE (ml:Concept { name: '머신러닝', description: '데이터로부터 학습하는 AI의 한 분야' })
      CREATE (dl:Concept { name: '딥러닝', description: '인공신경망을 사용하는 머신러닝의 한 종류' })
      CREATE (nn:Concept { name: '신경망', description: '뉴런의 연결을 모방한 학습 모델' })
      CREATE (sup:Concept { name: '지도학습', description: '레이블이 있는 데이터로 학습하는 방식' })
      CREATE (unsup:Concept { name: '비지도학습', description: '레이블이 없는 데이터에서 패턴을 찾는 방식' })
      CREATE (reinf:Concept { name: '강화학습', description: '행동과 보상을 통해 학습하는 방식' })
    `;
    await session.run(createNodesQuery);

    // 관계 생성
    console.log('관계 생성 중...');
    const createRelationsQuery = `
      MATCH (ai:Concept {name: '인공지능'})
      MATCH (ml:Concept {name: '머신러닝'})
      MATCH (dl:Concept {name: '딥러닝'})
      MATCH (nn:Concept {name: '신경망'})
      MATCH (sup:Concept {name: '지도학습'})
      MATCH (unsup:Concept {name: '비지도학습'})
      MATCH (reinf:Concept {name: '강화학습'})
      
      CREATE (ml)-[:IS_TYPE_OF]->(ai)
      CREATE (dl)-[:IS_TYPE_OF]->(ml)
      CREATE (dl)-[:USES]->(nn)
      CREATE (sup)-[:IS_TYPE_OF]->(ml)
      CREATE (unsup)-[:IS_TYPE_OF]->(ml)
      CREATE (reinf)-[:IS_TYPE_OF]->(ml)
    `;
    await session.run(createRelationsQuery);

    console.log('Neo4j 설정이 완료되었습니다.');
  } catch (error) {
    console.error('Neo4j 설정 중 오류 발생:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// 스크립트 실행
setupNeo4j().catch(console.error); 
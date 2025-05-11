require('dotenv').config();
const express = require('express');
const { default: weaviate } = require('weaviate-ts-client');
const neo4j = require('neo4j-driver');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Weaviate 클라이언트 초기화
const weaviateClient = weaviate.client({
  scheme: process.env.WEAVIATE_SCHEME || 'http',
  host: process.env.WEAVIATE_HOST || 'localhost:8080'
});

// Neo4j 클라이언트 초기화
const neo4jDriver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password123')
);

// 벡터 검색 함수
async function searchVectorDB(question) {
  try {
    const result = await weaviateClient.graphql
      .get()
      .withClassName('Document')
      .withFields(['content', 'metadata'])
      .withNearText({ concepts: [question] })
      .withLimit(3)
      .do();

    return result.data.Get.Document;
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}

// 엔티티 추출 함수
async function extractEntities(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Extract key entities (technical terms, concepts, methods) from the given text. Return them as a comma-separated list."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    const entities = response.choices[0].message.content.split(',').map(e => e.trim());
    return entities;
  } catch (error) {
    console.error('Entity extraction error:', error);
    return [];
  }
}

// 그래프 검색 함수
async function searchGraphDB(entities) {
  const session = neo4jDriver.session();
  try {
    const query = `
      MATCH (n:Concept)
      WHERE n.name IN $entities
      MATCH (n)-[r]-(related)
      RETURN n, r, related
      LIMIT 5
    `;
    
    const result = await session.run(query, { entities });
    return result.records.map(record => ({
      node: record.get('n').properties,
      relationship: record.get('r').type,
      related: record.get('related').properties
    }));
  } catch (error) {
    console.error('Graph search error:', error);
    return [];
  } finally {
    await session.close();
  }
}

// 답변 생성 함수
async function generateAnswer(question, vectorResults, graphResults) {
  try {
    const context = `
Vector Search Results:
${vectorResults.map(r => `- ${r.content}`).join('\n')}

Graph Knowledge:
${graphResults.map(r => `- ${r.node.name} ${r.relationship} ${r.related.name}: ${r.related.description}`).join('\n')}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable AI assistant. Use the provided context from vector search and graph database to answer the question accurately. Cite specific pieces of information from the context when possible."
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Answer generation error:', error);
    return "죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.";
  }
}

// 챗봇 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: '질문을 입력해주세요.' });
    }

    // 1. 벡터 검색으로 관련 문서 찾기
    const vectorResults = await searchVectorDB(question);

    // 2. 질문과 검색된 문서에서 엔티티 추출
    const entities = await extractEntities(question + ' ' + vectorResults.map(r => r.content).join(' '));

    // 3. 그래프 데이터베이스에서 관련 정보 검색
    const graphResults = await searchGraphDB(entities);

    // 4. 최종 답변 생성
    const answer = await generateAnswer(question, vectorResults, graphResults);

    res.json({ answer });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
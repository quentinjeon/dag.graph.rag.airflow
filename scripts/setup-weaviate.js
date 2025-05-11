require('dotenv').config();
const { default: weaviate } = require('weaviate-ts-client');

async function setupWeaviate() {
  // Weaviate 클라이언트 초기화
  const client = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME || 'http',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
  });

  try {
    // 기존 Document 클래스가 있다면 삭제
    console.log('기존 Document 클래스 삭제 중...');
    try {
      await client.schema.classDeleter().withClassName('Document').do();
    } catch (error) {
      // 클래스가 없는 경우 무시
    }

    // Document 클래스 스키마 정의
    console.log('새 Document 클래스 생성 중...');
    const schemaConfig = {
      class: 'Document',
      description: '문서 데이터를 저장하는 클래스',
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
          description: '문서의 실제 내용',
          dataType: ['text']
        },
        {
          name: 'metadata',
          description: '문서의 메타데이터',
          dataType: ['text[]']
        }
      ]
    };

    await client.schema.classCreator().withClass(schemaConfig).do();

    // 샘플 데이터 추가
    const documents = [
      {
        content: '인공지능(AI)은 인간의 학습능력과 추론능력, 지각능력을 컴퓨터 프로그램으로 실현한 기술입니다.',
        metadata: ['AI 기초', '인공지능 개요']
      },
      {
        content: '머신러닝은 컴퓨터가 데이터로부터 패턴을 학습하여 의사결정을 하는 인공지능의 한 분야입니다.',
        metadata: ['머신러닝 기초', '지도학습']
      },
      {
        content: '딥러닝은 여러 층의 인공신경망을 사용하여 데이터로부터 복잡한 패턴을 학습하는 머신러닝의 한 종류입니다.',
        metadata: ['딥러닝 기초', '신경망']
      }
    ];

    console.log('샘플 데이터 추가 중...');
    for (const doc of documents) {
      await client.data.creator()
        .withClassName('Document')
        .withProperties(doc)
        .do();
    }

    console.log('Weaviate 설정이 완료되었습니다.');
  } catch (error) {
    console.error('Weaviate 설정 중 오류 발생:', error);
  }
}

setupWeaviate(); 
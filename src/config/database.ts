import mysql from 'mysql2/promise';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// MySQL 연결 풀
export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'ainus_user',
  password: process.env.MYSQL_PASSWORD || 'qwer1234',
  database: process.env.MYSQL_DATABASE || 'ai_model_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Redis 클라이언트
export const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('Redis 연결 시도 중...'));
redisClient.on('ready', () => console.log('Redis 준비 완료'));

// Redis 연결
redisClient.connect().catch(err => {
  console.error('Redis 연결 실패:', err);
});

// 연결 테스트 함수
export async function testConnections() {
  try {
    console.log('\n데이터베이스 연결 테스트 시작...\n');

    // MySQL 테스트
    console.log('MySQL 연결 시도 중...');
    const [rows] = await mysqlPool.query('SELECT 1 as result');
    console.log('MySQL 연결 성공');
    console.log(`  - Host: ${process.env.MYSQL_HOST || '127.0.0.1'}`);
    console.log(`  - Port: ${process.env.MYSQL_PORT || 3307}`);
    console.log(`  - Database: ${process.env.MYSQL_DATABASE || 'ai_model_app'}`);

    // Redis 테스트
    console.log('\nRedis 연결 확인 중...');
    const pong = await redisClient.ping();
    console.log('Redis 연결 성공');
    console.log(`  - Response: ${pong}`);

    console.log('\n모든 데이터베이스 연결 성공!\n');
  } catch (error) {
    console.error('\n데이터베이스 연결 실패:\n');
    if (error instanceof Error) {
      console.error(`  오류: ${error.message}`);
      console.error(`  상세: ${error.stack}`);
    } else {
      console.error(error);
    }
    throw error;
  }
}

// 프로세스 종료 시 연결 종료
process.on('SIGINT', async () => {
  console.log('\n\n서버 종료 중...');
  
  try {
    await mysqlPool.end();
    console.log('MySQL 연결 종료');
    
    await redisClient.quit();
    console.log('Redis 연결 종료');
    
    console.log('서버 종료 완료\n');
    process.exit(0);
  } catch (error) {
    console.error('연결 종료 중 오류:', error);
    process.exit(1);
  }
});

import { FastifyQueryApi } from './index';

import sqlite3 from 'sqlite3';
const db = new sqlite3.Database(':memory:');

db.on('error', console.error);
db.on('trace', console.log);
db.on('profile', console.log);

const api = new FastifyQueryApi({
    cros: '*',
    components: {},
    info: {
        title: 'Test API',
        version: '1.0',
        description: 'Test API',
    },
    tags: [{ name: 'test', description: 'Test tag' }],
    doc: { path: '/doc' },
    database: {
        insertUpdateDeleteQuery: async (req, query: string, values: any[]) => {
            return { insertId: 1, affectedRows: 1, changedRows: 1 };
        },
        selectQuery: async (req, query: string, values: any[]) => {
            return Promise.resolve([{ id: 1, name: 'test' }]);
        },
    },
});

db.serialize(() => {
    db.run('CREATE TABLE test (id INT, name TEXT)');
    api.listen({
        port: 3000,
        host: '::',
    });

    api.select<{
        Params: { user_id: number };
    }>(
        {
            path: '/test',
            schema: {
                description: '디스코드 사용자 인증 - 로컬 테스트용 / 페이지 인증용 토큰',
                tags: ['Auth'],
                deprecated: false, // 비활성화
            },
        },
        `select * from test`
    );
});

process.on('SIGINT', async () => {
    db.close();
    await api.close();
    process.exit(0);
});

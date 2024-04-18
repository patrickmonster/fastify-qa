import { FastifyQueryApi } from './index';

const api = new FastifyQueryApi({
    components: {},
    info: {
        title: 'Test API',
        version: '1.0',
    },
    // tags: [{ name: 'test', description: 'Test tag' }],
    doc: { path: '/doc' },
    database: {
        insertUpdateDeleteQuery: async (query: string, values: any[]) => {
            return { insertId: 1, affectedRows: 1, changedRows: 1 };
        },
        selectQuery: async (query: string, values: any[]) => {
            return Promise.resolve([{ id: 1, name: 'test' }]);
        },
    },
});

api.listen({
    port: 3000,
    host: '::',
});

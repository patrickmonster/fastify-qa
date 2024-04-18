import { FastifyQueryApi } from './index';

const api = new FastifyQueryApi({
    components: {},
    info: {
        title: 'Test API',
        version: '1.0',
    },
    tags: [{ name: 'test', description: 'Test tag' }],
    doc: {
        path: '/doc',
    },
});

api.listen({
    port: 3000,
    host: '::',
});

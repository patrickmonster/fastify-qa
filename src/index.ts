import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import error from '@fastify/sensible';
import { fastifySwagger } from '@fastify/swagger';
import swagger_ui from '@fastify/swagger-ui';

import { Options as AjvOptions } from 'ajv/dist/core';
import fastify, {
    FastifyInstance,
    FastifyListenOptions,
    FastifyReply,
    FastifyRequest,
    FastifySchema,
    RequestGenericInterface,
} from 'fastify';

import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

interface FastifyDocumentOption {
    path: `/${string}`;
    logo?: {
        type: string;
        content: string | Buffer;
    };
}

export enum SQLType {
    select = 'select',
    insert = 'insert',
    update = 'update',
    delete = 'delete',
}

export type SqlInsertUpdate = SQLType.insert | SQLType.update | SQLType.delete;
export interface sqlInsertUpdate {
    affectedRows: number;
    changedRows: number;
    insertId: number;
}

type ResqultQuery<E> = E extends SqlInsertUpdate ? sqlInsertUpdate : Array<E>;

export type queryFunctionType = <E>(query: string, ...params: any[]) => Promise<ResqultQuery<E>>;

interface FastifySwaggerOption {
    avj?: {
        customOptions?: AjvOptions;
        plugins?: (Function | [Function, unknown])[];
    };
    database: {
        limit?: string;
        selectQuery: (query: string, ...params: any[]) => Promise<Array<any>>;
        insertUpdateDeleteQuery: (query: string, ...params: any[]) => Promise<sqlInsertUpdate>;
    };
    tags?: OpenAPIV3.TagObject[];
    components: OpenAPIV3_1.ComponentsObject;
    info: OpenAPIV3.InfoObject;
    doc: FastifyDocumentOption;
}

export class FastifyQueryApi {
    option: FastifySwaggerOption;
    server: FastifyInstance;

    constructor(option: FastifySwaggerOption) {
        this.option = option;
        this.server = fastify({
            logger: { transport: { target: '@fastify/one-line-logger' } },
            ajv: option.avj,
        });

        this.server.register(error);
        this.server.register(helmet, { global: true });
        this.server.register(cors, {
            origin: '*',
            credentials: true,
        });

        this.server.get(
            '',
            {
                onRequest: [],
                schema: {},
            },
            async (req, res) => {
                return { message: 'Fastify Query API' };
            }
        );

        this.createSwaager(option);
    }

    private createSwaager(option: FastifySwaggerOption) {
        const { components, doc, info, tags } = option;
        this.server.register(fastifySwagger, {
            openapi: {
                openapi: '3.0.0',
                info,
                tags,
                components,
            },
        });

        this.server.register(swagger_ui, {
            routePrefix: doc.path,
            // logo: doc?.logo,
            uiConfig: { docExpansion: 'list', deepLinking: false },
        });
    }

    public addRoute(method: 'get' | 'post' | 'put' | 'delete', path: string, handler: (req: any, res: any) => void) {
        this.server.route({
            method,
            url: path,
            handler,
        });
    }

    public addSelectRoute<T extends RequestGenericInterface, SchemaCompiler extends FastifySchema>(
        path: string,
        opts: {
            onRequest: Array<(request: FastifyRequest, reply: FastifyReply, done: Function) => void>;
            schema: SchemaCompiler; // originally FastifySchema
        },
        query: string,
        params: any[]
    ) {
        const onRequest = opts.onRequest;
        const { database } = this.option;

        this.server.get(
            path,
            {
                onRequest,
                schema: opts.schema,
            },
            async (req, res) => {
                const { selectQuery } = database;
                return selectQuery ? await selectQuery(query, ...params) : this.server.httpErrors.notImplemented();
            }
        );
    }

    listen(options: FastifyListenOptions, callback?: (err: Error | null, address: string) => void) {
        const bootTime = Date.now();
        this.server.listen(options, (err, address) => {
            callback && callback(err, address);
            const time = Date.now() - bootTime;
            console.log(`Server started in  ${Math.floor(time / 1000)} (${time}ms) - Fastify Query API`);
        });
    }
}

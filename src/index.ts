import cors, { OriginFunction } from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import error from '@fastify/sensible';
import { fastifySwagger } from '@fastify/swagger';
import swagger_ui from '@fastify/swagger-ui';

import { Options as AjvOptions } from 'ajv/dist/core';
import Fastify, {
    FastifyInstance,
    FastifyListenOptions,
    FastifyReply,
    FastifyRequest,
    FastifySchema,
    RequestGenericInterface,
    RouteHandlerMethod,
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

interface ArrayOfValueOrArray<T> extends Array<ValueOrArray<T>> {}
type OriginType = string | boolean | RegExp;
type ValueOrArray<T> = T | ArrayOfValueOrArray<T>;

interface FastifySwaggerOption {
    cros: ValueOrArray<OriginType> | OriginFunction;
    jwt?: { secret: string };
    avj?: {
        customOptions?: AjvOptions;
        plugins?: (Function | [Function, unknown])[];
    };
    database: {
        limit?: string;
        selectQuery: (req: FastifyRequest, query: string, ...params: any[]) => Promise<Array<any>>;
        insertUpdateDeleteQuery: (req: FastifyRequest, query: string, ...params: any[]) => Promise<sqlInsertUpdate>;
    };
    tags?: OpenAPIV3.TagObject[];
    components: OpenAPIV3_1.ComponentsObject;
    info: OpenAPIV3.InfoObject;
    doc: FastifyDocumentOption;
}

interface RouterOption {
    onRequest?: Array<(request: FastifyRequest, reply: FastifyReply, done: Function) => void>;
    schema?: FastifySchema; // originally FastifySchema
}

export class FastifyQueryApi {
    option: FastifySwaggerOption;
    fastify: FastifyInstance;

    constructor(option: FastifySwaggerOption) {
        this.option = option;
        this.fastify = Fastify({
            logger: { transport: { target: '@fastify/one-line-logger' } },
            ajv: option.avj,
        });

        this.fastify.register(error);
        this.fastify.register(helmet, { global: true });
        this.fastify.register(cors, { origin: option.cros, credentials: true });
        if (typeof option.jwt == 'string') this.fastify.register(jwt, { secret: option.jwt });

        this.fastify.decorate('authenticate', function (request: FastifyRequest, reply: FastifyReply, done: Function) {
            request
                .jwtVerify()
                .then(() => done())
                .catch(e => {
                    reply.unauthorized(e.message);
                });
        });

        this.createSwaager(option);
    }

    private createSwaager(option: FastifySwaggerOption) {
        const { components, doc, info, tags } = option;
        this.fastify.register(fastifySwagger, {
            openapi: {
                openapi: '3.0.0',
                info,
                tags,
                components,
            },
        });

        this.fastify.register(swagger_ui, {
            routePrefix: doc.path,
            // logo: doc?.logo,
            uiConfig: { docExpansion: 'list', deepLinking: false },
        });
    }

    public get<T extends RequestGenericInterface>(path: string, opts: RouterOption, handler: RouteHandlerMethod) {
        this.fastify.get<T>(path, opts, handler);
    }

    public post<T extends RequestGenericInterface>(path: string, opts: RouterOption, handler: RouteHandlerMethod) {
        this.fastify.post<T>(path, opts, handler);
    }

    public put<T extends RequestGenericInterface>(path: string, opts: RouterOption, handler: RouteHandlerMethod) {
        this.fastify.put<T>(path, opts, handler);
    }

    public delete<T extends RequestGenericInterface>(path: string, opts: RouterOption, handler: RouteHandlerMethod) {
        this.fastify.delete<T>(path, opts, handler);
    }

    getObjectToSchema<T extends RequestGenericInterface>(schema: Object) {
        JSON.stringify(schema);
    }

    public select<T extends RequestGenericInterface>(
        opts: RouterOption & { path: string },
        query: string,
        getParemeters?: (req: FastifyRequest) => Promise<any[]> | any[]
    ) {
        this.get<T>(
            opts.path,
            opts,
            async (req, res) =>
                await this.option.database.selectQuery(req, query, getParemeters ? await getParemeters(req) : [])
        );
    }

    listen(options: FastifyListenOptions, callback?: (err: Error | null, address: string) => void) {
        const bootTime = Date.now();
        this.fastify.listen(options, (err, address) => {
            callback && callback(err, address);
            const time = Date.now() - bootTime;
            console.log(`Server started in  ${Math.floor(time / 1000)} (${time}ms) - Fastify Query API ${address}`);
        });
    }

    async close() {
        await this.fastify.close();
    }
}

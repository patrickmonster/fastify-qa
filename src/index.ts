import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import error from '@fastify/sensible';
import { fastifySwagger } from '@fastify/swagger';
import swagger_ui from '@fastify/swagger-ui';

import { Options as AjvOptions } from 'ajv/dist/core';
import fastify, { FastifyInstance, FastifyListenOptions } from 'fastify';

import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

interface FastifyDocumentOption {
    path: `/${string}`;
    logo?: {
        type: string;
        content: string | Buffer;
    };
}

interface FastifySwaggerOption {
    avj?: {
        customOptions?: AjvOptions;
        plugins?: (Function | [Function, unknown])[];
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

    listen(options: FastifyListenOptions, callback?: (err: Error | null, address: string) => void) {
        const bootTime = Date.now();
        this.server.listen(options, (err, address) => {
            callback && callback(err, address);
            const time = Date.now() - bootTime;
            console.log(`Server started in  ${Math.floor(time / 1000)} (${time}ms) - Fastify Query API`);
        });
    }
}

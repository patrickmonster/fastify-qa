'use strict';
import jwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply, done: Function) => void;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        SignPayloadType: {
            id: string;
            access_token: string;
            refresh_token?: string;
        };
        payload: {
            id: string;
            access_token: string;
        };
        user: {
            id: string;
            access_token: string;
            refresh_token: string;
        };
    }
}
/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp(async function (fastify, opts) {
    fastify.register(jwt, {
        secret: process.env.JWT_SECRET || 'secret',
    });

    fastify.decorate('authenticate', function (request: FastifyRequest, reply: FastifyReply, done: Function) {
        request
            .jwtVerify()
            .then(() => done())
            .catch(e => {
                reply.unauthorized(e.message);
            });
    });
});

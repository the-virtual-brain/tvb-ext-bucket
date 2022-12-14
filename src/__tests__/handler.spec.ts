import {getError} from "./testUtils";

jest.mock('@jupyterlab/services', () => {
  class NetworkError extends Error {};
  class ResponseError extends Error {};
  return {
    __esModule: true,
      ServerConnection: {
        NetworkError,
        ResponseError,
        makeRequest: jest.fn().mockImplementationOnce((requestUrl, init, settings) => {
              return Promise.resolve(new Response('{"a": "b"}'))
          }).mockImplementationOnce((requestUrl, init, settings) => {
              return Promise.reject(new Response('{"a": "b"}'))
          }).mockImplementationOnce((requestUrl, init, settings) => {
              const resp = new Response(new Blob(),
                  {status: 404});
              return Promise.resolve(resp)
          }),
          makeSettings: jest.fn().mockImplementation(() => {
              return {
                  baseUrl: 'test',
                  appUrl: 'test',
                  wsUrl: 'test',
                  init: null,
                  token: 'token',
                  appendToken: false,
                  fetch: fetch,
                  Request: Request,
                  Headers: Headers,
                  WebSocket: WebSocket}
          })
      },
  };
});

import {requestAPI} from "../handler";
import {ServerConnection} from "@jupyterlab/services";
import NetworkError = ServerConnection.NetworkError;
import ResponseError = ServerConnection.ResponseError;

describe('Test requestAPI', () => {
    it('tests success with json', async () => {
        const resp = await requestAPI('test');
        expect(resp).toEqual({a:"b"})
    });

    it('throws NetworkError when request fails', async () => {
        const err = await getError(async () => await requestAPI('test'));
        expect(err).toBeInstanceOf(NetworkError);
    })

    it('throws ResponseError when status is not ok', async () => {
        const err = await getError(async () => await requestAPI('test'));
        expect(err).toBeInstanceOf(ResponseError);
    })
})
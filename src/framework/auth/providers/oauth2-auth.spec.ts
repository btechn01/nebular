/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import { async, inject, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { NbWindow } from '@nebular/theme';
import { of as observableOf } from 'rxjs/observable/of';

import { NbOAuth2AuthProvider, NbOAuth2GrantType, NbOAuth2ResponseType } from './oauth2-auth.provider';
import { NbAuthResult } from '../services/auth-result';


describe('oauth2-auth-provider', () => {

  let provider: NbOAuth2AuthProvider;
  let httpMock: HttpTestingController;
  let routeMock: any;
  let windowMock: any;

  const successMessages = ['You have been successfully authenticated.'];
  const errorMessages = ['Something went wrong, please try again.'];

  const tokenSuccessResponse = {
    access_token: '2YotnFZFEjr1zCsicMWpAA',
    expires_in: 3600,
    refresh_token: 'tGzv3JOkF0XG5Qx2TlKWIA',
    example_parameter: 'example_value',
  };

  const tokenErrorResponse = {
    error: 'unauthorized_client',
    error_description: 'unauthorized',
    error_uri: 'some',
  };


  beforeEach(() => {
    windowMock = { location: { href: '' } };
    routeMock = { params: observableOf({}), queryParams: observableOf({}) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        NbOAuth2AuthProvider,
        { provide: ActivatedRoute, useFactory: () => routeMock },
        { provide: NbWindow, useFactory: () => windowMock }, // useValue will clone, we need reference
      ],
    });
  });

  beforeEach(async(inject(
    [NbOAuth2AuthProvider, HttpTestingController, ActivatedRoute],
    (_provider, _httpMock) => {
      provider = _provider;
      httpMock = _httpMock;

      provider.setConfig({});
    },
  )));

  afterEach(() => {
    httpMock.verify();
  });

  describe('out of the box: type CODE', () => {

    beforeEach(() => {
      provider.setConfig({
        baseEndpoint: 'http://example.com/',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      });
    });

    it('redirect to auth server', (done: DoneFn) => {
      windowMock.location = {
        set href(value: string) {
          expect(value).toEqual('http://example.com/authorize?response_type=code&client_id=clientId');
          done();
        },
      };

      provider.authenticate()
        .subscribe(() => {});
    });

    it('handle success redirect and sends correct token request', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(true);
          expect(result.isFailure()).toBe(false);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getMessages()).toEqual(successMessages);
          expect(result.getErrors()).toEqual([]); // no error message, response is success
          expect(result.getRawToken()).toEqual(tokenSuccessResponse);
          expect(result.getRedirect()).toEqual('/');
          done();
        });

      httpMock.expectOne(
        req => req.url === 'http://example.com/token'
            && req.body['grant_type'] === NbOAuth2GrantType.AUTHORIZATION_CODE
            && req.body['code'] === 'code'
            && req.body['client_id'] === 'clientId'
            && !req.body['redirect_uri'],
      ).flush(tokenSuccessResponse);
    });

    it('handle success redirect back with token request', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(true);
          expect(result.isFailure()).toBe(false);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getMessages()).toEqual(successMessages);
          expect(result.getErrors()).toEqual([]); // no error message, response is success
          expect(result.getRawToken()).toEqual(tokenSuccessResponse);
          expect(result.getRedirect()).toEqual('/');
          done();
        });

      httpMock.expectOne('http://example.com/token')
        .flush(tokenSuccessResponse);
    });

    it('handle error redirect back', (done: DoneFn) => {
      routeMock.queryParams = observableOf(tokenErrorResponse);

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(false);
          expect(result.isFailure()).toBe(true);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getResponse()).toEqual(tokenErrorResponse);
          expect(result.getMessages()).toEqual([]);
          expect(result.getErrors()).toEqual(errorMessages);
          expect(result.getRawToken()).toBeUndefined();
          expect(result.getRedirect()).toEqual(null);
          done();
        });
    });

    it('handle error token response', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {

          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(false);
          expect(result.isFailure()).toBe(true);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getResponse().error).toEqual(tokenErrorResponse);
          expect(result.getMessages()).toEqual([]);
          expect(result.getErrors()).toEqual(errorMessages);
          expect(result.getRawToken()).toBeUndefined();
          expect(result.getRedirect()).toEqual(null);
          done();
        });

      httpMock.expectOne('http://example.com/token')
        .flush(tokenErrorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('configured: type TOKEN', () => {

    beforeEach(() => {
      provider.setConfig({
        baseEndpoint: 'http://example.com/',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        authorize: {
          responseType: NbOAuth2ResponseType.TOKEN,
        },
      });
    });

    it('redirect to auth server', (done: DoneFn) => {
      windowMock.location = {
        set href(value: string) {
          expect(value).toEqual('http://example.com/authorize?response_type=token&client_id=clientId');
          done();
        },
      };

      provider.authenticate()
        .subscribe(() => {});
    });

    it('handle success redirect back with token', (done: DoneFn) => {
      const token = { access_token: 'token', token_type: 'bearer' };
      routeMock.params = observableOf(token);

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(true);
          expect(result.isFailure()).toBe(false);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getMessages()).toEqual(successMessages);
          expect(result.getErrors()).toEqual([]); // no error message, response is success
          expect(result.getRawToken()).toEqual(token);
          expect(result.getRedirect()).toEqual('/');
          done();
        });
    });

    it('handle error redirect back', (done: DoneFn) => {
      routeMock.params = observableOf(tokenErrorResponse);

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(false);
          expect(result.isFailure()).toBe(true);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getResponse()).toEqual(tokenErrorResponse);
          expect(result.getMessages()).toEqual([]);
          expect(result.getErrors()).toEqual(errorMessages);
          expect(result.getRawToken()).toBeUndefined();
          expect(result.getRedirect()).toEqual(null);
          done();
        });
    });
  });

  describe('configured redirect, redirectUri, scope and additional params: type TOKEN', () => {

    beforeEach(() => {
      provider.setConfig({
        baseEndpoint: 'http://example.com/',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        redirect: {
          success: '/success',
          failure: '/failure',
        },
        authorize: {
          redirectUri: 'http://localhost:4200/callback',
          scope: 'read',
          params: {
            display: 'popup',
            foo: 'bar',
          },
        },
        token: {
          redirectUri: 'http://localhost:4200/callback',
        },
      });
    });

    it('redirect to auth server', (done: DoneFn) => {
      windowMock.location = {
        set href(value: string) {
          const baseUrl = 'http://example.com/authorize?response_type=code&client_id=clientId&redirect_uri=';
          const redirect = encodeURIComponent('http://localhost:4200/callback');
          const url = `${baseUrl}${redirect}&scope=read&display=popup&foo=bar`;

          expect(value).toEqual(url);
          done();
        },
      };

      provider.authenticate()
        .subscribe(() => {});
    });

    it('handle success redirect and sends correct token request', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(true);
          expect(result.isFailure()).toBe(false);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getMessages()).toEqual(successMessages);
          expect(result.getErrors()).toEqual([]); // no error message, response is success
          expect(result.getRawToken()).toEqual(tokenSuccessResponse);
          expect(result.getRedirect()).toEqual('/success');
          done();
        });

      httpMock.expectOne(
        req => req.url === 'http://example.com/token'
          && req.body['grant_type'] === NbOAuth2GrantType.AUTHORIZATION_CODE
          && req.body['code'] === 'code'
          && req.body['client_id'] === 'clientId'
          && req.body['redirect_uri'] === 'http://localhost:4200/callback',
      ).flush(tokenSuccessResponse);
    });

    it('handle success redirect back with token request', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(true);
          expect(result.isFailure()).toBe(false);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getMessages()).toEqual(successMessages);
          expect(result.getErrors()).toEqual([]); // no error message, response is success
          expect(result.getRawToken()).toEqual(tokenSuccessResponse);
          expect(result.getRedirect()).toEqual('/success');
          done();
        });

      httpMock.expectOne('http://example.com/token')
        .flush(tokenSuccessResponse);
    });

    it('handle error redirect back', (done: DoneFn) => {
      routeMock.queryParams = observableOf(tokenErrorResponse);

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {
          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(false);
          expect(result.isFailure()).toBe(true);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getResponse()).toEqual(tokenErrorResponse);
          expect(result.getMessages()).toEqual([]);
          expect(result.getErrors()).toEqual(errorMessages);
          expect(result.getRawToken()).toBeUndefined();
          expect(result.getRedirect()).toEqual('/failure');
          done();
        });
    });

    it('handle error token response', (done: DoneFn) => {
      routeMock.queryParams = observableOf({code: 'code'});

      provider.authenticate()
        .subscribe((result: NbAuthResult) => {

          expect(result).toBeTruthy();
          expect(result.isSuccess()).toBe(false);
          expect(result.isFailure()).toBe(true);
          expect(result.getToken()).toBeUndefined(); // we don't have a token at this stage yet
          expect(result.getResponse().error).toEqual(tokenErrorResponse);
          expect(result.getMessages()).toEqual([]);
          expect(result.getErrors()).toEqual(errorMessages);
          expect(result.getRawToken()).toBeUndefined();
          expect(result.getRedirect()).toEqual('/failure');
          done();
        });

      httpMock.expectOne('http://example.com/token')
        .flush(tokenErrorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });
});